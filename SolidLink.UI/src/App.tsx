import { ConnectionStatus } from './components/ConnectionStatus'
import { useBridge, bridgeClient, MessageTypes } from './bridge'
import type {
  ConnectionStatusPayload,
  TreeFilterPayload,
  HiddenStatePayload,
  HideRequestPayload,
  UnhideRequestPayload,
  RefGeometryListPayload,
  RefGeometryNode,
  RefGeometryHidePayload,
  RefOriginTogglePayload,
  RefOriginGlobalTogglePayload,
  RobotDefinition
} from './bridge'
import { SelectionProvider, useSelection } from './context/SelectionContext'
import { Viewport } from './components/Viewport/Viewport'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DebugLog, useLogger } from './components/DebugLog'
import { RobotDefinitionPanel } from './components/RobotDefinition/RobotDefinitionPanel'
import { TestLabel } from './components/TestLabel'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

interface RobotTree {
  name: string;
  rootFrame: Frame;
}

interface Frame {
  id: string;
  name: string;
  type: string;
  referencePath: string;
  localTransform?: {
    position?: number[];
    rotation?: number[];
    matrix?: number[];
  };
  children: Frame[];
  links: unknown[];
}

type RobotHistory = {
  past: RobotDefinition[];
  present: RobotDefinition;
  future: RobotDefinition[];
};

type WebViewWindow = Window & {
  chrome?: {
    webview?: unknown;
  };
};

const ROBOT_HISTORY_LIMIT = 40;

const createDefaultRobotDefinition = (): RobotDefinition => ({
  nodes: [
    {
      id: 'base',
      name: 'Base',
      type: 'body',
      children: ['link-1', 'sensor-1'],
      geometryIds: ['base_plate']
    },
    {
      id: 'link-1',
      name: 'Link 1',
      type: 'body',
      children: ['link-2'],
      geometryIds: ['arm_1']
    },
    {
      id: 'link-2',
      name: 'Link 2',
      type: 'body',
      children: ['frame-tool'],
      geometryIds: ['arm_2']
    },
    {
      id: 'sensor-1',
      name: 'Camera',
      type: 'sensor',
      children: [],
      geometryIds: ['cam_mount']
    },
    {
      id: 'frame-tool',
      name: 'Tool Frame',
      type: 'frame',
      children: [],
      geometryIds: []
    }
  ],
  joints: [
    { id: 'joint-1', parentId: 'base', childId: 'link-1', type: 'revolute' },
    { id: 'joint-2', parentId: 'link-1', childId: 'link-2', type: 'revolute' },
    { id: 'joint-3', parentId: 'link-2', childId: 'frame-tool', type: 'fixed' },
    { id: 'joint-4', parentId: 'base', childId: 'sensor-1', type: 'fixed' }
  ]
});

const normalizeQuery = (query: string) => query.trim().toLowerCase();
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const condensePath = (path: string, maxLength = 42) => {
  if (!path) return '';
  if (path.length <= maxLength) return path;
  const parts = path.split('/');
  if (parts.length <= 2) {
    return `${path.slice(0, maxLength - 3)}...`;
  }
  const head = parts[0];
  const tail = parts.slice(-2).join('/');
  const condensed = `${head}/.../${tail}`;
  if (condensed.length <= maxLength) return condensed;
  return `${path.slice(0, maxLength - 3)}...`;
};

const matchesFilter = (frame: Frame, query: string) => {
  if (!query) return false;
  const name = frame.name?.toLowerCase() ?? '';
  const path = frame.referencePath?.toLowerCase() ?? '';
  return name.includes(query) || path.includes(query);
};

const buildTreeVisibility = (root: Frame | null, query: string, hiddenIds: Set<string>, showHidden: boolean) => {
  const visible = new Set<string>();
  const matched = new Set<string>();

  if (!root) return { treeVisibleIds: visible, matchedIds: matched };
  const allowHidden = showHidden;
  const isHidden = (frame: Frame) => hiddenIds.has(frame.id);
  if (!query) {
    const collect = (frame: Frame) => {
      if (isHidden(frame) && !allowHidden) {
        return;
      }
      visible.add(frame.id);
      frame.children.forEach(collect);
    };
    collect(root);
    return { treeVisibleIds: visible, matchedIds: matched };
  }

  const walk = (frame: Frame) => {
    if (isHidden(frame) && !allowHidden) {
      return false;
    }
    let descendantMatch = false;
    frame.children.forEach(child => {
      if (walk(child)) descendantMatch = true;
    });
    const selfMatch = matchesFilter(frame, query);
    if (selfMatch) matched.add(frame.id);
    if (selfMatch || descendantMatch) visible.add(frame.id);
    return selfMatch || descendantMatch;
  };

  walk(root);
  return { treeVisibleIds: visible, matchedIds: matched };
};

const buildGeometryVisibleIds = (root: Frame | null, query: string) => {
  if (!root || !query) return null;
  const visible = new Set<string>();
  const walk = (frame: Frame) => {
    if (matchesFilter(frame, query)) visible.add(frame.id);
    frame.children.forEach(walk);
  };
  walk(root);
  return visible;
};

const expandIdsWithDescendants = (frameById: Map<string, Frame>, ids: string[]) => {
  const expanded = new Set<string>();
  const stack = [...ids];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || expanded.has(id)) continue;
    expanded.add(id);
    const frame = frameById.get(id);
    if (!frame?.children?.length) continue;
    frame.children.forEach(child => stack.push(child.id));
  }
  return expanded;
};

const TreeItem = ({
  frame,
  level = 0,
  filterQuery,
  visibleIds,
  matchedIds,
  orderedIds,
  hiddenIds,
  showHidden,
  onUnhide,
  onContextMenu
}: {
  frame: Frame;
  level?: number;
  filterQuery?: string;
  visibleIds?: Set<string>;
  matchedIds?: Set<string>;
  orderedIds: string[];
  hiddenIds: Set<string>;
  showHidden: boolean;
  onUnhide: (ids: string[]) => void;
  onContextMenu: (point: { x: number; y: number }, frameId: string) => void;
}) => {
  const [isOpenState, setIsOpenState] = useState(true);
  const {
    selectedIds,
    hoveredId,
    setHover,
    selectSingle,
    toggleSelection,
    rangeSelect
  } = useSelection();
  const hasChildren = frame.children && frame.children.length > 0;

  const isSelected = selectedIds.includes(frame.id);
  const isHovered = hoveredId === frame.id;
  const isMatch = !!filterQuery && matchedIds?.has(frame.id);
  const isVisible = visibleIds ? visibleIds.has(frame.id) : true;
  const isHidden = hiddenIds.has(frame.id);

  const isOpen = filterQuery ? true : isOpenState;

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey) {
      rangeSelect(frame.id, orderedIds);
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      toggleSelection(frame.id);
      return;
    }
    selectSingle(frame.id);
  };

  if (!isVisible) return null;

  return (
    <div style={{ marginLeft: `${level * 12}px` }}>
      <div
        data-frame-id={frame.id}
        data-selected={isSelected ? 'true' : 'false'}
        data-hovered={isHovered ? 'true' : 'false'}
        data-hidden={isHidden ? 'true' : 'false'}
        onClick={(e) => {
          if (hasChildren) setIsOpenState(prev => !prev);
          if (isHidden && showHidden) {
            onUnhide([frame.id]);
          }
          handleSelect(e);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu({ x: e.clientX, y: e.clientY }, frame.id);
        }}
        onMouseEnter={() => setHover(frame.id)}
        onMouseLeave={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            onContextMenu({ x: rect.left + rect.width / 2, y: rect.bottom }, frame.id);
          }
        }}
        tabIndex={0}
        style={{
          padding: '4px 8px',
          cursor: hasChildren ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.875rem',
          borderRadius: '4px',
          backgroundColor: isSelected
            ? 'rgba(74, 158, 255, 0.15)'
            : (isHovered ? 'rgba(255,255,255,0.05)' : 'transparent'),
          borderLeft: isSelected ? '2px solid var(--color-primary)' : '2px solid transparent',
          transition: 'all 0.2s',
          opacity: isHidden ? 0.55 : 1
        }}
      >
        <span style={{ fontSize: '10px', width: '12px' }}>
          {hasChildren ? (isOpen ? '▼' : '▶') : '•'}
        </span>
        <span style={{
          color: isSelected ? 'var(--color-primary)' : (frame.links.length > 0 ? '#4fc3f7' : 'inherit'),
          fontWeight: isMatch ? '600' : 'normal',
          textDecoration: isMatch ? 'underline' : 'none'
        }}>
          {frame.name}
        </span>
        {isHidden && showHidden && (
          <span style={{ fontSize: '0.65rem', color: '#999', marginLeft: '6px' }}>
            hidden
          </span>
        )}
      </div>
      {isOpen && hasChildren && (
        <div>
          {frame.children.map(child => (
            <TreeItem
              key={child.id}
              frame={child}
              level={level + 1}
              filterQuery={filterQuery}
              visibleIds={visibleIds}
              matchedIds={matchedIds}
              orderedIds={orderedIds}
              hiddenIds={hiddenIds}
              showHidden={showHidden}
              onUnhide={onUnhide}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const RefTreeItem = ({
  node,
  isSelected,
  isHidden,
  showHidden,
  onSelect,
  onUnhide,
  onContextMenu
}: {
  node: RefGeometryNode;
  isSelected: boolean;
  isHidden: boolean;
  showHidden: boolean;
  showOrigin: boolean;
  onSelect: (id: string) => void;
  onUnhide: (ids: string[]) => void;
  onContextMenu: (point: { x: number; y: number }, id: string) => void;
}) => {
  if (isHidden && !showHidden) return null;

  const label = condensePath(node.path);
  // Just rely on tree structure, maybe remove noisy type label too? keeping for now.
  const typeLabel = node.type === 'axis' ? 'AX' : 'CS';
  
  const handleClick = () => {
    if (isHidden && showHidden) {
      onUnhide([node.id]);
      return;
    }
    onSelect(node.id);
  };

  return (
    <div>
      <div
        data-ref-id={node.id}
        data-selected={isSelected ? 'true' : 'false'}
        data-hidden={isHidden ? 'true' : 'false'}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu({ x: e.clientX, y: e.clientY }, node.id);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            onContextMenu({ x: rect.left + rect.width / 2, y: rect.bottom }, node.id);
          }
        }}
        tabIndex={0}
        style={{
          padding: '4px 8px',
          cursor: 'default',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.82rem',
          borderRadius: '4px',
          backgroundColor: isSelected
            ? 'rgba(74, 158, 255, 0.15)'
            : 'transparent',
          borderLeft: isSelected ? '2px solid var(--color-primary)' : '2px solid transparent',
          transition: 'all 0.2s',
          opacity: isHidden ? 0.55 : 1
        }}
      >
        <span style={{
          fontSize: '0.6rem',
          padding: '2px 4px',
          borderRadius: '3px',
          background: 'rgba(255,255,255,0.08)',
          color: 'var(--color-text-secondary)'
        }}>
          {typeLabel}
        </span>
        <span title={node.path} style={{ flex: 1 }}>
          {label}
        </span>
        {/* Only show 'origin' tag if it's NOT the result of 'Show All' logic (which sets everything to showOrigin) 
            Actually, just removing the text tag per request. Visibility is implicit or controlled via context.
        */}
        {isHidden && showHidden && (
          <span style={{ fontSize: '0.65rem', color: '#999' }}>
            hidden
          </span>
        )}
      </div>
    </div>
  );
};

const MIN_SIDEBAR_WIDTH = 220;
const MIN_TREE_PANEL_HEIGHT = 160;
const MIN_REF_PANEL_HEIGHT = 160;
const MIN_VIEWPORT_HEIGHT = 100;
const MIN_ROBOT_DEF_HEIGHT = 100;

function App() {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')
  const [tree, setTree] = useState<RobotTree | null>(null)
  const [robotHistory, setRobotHistory] = useState<RobotHistory>(() => ({
    past: [],
    present: createDefaultRobotDefinition(),
    future: []
  }))
  const [refGeometry, setRefGeometry] = useState<RefGeometryNode[]>([])
  const [refSelectedId, setRefSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [refContextMenu, setRefContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [refOriginVisibility, setRefOriginVisibility] = useState<Record<string, boolean>>({});
  const [hideOriginsGlobal, setHideOriginsGlobal] = useState(true);
  const [frameOriginVisibility, setFrameOriginVisibility] = useState<Record<string, boolean>>({}); // For CAD tree origins
  const [mockIndex, setMockIndex] = useState(0);
  const { logs, log } = useLogger();
  const isDev = import.meta.env.DEV;
  const isWebView = Boolean((window as WebViewWindow).chrome?.webview);
  const { selectedIds, setSelection, clearSelection } = useSelection();
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [treeSplitRatio, setTreeSplitRatio] = useState(0.6);
  const [robotSplitRatio, setRobotSplitRatio] = useState(0.68);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const sidebarResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const treeResizeRef = useRef<{ startY: number; startRatio: number } | null>(null);
  const robotResizeRef = useRef<{ startY: number; startRatio: number } | null>(null);


  const [refPickMode, setRefPickMode] = useState<string | null>(null);
  const [activeRobotNodeId, setActiveRobotNodeId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState({
    wv2Present: false,
    lastMessage: 'None',
    renderTime: new Date().toLocaleTimeString()
  })

  const handleRefPickStart = useCallback((id: string) => {
    // Reusing this state for 'Add to Node' logic or similar picking
    // But now we have activeRobotNodeId for context menu logic
    setRefPickMode(id); // If this was for Ref Frame assignment
    setRefContextMenu(null);
  }, []);

  const handleRefPickCancel = useCallback(() => {
    setRefPickMode(null);
  }, []);

  const handleFrameOriginToggle = useCallback((frameId: string) => {
    setFrameOriginVisibility(prev => ({ ...prev, [frameId]: !prev[frameId] }));
    // Also update main origin visibility map for the viewport to see it
    setRefOriginVisibility(prev => {
      const next = { ...prev, [frameId]: !prev[frameId] };
      // Tell backend/viewport
      const payload: RefOriginTogglePayload = { id: frameId, showOrigin: next[frameId] };
      bridgeClient.send(MessageTypes.REF_ORIGIN_TOGGLE, payload);
      return next;
    });
  }, []);

  useEffect(() => {
    const check = setInterval(() => {
      const present = Boolean((window as WebViewWindow).chrome?.webview)
      setDebugInfo(prev => ({
        ...prev,
        wv2Present: present,
        renderTime: new Date().toLocaleTimeString()
      }))
      if (present) {
        bridgeClient.init() // Ensure init runs if it missed it earlier
      }
    }, 1000)
    return () => clearInterval(check)
  }, [])

  // Subscribe to CONNECTION_STATUS messages from C# backend
  useBridge<ConnectionStatusPayload>(MessageTypes.CONNECTION_STATUS, (message) => {
    setDebugInfo(prev => ({ ...prev, lastMessage: `STATUS: ${message.payload?.status} ` }))
    if (message.payload?.status === 'connected') {
      setConnectionStatus('connected')
    }
  })

  // Also listen for PONG as a connection verification
  useBridge(MessageTypes.PONG, () => {
    setDebugInfo(prev => ({ ...prev, lastMessage: 'PONG' }))
    setConnectionStatus('connected')
  })

  // Global error capture
  useEffect(() => {
    const handleError = (e: ErrorEvent) => log(`Runtime Error: ${e.message} `, 'error');
    window.addEventListener('error', handleError);
    log('App initialized', 'debug');
    return () => window.removeEventListener('error', handleError);
  }, []);

  // also listen for TREE_RESPONSE
  useBridge<RobotTree>('TREE_RESPONSE', (message) => {
    log(`Received TREE_RESPONSE for model: ${message.payload?.name}`, 'info');
    if (message.payload) {
      setTree(message.payload);
    }
  })

  useBridge<RobotDefinition>(MessageTypes.ROBOT_DEF_LOAD, (message) => {
    if (!message.payload || message.payload.nodes.length === 0) {
        // Reset to default if empty
        replaceRobotDefinition(createDefaultRobotDefinition());
        log('Loaded empty robot definition, reset to default', 'warn');
        return;
    }
    replaceRobotDefinition(message.payload);
    log('Loaded robot definition from add-in', 'info');
  })

  useBridge<RefGeometryListPayload>(MessageTypes.REF_GEOMETRY_LIST, (message) => {
    const nodes = message.payload ?? [];
    setRefGeometry(nodes);
    log(`Received REF_GEOMETRY_LIST (${nodes.length})`, 'info');
  })

  useBridge<HiddenStatePayload>(MessageTypes.HIDDEN_STATE_RESTORE, (message) => {
    const nextIds = message.payload?.hiddenIds ?? [];
    setHiddenIds(nextIds);
    log(`Restored hidden state (${nextIds.length})`, 'info');
  })

  useBridge<string>('ERROR_RESPONSE', (message) => {
    log(`Backend Error: ${message.payload}`, 'error');
  })

  useEffect(() => {
    if (refGeometry.length === 0) {
      setRefOriginVisibility({});
      setRefSelectedId(null);
      return;
    }

    const ids = new Set(refGeometry.map(node => node.id));
    if (refSelectedId && !ids.has(refSelectedId)) {
      setRefSelectedId(null);
    }

    setRefOriginVisibility(prev => {
      const next: Record<string, boolean> = { ...prev };
      let changed = false;

      ids.forEach(id => {
        if (!(id in next)) {
          next[id] = !hideOriginsGlobal;
          changed = true;
        }
      });

      Object.keys(next).forEach(id => {
        if (!ids.has(id)) {
          delete next[id];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [refGeometry, hideOriginsGlobal, refSelectedId]);

  const refreshTree = () => {
    log('Sending REQUEST_TREE...', 'info');
    bridgeClient.send('REQUEST_TREE');
  };

  const loadMockTree = async () => {
    if (!isDev) return;
    try {
      // @ts-ignore - Dynamic import might fail type check if file doesn't match expected structure exactly
      const { mockTree } = await import('./fixtures/mockTree');
      // Wrap it to match expected structure if needed, or just set it
      setTree(mockTree as unknown as RobotTree); 
      setConnectionStatus('disconnected');
      log(`Loaded mock tree: ${mockTree.name}`, 'info');
    } catch (e) {
      console.error("Failed to load mock tree", e);
    }
  };

  const handleSidebarResizeStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    sidebarResizeRef.current = { startX: e.clientX, startWidth: sidebarWidth };
    const handleMove = (event: PointerEvent) => {
      if (!sidebarResizeRef.current) return;
      const delta = event.clientX - sidebarResizeRef.current.startX;
      const nextWidth = clamp(sidebarResizeRef.current.startWidth + delta, MIN_SIDEBAR_WIDTH, 800); // Increased max width
      setSidebarWidth(nextWidth);
    };
    const handleUp = () => {
      sidebarResizeRef.current = null;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [sidebarWidth]);

  const handleTreeResizeStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!sidebarRef.current) return;
    treeResizeRef.current = { startY: e.clientY, startRatio: treeSplitRatio };
    const handleMove = (event: PointerEvent) => {
      if (!treeResizeRef.current || !sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();
      const delta = event.clientY - treeResizeRef.current.startY;
      
      // Calculate ratio based on constraints
      const totalHeight = rect.height;
      const minRatio = MIN_TREE_PANEL_HEIGHT / totalHeight;
      const maxRatio = 1 - (MIN_REF_PANEL_HEIGHT / totalHeight);
      
      const rawRatio = (treeResizeRef.current.startRatio * rect.height + delta) / rect.height;
      const nextRatio = clamp(rawRatio, minRatio, maxRatio);
      
      setTreeSplitRatio(nextRatio);
    };
    const handleUp = () => {
      treeResizeRef.current = null;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [treeSplitRatio]);

  const handleRobotResizeStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!rightPaneRef.current) return;
    robotResizeRef.current = { startY: e.clientY, startRatio: robotSplitRatio };
    const handleMove = (event: PointerEvent) => {
      if (!robotResizeRef.current || !rightPaneRef.current) return;
      const rect = rightPaneRef.current.getBoundingClientRect();
      const delta = event.clientY - robotResizeRef.current.startY;
      
      // Calculate ratio based on constraints
      const totalHeight = rect.height;
      const minRatio = MIN_VIEWPORT_HEIGHT / totalHeight;
      const maxRatio = 1 - (MIN_ROBOT_DEF_HEIGHT / totalHeight);
      
      const rawRatio = (robotResizeRef.current.startRatio * rect.height + delta) / rect.height;
      const nextRatio = clamp(rawRatio, minRatio, maxRatio);
      
      setRobotSplitRatio(nextRatio);
    };
    const handleUp = () => {
      robotResizeRef.current = null;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [robotSplitRatio]);

  const handleSidebarResizeKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSidebarWidth(prev => clamp(prev - 12, MIN_SIDEBAR_WIDTH, 800));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSidebarWidth(prev => clamp(prev + 12, MIN_SIDEBAR_WIDTH, 800));
    }
  }, []);

  const handleTreeResizeKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setTreeSplitRatio(prev => clamp(prev - 0.03, 0.2, 0.8));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setTreeSplitRatio(prev => clamp(prev + 0.03, 0.2, 0.8));
    }
  }, [log]);

  const handleRobotResizeKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setRobotSplitRatio(prev => clamp(prev - 0.03, 0.35, 0.85));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setRobotSplitRatio(prev => clamp(prev + 0.03, 0.35, 0.85));
    }
  }, []);

  // Send UI_READY and PING on mount to initiate handshake
  useEffect(() => {
    console.log('[App] Component mounted, signaling UI_READY');
    bridgeClient.send('UI_READY');
    bridgeClient.send(MessageTypes.PING);
    bridgeClient.send(MessageTypes.ROBOT_DEF_LOAD);

    // Backup: retry after 2 seconds if still connecting
    const timer = setTimeout(() => {
      bridgeClient.send('UI_READY');
    }, 2000);

    return () => clearTimeout(timer);
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedFilter(filter), 150);
    return () => clearTimeout(handle);
  }, [filter]);

  const robotDefinition = robotHistory.present;
  const canUndoRobot = robotHistory.past.length > 0;
  const canRedoRobot = robotHistory.future.length > 0;

  const robotSelection = useMemo(() => {
    if (selectedIds.length === 0) return null;
    const selectedNodes = robotDefinition.nodes.filter(node => 
      node.geometryIds.some(id => selectedIds.includes(id))
    );
    const nodeIds = selectedNodes.map(node => node.id);
    return nodeIds.length > 0 ? { nodeIds, jointIds: [] } : null;
  }, [selectedIds, robotDefinition]);

  const commitRobotDefinition = useCallback((next: RobotDefinition) => {
    setRobotHistory(prev => {
      const past = [...prev.past, prev.present].slice(-ROBOT_HISTORY_LIMIT);
      return { past, present: next, future: [] };
    });
    bridgeClient.send(MessageTypes.ROBOT_DEF_UPDATE, next);
  }, []);

  const handleRefPickAssign = useCallback((nodeId: string) => {
    if (!refPickMode) return;
    
    const nextNodes = robotDefinition.nodes.map(node => {
        if (node.id === nodeId) {
            return { ...node, frameId: refPickMode };
        }
        return node;
    });
    
    commitRobotDefinition({ ...robotDefinition, nodes: nextNodes });
    setRefPickMode(null);
  }, [refPickMode, robotDefinition, commitRobotDefinition]);

  const replaceRobotDefinition = useCallback((next: RobotDefinition) => {
    setRobotHistory({ past: [], present: next, future: [] });
  }, []);

  const undoRobotDefinition = useCallback(() => {
    setRobotHistory(prev => {
      if (prev.past.length === 0) return prev;
      const past = [...prev.past];
      const previous = past.pop() as RobotDefinition;
      const future = [prev.present, ...prev.future];
      bridgeClient.send(MessageTypes.ROBOT_DEF_UPDATE, previous);
      return { past, present: previous, future };
    });
  }, []);

  const redoRobotDefinition = useCallback(() => {
    setRobotHistory(prev => {
      if (prev.future.length === 0) return prev;
      const [next, ...future] = prev.future;
      const past = [...prev.past, prev.present].slice(-ROBOT_HISTORY_LIMIT);
      bridgeClient.send(MessageTypes.ROBOT_DEF_UPDATE, next);
      return { past, present: next, future };
    });
  }, []);

  const frameById = useMemo(() => {
    const map = new Map<string, Frame>();
    if (!tree?.rootFrame) return map;
    const walk = (frame: Frame) => {
      map.set(frame.id, frame);
      frame.children?.forEach(walk);
    };
    walk(tree.rootFrame);
    return map;
  }, [tree]);

  const orderedIds = useMemo(() => {
    if (!tree?.rootFrame) return [];
    const ids: string[] = [];
    const walk = (frame: Frame) => {
      ids.push(frame.id);
      frame.children?.forEach(walk);
    };
    walk(tree.rootFrame);
    return ids;
  }, [tree]);

  const hiddenIdSet = useMemo(() => {
    return expandIdsWithDescendants(frameById, hiddenIds);
  }, [frameById, hiddenIds]);

  useEffect(() => {
    if (selectedIds.length === 0) return;
    const visibleSelected = selectedIds.filter(id => !hiddenIdSet.has(id));
    if (visibleSelected.length === selectedIds.length) return;
    if (visibleSelected.length === 0) {
      clearSelection();
      return;
    }
    setSelection(visibleSelected, visibleSelected[0]);
  }, [hiddenIdSet, selectedIds, clearSelection, setSelection]);

  const { treeVisibleIds, matchedIds } = useMemo(() => {
    return buildTreeVisibility(tree?.rootFrame ?? null, normalizeQuery(filter), hiddenIdSet, showHidden);
  }, [tree, filter, hiddenIdSet, showHidden]);

  const geometryVisibleIds = useMemo(() => {
    if (!tree?.rootFrame) return null;
    const filterVisible = buildGeometryVisibleIds(tree.rootFrame, normalizeQuery(debouncedFilter));
    if (hiddenIdSet.size === 0) return filterVisible;
    if (!filterVisible) {
      const visible = new Set<string>();
      orderedIds.forEach(id => {
        if (!hiddenIdSet.has(id)) visible.add(id);
      });
      return visible;
    }
    const visible = new Set<string>();
    filterVisible.forEach(id => {
      if (!hiddenIdSet.has(id)) visible.add(id);
    });
    return visible;
  }, [tree, debouncedFilter, hiddenIdSet, orderedIds]);

  const visibleRefNodes = useMemo(() => {
    // Standard Ref Geometry from backend
    const standard = showHidden 
      ? refGeometry 
      : refGeometry.filter(node => !hiddenIdSet.has(node.id));
    
    // Synthetic Ref Nodes from active Frame Origins
    // We only add them if they are toggled ON in frameOriginVisibility
    // AND they aren't already in standard list
    const existingIds = new Set(standard.map(n => n.id));
    const synthetic: RefGeometryNode[] = [];
    
    // Iterate all frames in frameOriginVisibility
    Object.entries(frameOriginVisibility).forEach(([id, visible]) => {
      if (!visible) return;
      if (existingIds.has(id)) return;
      
      const frame = frameById.get(id);
      if (frame) {
        synthetic.push({
          id: frame.id,
          name: frame.name, // Added missing property
          path: `Origin of ${frame.name}`,
          type: 'axis',
          parentPath: frame.referencePath // Added missing property, using ref path as approximation
        });
      }
    });

    return [...standard, ...synthetic];
  }, [refGeometry, showHidden, hiddenIdSet, frameOriginVisibility, frameById]);

  const orderedRefNodes = useMemo(() => {
    return [...visibleRefNodes].sort((a, b) => a.path.localeCompare(b.path));
  }, [visibleRefNodes]);

  const filterActive = filter.trim().length > 0;
  const hasFilterMatches = !filterActive || matchedIds.size > 0;

  useEffect(() => {
    if (!tree) return;
    const query = debouncedFilter.trim();
    const payload: TreeFilterPayload = {
      query,
      visibleIds: geometryVisibleIds ? Array.from(geometryVisibleIds) : []
    };
    bridgeClient.send(MessageTypes.TREE_FILTER, payload);
  }, [tree, debouncedFilter, geometryVisibleIds]);

  const persistHiddenState = useCallback((nextIds: string[]) => {
    setHiddenIds(nextIds);
    const payload: HiddenStatePayload = { hiddenIds: nextIds };
    bridgeClient.send(MessageTypes.HIDDEN_STATE_UPDATE, payload);
  }, []);

  const handleHide = useCallback((ids: string[]) => {
    if (!ids.length) return;
    const expanded = expandIdsWithDescendants(frameById, ids);
    const nextHiddenSet = new Set(hiddenIdSet);
    expanded.forEach(id => nextHiddenSet.add(id));
    const nextHiddenIds = Array.from(nextHiddenSet);
    const payload: HideRequestPayload = {
      ids: Array.from(expanded),
      includeDescendants: true
    };
    bridgeClient.send(MessageTypes.HIDE_REQUEST, payload);
    persistHiddenState(nextHiddenIds);
    const remaining = selectedIds.filter(id => !nextHiddenSet.has(id));
    if (remaining.length === 0) {
      clearSelection();
    } else {
      setSelection(remaining, remaining[0]);
    }
  }, [frameById, hiddenIdSet, selectedIds, clearSelection, setSelection, persistHiddenState]);

  const handleUnhide = useCallback((ids: string[]) => {
    if (!ids.length) return;
    const expanded = expandIdsWithDescendants(frameById, ids);
    const nextHiddenSet = new Set(hiddenIdSet);
    expanded.forEach(id => nextHiddenSet.delete(id));
    const nextHiddenIds = Array.from(nextHiddenSet);
    const payload: UnhideRequestPayload = {
      ids: Array.from(expanded),
      includeDescendants: true
    };
    bridgeClient.send(MessageTypes.UNHIDE_REQUEST, payload);
    persistHiddenState(nextHiddenIds);
  }, [frameById, hiddenIdSet, persistHiddenState]);

  const handleUnhideAll = useCallback(() => {
    if (hiddenIdSet.size === 0) return;
    const payload: UnhideRequestPayload = {
      ids: Array.from(hiddenIdSet),
      includeDescendants: true
    };
    bridgeClient.send(MessageTypes.UNHIDE_REQUEST, payload);
    persistHiddenState([]);
  }, [hiddenIdSet, persistHiddenState]);

  const handleRefHide = useCallback((ids: string[]) => {
    if (!ids.length) return;
    const nextHiddenSet = new Set(hiddenIdSet);
    ids.forEach(id => nextHiddenSet.add(id));
    const payload: RefGeometryHidePayload = { ids, hidden: true };
    bridgeClient.send(MessageTypes.REF_GEOMETRY_HIDE, payload);
    persistHiddenState(Array.from(nextHiddenSet));
  }, [hiddenIdSet, persistHiddenState]);

  const handleRefUnhide = useCallback((ids: string[]) => {
    if (!ids.length) return;
    const nextHiddenSet = new Set(hiddenIdSet);
    ids.forEach(id => nextHiddenSet.delete(id));
    const payload: RefGeometryHidePayload = { ids, hidden: false };
    bridgeClient.send(MessageTypes.REF_GEOMETRY_HIDE, payload);
    persistHiddenState(Array.from(nextHiddenSet));
  }, [hiddenIdSet, persistHiddenState]);

  const handleRefOriginToggle = useCallback((id: string) => {
    setRefOriginVisibility(prev => {
      const next = { ...prev, [id]: !prev[id] };
      const payload: RefOriginTogglePayload = { id, showOrigin: next[id] };
      bridgeClient.send(MessageTypes.REF_ORIGIN_TOGGLE, payload);
      return next;
    });
  }, []);

  const handleGlobalOriginToggle = useCallback(() => {
    setHideOriginsGlobal(prev => {
      const next = !prev;
      setRefOriginVisibility(current => {
        const updated: Record<string, boolean> = { ...current };
        refGeometry.forEach(node => {
          updated[node.id] = !next;
        });
        return updated;
      });
      const payload: RefOriginGlobalTogglePayload = { enabled: !next };
      bridgeClient.send(MessageTypes.REF_ORIGIN_GLOBAL_TOGGLE, payload);
      return next;
    });
  }, [refGeometry]);

  const handleAddToActiveNode = useCallback((geometryId: string) => {
    if (!activeRobotNodeId) return;
    const nextNodes = robotDefinition.nodes.map(node => {
      if (node.id === activeRobotNodeId) {
        // Prevent duplicates
        if (node.geometryIds.includes(geometryId)) return node;
        return { ...node, geometryIds: [...node.geometryIds, geometryId] };
      }
      return node;
    });
    commitRobotDefinition({ ...robotDefinition, nodes: nextNodes });
  }, [activeRobotNodeId, robotDefinition, commitRobotDefinition]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.key.toLowerCase() !== 'h') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      e.preventDefault();
      handleHide(selectedIds);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHide, selectedIds]);

  useEffect(() => {
    if (!contextMenu && !refContextMenu && !showHelpMenu) return;
    const close = () => {
      setContextMenu(null);
      setRefContextMenu(null);
      setShowHelpMenu(false);
    };
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
    };
  }, [contextMenu, refContextMenu, showHelpMenu]);

  const openContextMenuAt = useCallback((point: { x: number; y: number }, frameId?: string) => {
    if (frameId) {
      if (!selectedIds.includes(frameId)) {
        setSelection([frameId], frameId);
      }
      setContextMenu({ x: point.x, y: point.y });
      return;
    }
    if (selectedIds.length === 0) return;
    setContextMenu({ x: point.x, y: point.y });
  }, [selectedIds, setSelection]);

  const openRefContextMenuAt = useCallback((point: { x: number; y: number }, id: string) => {
    setRefSelectedId(id);
    setRefContextMenu({ x: point.x, y: point.y, id });
  }, []);

  const handleRobotSelectionChange = useCallback((nodeIds: string[], _jointIds: string[]) => {
    if (nodeIds.length === 0) {
      // Optional: Clear selection if we want strict sync
      // clearSelection();
      return;
    }
    const geometryIds = new Set<string>();
    nodeIds.forEach(nodeId => {
      const node = robotDefinition.nodes.find(n => n.id === nodeId);
      if (node) {
        node.geometryIds.forEach(gid => geometryIds.add(gid));
      }
    });
    if (geometryIds.size > 0) {
      setSelection(Array.from(geometryIds));
    }
  }, [robotDefinition, setSelection]);

  const selectionHasHidden = selectedIds.some(id => hiddenIdSet.has(id));
  const selectionHasVisible = selectedIds.some(id => !hiddenIdSet.has(id));
  const refMenuOriginVisible = refContextMenu ? !!refOriginVisibility[refContextMenu.id] : false;
  const refMenuHidden = refContextMenu ? hiddenIdSet.has(refContextMenu.id) : false;

  return (
    <div id="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: '600px', minHeight: '500px' }}>
      <TestLabel />
      {/* Header */}
      <header style={{
        padding: '1rem',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'var(--color-bg-secondary)'
      }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          SolidLink
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowHelpMenu(!showHelpMenu)}>
              Help
            </button>
            {showHelpMenu && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                minWidth: '140px',
                zIndex: 30
              }}>
                <button
                  onClick={() => {
                    setShowShortcuts(true);
                    setShowHelpMenu(false);
                  }}
                  style={{ textAlign: 'left' }}
                >
                  Shortcuts
                </button>
              </div>
            )}
          </div>
          <button onClick={() => console.log('Settings clicked')}>
            Settings
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '1rem', overflow: 'hidden', display: 'flex', alignItems: 'stretch' }}>
        {/* Sidebar / Trees */}
        <div
          ref={sidebarRef}
          style={{
            width: `${sidebarWidth}px`,
            minWidth: `${MIN_SIDEBAR_WIDTH}px`,
            maxWidth: '800px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <section
              style={{
                flexBasis: `${treeSplitRatio * 100}%`,
                flexGrow: 0,
                flexShrink: 0,
                minHeight: `${MIN_TREE_PANEL_HEIGHT}px`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                    CAD Tree
                  </h2>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      disabled={connectionStatus !== 'connected'}
                      onClick={refreshTree}
                      style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                    >
                      Refresh
                    </button>
                    {isDev && !isWebView && (
                      <>
                        <select
                          value={mockIndex}
                          onChange={(e) => setMockIndex(Number(e.target.value))}
                          style={{ padding: '4px 6px', fontSize: '0.75rem' }}
                        >
                          <option value={0}>Mock Robot</option>
                          <option value={1}>Mock Conveyor Line</option>
                          <option value={2}>Mock Cell Layout</option>
                        </select>
                        <button
                          onClick={loadMockTree}
                          style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                        >
                          Load Mock
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Filter names..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '0.875rem' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={showHidden}
                      onChange={(e) => setShowHidden(e.target.checked)}
                    />
                    Show Hidden
                  </label>
                  <button
                    onClick={handleUnhideAll}
                    disabled={hiddenIdSet.size === 0}
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    Unhide All
                  </button>
                  {hiddenIdSet.size > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                      {hiddenIdSet.size} hidden
                    </span>
                  )}
                </div>
              </div>

              <div className="panel" data-testid="tree-root" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0.5rem' }}>
                {tree ? (
                  hasFilterMatches ? (
                    <TreeItem
                      frame={tree.rootFrame}
                      filterQuery={filter.trim()}
                      visibleIds={treeVisibleIds}
                      matchedIds={matchedIds}
                      orderedIds={orderedIds}
                      hiddenIds={hiddenIdSet}
                      showHidden={showHidden}
                      onUnhide={handleUnhide}
                      onContextMenu={openContextMenuAt}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                      <h3 style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>No matches</h3>
                      <p style={{ color: 'var(--color-text-secondary)' }}>Try a different filter.</p>
                    </div>
                  )
                ) : (
                  <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>No Model</h3>
                  </div>
                )}
              </div>
            </section>

            <div
              role="separator"
              aria-orientation="horizontal"
              data-testid="resize-tree"
              tabIndex={0}
              onPointerDown={handleTreeResizeStart}
              onKeyDown={handleTreeResizeKeyDown}
              style={{ height: '6px', cursor: 'row-resize', background: 'var(--color-border)', margin: '4px 0' }}
            />

            <section style={{ flex: 1, minHeight: `${MIN_REF_PANEL_HEIGHT}px`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                  Ref Geometry Tree
                </h2>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                  <input
                    type="checkbox"
                    checked={hideOriginsGlobal}
                    onChange={handleGlobalOriginToggle}
                  />
                  Hide Origins
                </label>
              </div>
              <div className="panel" data-testid="ref-geometry-root" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0.5rem' }}>
                {orderedRefNodes.length > 0 ? (
                  orderedRefNodes.map(node => (
                    <RefTreeItem
                      key={node.id}
                      node={node}
                      isSelected={refSelectedId === node.id}
                      isHidden={hiddenIdSet.has(node.id)}
                      showHidden={showHidden}
                      showOrigin={!!refOriginVisibility[node.id]}
                      onSelect={setRefSelectedId}
                      onUnhide={handleRefUnhide}
                      onContextMenu={openRefContextMenuAt}
                    />
                  ))
                ) : (
                  <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>No Ref Geometry</h3>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          data-testid="resize-sidebar"
          tabIndex={0}
          onPointerDown={handleSidebarResizeStart}
          onKeyDown={handleSidebarResizeKeyDown}
          style={{ width: '6px', cursor: 'col-resize', background: 'var(--color-border)', margin: '0 6px' }}
        />

        <div ref={rightPaneRef} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* 3D Viewport */}
          <div
            className="panel"
            data-testid="viewport-panel"
            onContextMenu={(e) => {
              e.preventDefault();
              openContextMenuAt({ x: e.clientX, y: e.clientY });
            }}
            style={{
              flexBasis: `${robotSplitRatio * 100}%`,
              flexGrow: 0,
              flexShrink: 1,
              minHeight: `${MIN_VIEWPORT_HEIGHT}px`,
              display: 'flex',
              position: 'relative',
              overflow: 'hidden',
              padding: 0
            }}
          >
            <ErrorBoundary>
              {tree ? (
                <Viewport
                  tree={tree}
                  visibleIds={geometryVisibleIds}
                  refGeometry={refGeometry}
                  refOriginVisibility={refOriginVisibility}
                  hiddenRefIds={hiddenIdSet}
                />
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>??</div>
                    <h3>3D Viewport</h3>
                    <p>Refresh tree to see 3D visualization</p>
                  </div>
                </div>
              )}
            </ErrorBoundary>
          </div>

          <div
            role="separator"
            aria-orientation="horizontal"
            data-testid="resize-robot"
            tabIndex={0}
            onPointerDown={handleRobotResizeStart}
            onKeyDown={handleRobotResizeKeyDown}
            style={{ height: '6px', cursor: 'row-resize', background: 'var(--color-border)' }}
          />

          <div style={{ flex: 1, minHeight: `${MIN_ROBOT_DEF_HEIGHT}px` }}>
            <RobotDefinitionPanel
              definition={robotDefinition}
              onDefinitionChange={commitRobotDefinition}
              onSave={() => bridgeClient.send(MessageTypes.ROBOT_DEF_SAVE, robotDefinition)}
              onUndo={() => {
                bridgeClient.send(MessageTypes.ROBOT_DEF_UNDO);
                undoRobotDefinition();
              }}
              onRedo={() => {
                bridgeClient.send(MessageTypes.ROBOT_DEF_REDO);
                redoRobotDefinition();
              }}
              canUndo={canUndoRobot}
              canRedo={canRedoRobot}
              onSelectionChange={handleRobotSelectionChange}
              externalSelection={robotSelection}
              refGeometry={refGeometry}
              onNodeClick={refPickMode ? (nodeId) => { handleRefPickAssign(nodeId); return true; } : undefined}
              onActiveNodeChange={setActiveRobotNodeId}
              onClear={() => {
                const defaults = createDefaultRobotDefinition();
                const baseOnly: RobotDefinition = {
                    nodes: [defaults.nodes[0]], // Keep only base
                    joints: []
                };
                replaceRobotDefinition(baseOnly);
              }}
            />
          </div>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer style={{ padding: '4px 12px', borderTop: '1px solid #333', fontSize: '10px', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <ConnectionStatus status={connectionStatus} />
          <span>WV2: {debugInfo.wv2Present ? '✅' : '❌'}</span>
          <span>| Last: {debugInfo.lastMessage}</span>
          <span style={{ cursor: 'pointer', color: 'var(--color-primary)', textDecoration: 'underline' }} onClick={() => setShowLogs(!showLogs)}>
            [Toggle Logs]
          </span>
        </div>
        <div>v0.1.0</div>
      </footer>

      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: '140px',
            zIndex: 40
          }}
        >
          {activeRobotNodeId && (
            <button
              onClick={() => {
                // Determine what was clicked.
                // If it's a tree item, contextMenu.id (wait, we need to pass ID to context menu state)
                // We stored selection state but context menu state is just {x,y}.
                // We rely on 'selectedIds' being the target if we right clicked it.
                // But context menu opens on right click.
                // We should grab the ID that was right clicked.
                // Let's assume the selection logic handles "Right click selects it first".
                // So selectedIds[0] is the target.
                if (selectedIds.length > 0) {
                    handleAddToActiveNode(selectedIds[0]);
                }
                setContextMenu(null);
              }}
              style={{ textAlign: 'left' }}
            >
              Add to Active Node
            </button>
          )}
          {selectionHasVisible && (
            <button
              onClick={() => {
                handleHide(selectedIds);
                setContextMenu(null);
              }}
              style={{ textAlign: 'left' }}
            >
              Hide (Shift+H)
            </button>
          )}
          {showHidden && selectionHasHidden && (
            <button
              onClick={() => {
                handleUnhide(selectedIds);
                setContextMenu(null);
              }}
              style={{ textAlign: 'left' }}
            >
              Unhide
            </button>
          )}
          {hiddenIdSet.size > 0 && (
            <button
              onClick={() => {
                handleUnhideAll();
                setContextMenu(null);
              }}
              style={{ textAlign: 'left' }}
            >
              Unhide All
            </button>
          )}
          {contextMenu && (
            <>
              {selectedIds.length === 1 && hiddenIdSet.has(selectedIds[0]) && (
                <button
                  onClick={() => {
                    handleUnhide(selectedIds);
                    setContextMenu(null);
                  }}
                  style={{ textAlign: 'left' }}
                >
                  Unhide Item
                </button>
              )}
              <button
                onClick={() => {
                  // If we selected a node, we assume single selection for origin toggle for now
                  // or iterate all selectedIds
                  selectedIds.forEach(id => handleFrameOriginToggle(id));
                  setContextMenu(null);
                }}
                style={{ textAlign: 'left' }}
              >
                Toggle Origin
              </button>
            </>
          )}
        </div>
      )}

      {refContextMenu && (
        <div
          style={{
            position: 'fixed',
            left: refContextMenu.x,
            top: refContextMenu.y,
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: '160px',
            zIndex: 40
          }}
        >
          {!refMenuHidden && (
            <button
              onClick={() => {
                handleRefHide([refContextMenu.id]);
                setRefContextMenu(null);
              }}
              style={{ textAlign: 'left' }}
            >
              Hide
            </button>
          )}
          {showHidden && refMenuHidden && (
            <button
              onClick={() => {
                handleRefUnhide([refContextMenu.id]);
                setRefContextMenu(null);
              }}
              style={{ textAlign: 'left' }}
            >
              Unhide
            </button>
          )}
          <button
            onClick={() => {
              handleRefOriginToggle(refContextMenu.id);
              setRefContextMenu(null);
            }}
            style={{ textAlign: 'left' }}
          >
            {refMenuOriginVisible ? 'Hide Origin' : 'Show Origin'}
          </button>
          <button
            onClick={() => handleRefPickStart(refContextMenu.id)}
            style={{ textAlign: 'left' }}
          >
            Add to Node...
          </button>
        </div>
      )}

      {refPickMode && (
        <div style={{
            position: 'fixed',
            top: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--color-primary)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.9rem'
        }}>
            <span>Select a node in the Robot Definition panel to assign <strong>{refGeometry.find(r => r.id === refPickMode)?.path}</strong></span>
            <button 
                onClick={handleRefPickCancel}
                style={{ 
                    background: 'rgba(0,0,0,0.2)', 
                    border: 'none', 
                    borderRadius: '50%', 
                    width: '24px', 
                    height: '24px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                }}
            >✕</button>
        </div>
      )}

      {showShortcuts && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}
        >
          <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '10px', padding: '16px', minWidth: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.95rem' }}>Shortcuts</strong>
              <button onClick={() => setShowShortcuts(false)}>Close</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div><strong>Shift+H</strong> Hide selected nodes and descendants</div>
              <div><strong>Show Hidden</strong> Toggle hidden items in tree</div>
              <div><strong>Unhide All</strong> Restore all hidden items</div>
            </div>
          </div>
        </div>
      )}

      <DebugLog logs={logs} isOpen={showLogs} onClose={() => setShowLogs(false)} />
    </div>
  )
}

const AppWrapper = () => (
  <SelectionProvider>
    <App />
  </SelectionProvider>
)

export default AppWrapper
