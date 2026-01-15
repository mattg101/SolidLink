import { ConnectionStatus } from './components/ConnectionStatus'
import { useBridge, bridgeClient, MessageTypes } from './bridge'
import type { ConnectionStatusPayload, TreeFilterPayload } from './bridge'
import { SelectionProvider, useSelection } from './context/SelectionContext'
import { Viewport } from './components/Viewport/Viewport'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DebugLog, useLogger } from './components/DebugLog'
import { useState, useEffect, useMemo } from 'react'

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
  links: any[];
}

const normalizeQuery = (query: string) => query.trim().toLowerCase();

const matchesFilter = (frame: Frame, query: string) => {
  if (!query) return false;
  const name = frame.name?.toLowerCase() ?? '';
  const path = frame.referencePath?.toLowerCase() ?? '';
  return name.includes(query) || path.includes(query);
};

const buildTreeVisibility = (root: Frame | null, query: string) => {
  const visible = new Set<string>();
  const matched = new Set<string>();

  if (!root) return { treeVisibleIds: visible, matchedIds: matched };
  if (!query) {
    const collect = (frame: Frame) => {
      visible.add(frame.id);
      frame.children.forEach(collect);
    };
    collect(root);
    return { treeVisibleIds: visible, matchedIds: matched };
  }

  const walk = (frame: Frame) => {
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

const TreeItem = ({
  frame,
  level = 0,
  filterQuery,
  visibleIds,
  matchedIds,
  orderedIds
}: {
  frame: Frame;
  level?: number;
  filterQuery?: string;
  visibleIds?: Set<string>;
  matchedIds?: Set<string>;
  orderedIds: string[];
}) => {
  const [isOpen, setIsOpen] = useState(true);
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
  const isVisible = !filterQuery || visibleIds?.has(frame.id);

  // Auto-expand if child is a match
  useEffect(() => {
    if (filterQuery) setIsOpen(true);
  }, [filterQuery]);

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
    <div style={{ marginLeft: `${level * 12} px` }}>
      <div
        data-frame-id={frame.id}
        data-selected={isSelected ? 'true' : 'false'}
        data-hovered={isHovered ? 'true' : 'false'}
        onClick={(e) => {
          if (hasChildren) setIsOpen(!isOpen);
          handleSelect(e);
        }}
        onMouseEnter={() => setHover(frame.id)}
        onMouseLeave={() => setHover(null)}
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
          transition: 'all 0.2s'
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

function App() {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')
  const [tree, setTree] = useState<RobotTree | null>(null)
  const [filter, setFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const { logs, log } = useLogger();
  const isDev = import.meta.env.DEV;
  const isWebView = !!(window as any).chrome?.webview;

  const [debugInfo, setDebugInfo] = useState({
    wv2Present: false,
    lastMessage: 'None',
    renderTime: new Date().toLocaleTimeString()
  })

  useEffect(() => {
    const check = setInterval(() => {
      const present = !!(window as any).chrome?.webview
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
    setTree(message.payload);
  })

  useBridge<string>('ERROR_RESPONSE', (message) => {
    log(`Backend Error: ${message.payload}`, 'error');
  })

  const refreshTree = () => {
    log('Sending REQUEST_TREE...', 'info');
    bridgeClient.send('REQUEST_TREE');
  };

  const loadMockTree = async () => {
    if (!isDev) return;
    const { mockTree } = await import('./fixtures/mockTree');
    setTree(mockTree as RobotTree);
    setConnectionStatus('disconnected');
    log('Loaded mock tree data for UI testing.', 'info');
  };

  // Send UI_READY and PING on mount to initiate handshake
  useEffect(() => {
    console.log('[App] Component mounted, signaling UI_READY');
    bridgeClient.send('UI_READY');
    bridgeClient.send(MessageTypes.PING);

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

  const { treeVisibleIds, matchedIds } = useMemo(() => {
    return buildTreeVisibility(tree?.rootFrame ?? null, normalizeQuery(filter));
  }, [tree, filter]);

  const geometryVisibleIds = useMemo(() => {
    return buildGeometryVisibleIds(tree?.rootFrame ?? null, normalizeQuery(debouncedFilter));
  }, [tree, debouncedFilter]);

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

  return (
    <div id="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
        <button onClick={() => console.log('Settings clicked')}>
          Settings
        </button>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '1rem', overflow: 'auto', display: 'flex', gap: '1rem' }}>
        {/* Sidebar / Tree */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                Robot Hierarchy
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
                  <button
                    onClick={loadMockTree}
                    style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                  >
                    Load Mock
                  </button>
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
          </div>

          <div className="panel" data-testid="tree-root" style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
            {tree ? (
              hasFilterMatches ? (
                <TreeItem
                  frame={tree.rootFrame}
                  filterQuery={filter.trim()}
                  visibleIds={treeVisibleIds}
                  matchedIds={matchedIds}
                  orderedIds={orderedIds}
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
        </div>

        {/* 3D Viewport */}
        <div
          className="panel"
          data-testid="viewport-panel"
          style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden', padding: 0 }}
        >
          <ErrorBoundary>
            {tree ? (
              <Viewport tree={tree} visibleIds={geometryVisibleIds} />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                <div>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🧊</div>
                  <h3>3D Viewport</h3>
                  <p>Refresh tree to see 3D visualization</p>
                </div>
              </div>
            )}
          </ErrorBoundary>
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
