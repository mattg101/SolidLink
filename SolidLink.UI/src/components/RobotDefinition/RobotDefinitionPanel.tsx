import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RobotDefinition, RobotJoint, RobotNode, RobotNodeType, RobotJointType, RefGeometryNode } from '../../bridge';
import './RobotDefinitionPanel.css';

type SelectionState = {
  nodeIds: string[];
  jointIds: string[];
};

type DragState = {
  mode: 'node' | 'joint';
  start: { x: number; y: number };
  current: { x: number; y: number };
};

type PanState = {
  start: { x: number; y: number };
  origin: { x: number; y: number };
};

const NODE_WIDTH = 140;
const NODE_HEIGHT = 44;
const H_GAP = 160;
const V_GAP = 24;
const CANVAS_PADDING = 60;

const NODE_STYLE: Record<RobotNodeType, { color: string; label: string }> = {
  body: { color: '#3A86FF', label: 'Body' },
  sensor: { color: '#FF006E', label: 'Sensor' },
  frame: { color: '#00B894', label: 'Frame' }
};

const JOINT_STYLE: Record<RobotJointType, { color: string; label: string }> = {
  fixed: { color: '#6C757D', label: 'Fixed' },
  revolute: { color: '#F59F00', label: 'Revolute' },
  linear: { color: '#E76F51', label: 'Linear' }
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeVector = (values?: number[]) => {
  if (!values || values.length < 3) return undefined;
  const [x, y, z] = values;
  const length = Math.sqrt(x * x + y * y + z * z);
  if (!length) return undefined;
  return [x / length, y / length, z / length];
};

const resolveAxisDirection = (ref?: RefGeometryNode) => {
  if (!ref) return undefined;
  const fromAxis = normalizeVector(ref.axisDirection);
  if (fromAxis) return fromAxis;
  const matrix = ref.localTransform?.matrix;
  if (matrix && matrix.length >= 9) {
    const fromMatrix = normalizeVector([matrix[0], matrix[1], matrix[2]]);
    if (fromMatrix) return fromMatrix;
  }
  return undefined;
};

const buildNodeMap = (definition: RobotDefinition) => {
  const map = new Map<string, RobotNode>();
  definition.nodes.forEach(node => map.set(node.id, node));
  return map;
};

const buildJointMap = (definition: RobotDefinition) => {
  const map = new Map<string, RobotJoint>();
  definition.joints.forEach(joint => map.set(joint.id, joint));
  return map;
};

const resolveRootId = (definition: RobotDefinition) => {
  const childIds = new Set(definition.joints.map(joint => joint.childId));
  const root = definition.nodes.find(node => !childIds.has(node.id));
  return root?.id ?? definition.nodes[0]?.id ?? '';
};

const layoutTree = (definition: RobotDefinition, collapsedIds: Set<string>) => {
  const nodeMap = buildNodeMap(definition);
  const rootId = resolveRootId(definition);
  const positions = new Map<string, { x: number; y: number }>();
  let maxX = 0;
  let maxY = 0;

  const walk = (nodeId: string, depth: number, cursor: number) => {
    const node = nodeMap.get(nodeId);
    if (!node) return { center: cursor, next: cursor };
    const children = collapsedIds.has(nodeId) ? [] : node.children;

    if (!children.length) {
      const y = cursor;
      const x = depth * H_GAP;
      positions.set(nodeId, { x, y });
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      return { center: y + NODE_HEIGHT / 2, next: y + NODE_HEIGHT + V_GAP };
    }

    let nextCursor = cursor;
    let firstCenter = 0;
    let lastCenter = 0;
    children.forEach((childId, index) => {
      const result = walk(childId, depth + 1, nextCursor);
      nextCursor = result.next;
      if (index === 0) firstCenter = result.center;
      lastCenter = result.center;
    });

    const center = (firstCenter + lastCenter) / 2;
    const y = center - NODE_HEIGHT / 2;
    const x = depth * H_GAP;
    positions.set(nodeId, { x, y });
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    return { center, next: nextCursor };
  };

  walk(rootId, 0, 0);
  const width = maxX + NODE_WIDTH + CANVAS_PADDING * 2;
  const height = maxY + NODE_HEIGHT + CANVAS_PADDING * 2;

  return { positions, width, height };
};

const buildSelectionBox = (dragState: DragState) => {
  const minX = Math.min(dragState.start.x, dragState.current.x);
  const minY = Math.min(dragState.start.y, dragState.current.y);
  const maxX = Math.max(dragState.start.x, dragState.current.x);
  const maxY = Math.max(dragState.start.y, dragState.current.y);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

type RobotDefinitionPanelProps = {
  definition: RobotDefinition;
  onDefinitionChange: (next: RobotDefinition) => void;
  onSave: () => void;
  onSaveVersion?: () => void;
  onLoad?: () => void;
  onHistory?: () => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSelectionChange?: (nodeIds: string[], jointIds: string[]) => void;
  externalSelection?: SelectionState | null;
  refGeometry?: RefGeometryNode[];
  onNodeClick?: (nodeId: string) => boolean; // Return true to consume the click (prevent selection)
  onActiveNodeChange?: (nodeId: string | null) => void;
  geometryMap?: Record<string, string>;
  onViewportHighlight?: (ids: string[]) => void;
};

export const RobotDefinitionPanel = ({
  definition,
  onDefinitionChange,
  onSave,
  onSaveVersion,
  onLoad,
  onHistory,
  onClear,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSelectionChange,
  externalSelection,
  refGeometry = [],
  onNodeClick,
  onActiveNodeChange,
  geometryMap = {},
  onViewportHighlight
}: RobotDefinitionPanelProps) => {
  const [selection, setSelection] = useState<SelectionState>({ nodeIds: [], jointIds: [] });
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [activeGeometryIds, setActiveGeometryIds] = useState<string[]>([]); // For highlighting
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const nodeMap = useMemo(() => buildNodeMap(definition), [definition]);
  const jointMap = useMemo(() => buildJointMap(definition), [definition]);
  const layout = useMemo(() => layoutTree(definition, collapsedIds), [definition, collapsedIds]);
  const axisOptions = useMemo(() => refGeometry.filter(ref => ref.type === 'axis'), [refGeometry]);

  useEffect(() => {
    // If active geometry IDs change, highlight them in viewport
    if (activeGeometryIds.length > 0) {
        onViewportHighlight?.(activeGeometryIds);
    } else {
        // Only clear if we were highlighting geometry, not if user just selected something else
        // Actually, viewport expects 'selection' for highlighting usually.
        // We might want to use a separate prop for "highlight these items in viewport".
        // For now, let's just trigger selection if user clicks "Show Node Geometry".
        // But for hovering list items...
        onViewportHighlight?.([]); 
    }
  }, [activeGeometryIds, onViewportHighlight]);

  useEffect(() => {
    if (!externalSelection) return;
    setSelection(prev => {
      // Avoid infinite loop by shallow check
      if (
        prev.nodeIds.length === externalSelection.nodeIds.length &&
        prev.jointIds.length === externalSelection.jointIds.length &&
        prev.nodeIds.every(id => externalSelection.nodeIds.includes(id)) &&
        prev.jointIds.every(id => externalSelection.jointIds.includes(id))
      ) {
        return prev;
      }
      return externalSelection;
    });
  }, [externalSelection]);

  useEffect(() => {
    onSelectionChange?.(selection.nodeIds, selection.jointIds);
  }, [selection, onSelectionChange]);

  useEffect(() => {
    if (!selection.nodeIds.length && !selection.jointIds.length) {
        onActiveNodeChange?.(null);
        return;
    }
    const activeNodeIds = selection.nodeIds.filter(id => nodeMap.has(id));
    const activeJointIds = selection.jointIds.filter(id => jointMap.has(id));
    
    if (activeNodeIds.length === 1) {
        onActiveNodeChange?.(activeNodeIds[0]);
    } else {
        onActiveNodeChange?.(null);
    }

    if (activeNodeIds.length === selection.nodeIds.length && activeJointIds.length === selection.jointIds.length) return;
    setSelection({ nodeIds: activeNodeIds, jointIds: activeJointIds });
  }, [selection, nodeMap, jointMap, onActiveNodeChange]);

  const screenToGraph = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom - CANVAS_PADDING,
      y: (clientY - rect.top - pan.y) / zoom - CANVAS_PADDING
    };
  }, [pan.x, pan.y, zoom]);

  const updateDefinition = useCallback((next: RobotDefinition) => {
    onDefinitionChange(next);
  }, [onDefinitionChange]);

  const updateNode = useCallback((nodeId: string, patch: Partial<RobotNode>) => {
    const nextNodes = definition.nodes.map(node => (
      node.id === nodeId ? { ...node, ...patch } : node
    ));
    updateDefinition({ ...definition, nodes: nextNodes });
  }, [definition, updateDefinition]);

  const updateJoint = useCallback((jointId: string, patch: Partial<RobotJoint>) => {
    const nextJoints = definition.joints.map(joint => (
      joint.id === jointId ? { ...joint, ...patch } : joint
    ));
    updateDefinition({ ...definition, joints: nextJoints });
  }, [definition, updateDefinition]);

  const handleSelectNode = (nodeId: string, multi: boolean) => {
    setSelection(prev => {
      if (!multi) return { nodeIds: [nodeId], jointIds: [] };
      const exists = prev.nodeIds.includes(nodeId);
      return {
        nodeIds: exists ? prev.nodeIds.filter(id => id !== nodeId) : [...prev.nodeIds, nodeId],
        jointIds: prev.jointIds
      };
    });
  };

  const handleSelectJoint = (jointId: string, multi: boolean) => {
    setSelection(prev => {
      if (!multi) return { nodeIds: [], jointIds: [jointId] };
      const exists = prev.jointIds.includes(jointId);
      return {
        nodeIds: prev.nodeIds,
        jointIds: exists ? prev.jointIds.filter(id => id !== jointId) : [...prev.jointIds, jointId]
      };
    });
  };

  const handleToggleCollapse = (nodeId: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleAddChild = (parentId: string) => {
    // Ensure parent is expanded so new child is visible in layout
    setCollapsedIds(prev => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
    });

    const newId = `node-${Date.now()}`;
    const newJointId = `joint-${Date.now()}`;
    const parent = nodeMap.get(parentId);
    if (!parent) return;
    const newNode: RobotNode = {
      id: newId,
      name: `Link ${definition.nodes.length + 1}`,
      type: 'body',
      children: [],
      geometryIds: []
    };
    const nextNodes = definition.nodes.map(node => (
      node.id === parentId
        ? { ...node, children: [...node.children, newId] }
        : node
    ));
    const nextJoints = [...definition.joints, {
      id: newJointId,
      parentId,
      childId: newId,
      type: 'fixed' as const
    }];
    updateDefinition({ ...definition, nodes: [...nextNodes, newNode], joints: nextJoints });
    setSelection({ nodeIds: [newId], jointIds: [] });
  };

  const handleRemoveNode = (nodeId: string) => {
    const rootId = resolveRootId(definition);
    if (nodeId === rootId) return;
    const toRemove = new Set<string>();
    const walk = (id: string) => {
      if (toRemove.has(id)) return;
      toRemove.add(id);
      const node = nodeMap.get(id);
      node?.children.forEach(childId => walk(childId));
    };
    walk(nodeId);

    const nextNodes = definition.nodes
      .filter(node => !toRemove.has(node.id))
      .map(node => ({
        ...node,
        children: node.children.filter(childId => !toRemove.has(childId))
      }));
    const nextJoints = definition.joints.filter(joint => !toRemove.has(joint.childId) && !toRemove.has(joint.parentId));
    updateDefinition({ ...definition, nodes: nextNodes, joints: nextJoints });
    setSelection({ nodeIds: [], jointIds: [] });
  };

  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey) {
      setPanState({
        start: { x: event.clientX, y: event.clientY },
        origin: { ...pan }
      });
      return;
    }
    const start = screenToGraph(event.clientX, event.clientY);
    setDragState({
      mode: event.shiftKey ? 'joint' : 'node',
      start,
      current: start
    });
  };

  const handleCanvasPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panState) {
      setPan({
        x: panState.origin.x + (event.clientX - panState.start.x),
        y: panState.origin.y + (event.clientY - panState.start.y)
      });
      return;
    }
    if (!dragState) return;
    const current = screenToGraph(event.clientX, event.clientY);
    setDragState(prev => prev ? { ...prev, current } : prev);
  };

  const handleCanvasPointerUp = () => {
    if (panState) {
      setPanState(null);
      return;
    }
    if (!dragState) return;
    const box = buildSelectionBox(dragState);
    if (dragState.mode === 'node') {
      const selected = Array.from(layout.positions.entries())
        .filter(([, pos]) => {
          const rect = {
            x: pos.x,
            y: pos.y,
            width: NODE_WIDTH,
            height: NODE_HEIGHT
          };
          return (
            rect.x + rect.width >= box.x &&
            rect.x <= box.x + box.width &&
            rect.y + rect.height >= box.y &&
            rect.y <= box.y + box.height
          );
        })
        .map(([id]) => id);
      setSelection({ nodeIds: selected, jointIds: [] });
    } else {
      const selected = definition.joints
        .filter(joint => {
          const parentPos = layout.positions.get(joint.parentId);
          const childPos = layout.positions.get(joint.childId);
          if (!parentPos || !childPos) return false;
          const start = { x: parentPos.x + NODE_WIDTH, y: parentPos.y + NODE_HEIGHT / 2 };
          const end = { x: childPos.x, y: childPos.y + NODE_HEIGHT / 2 };
          const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
          return (
            mid.x >= box.x &&
            mid.x <= box.x + box.width &&
            mid.y >= box.y &&
            mid.y <= box.y + box.height
          );
        })
        .map(joint => joint.id);
      setSelection({ nodeIds: [], jointIds: selected });
    }
    setDragState(null);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = -event.deltaY * 0.0015;
    const nextZoom = clamp(zoom + delta, 0.05, 2.4);
    setZoom(nextZoom);
  };

  const handleFit = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    const scaleX = rect.width / layout.width;
    const scaleY = rect.height / layout.height;
    const nextZoom = clamp(Math.min(scaleX, scaleY) * 0.9, 0.05, 2.1);
    setZoom(nextZoom);
    setPan({
      x: (rect.width - layout.width * nextZoom) / 2,
      y: (rect.height - layout.height * nextZoom) / 2
    });
  }, [layout]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initial fit with small delay to allow layout/animation to settle
    const timer = setTimeout(() => {
        handleFit();
    }, 50);

    const observer = new ResizeObserver(() => {
      handleFit();
    });
    observer.observe(containerRef.current);
    
    return () => {
        clearTimeout(timer);
        observer.disconnect();
    };
  }, [handleFit]);

  const activeNode = selection.nodeIds.length === 1 ? nodeMap.get(selection.nodeIds[0]) ?? null : null;
  const activeJoint = selection.jointIds.length === 1 ? jointMap.get(selection.jointIds[0]) ?? null : null;
  const selectionCount = selection.nodeIds.length + selection.jointIds.length;
  const selectionBox = dragState ? buildSelectionBox(dragState) : null;

  // Highlight geometry in viewport when hovering node or list item
  // Not implemented in this component directly, relies on external selection sync
  // but we can look up names.

  const handleBulkNodeType = (value: RobotNodeType) => {
    if (!selection.nodeIds.length) return;
    const nextNodes = definition.nodes.map(node => (
      selection.nodeIds.includes(node.id)
        ? { ...node, type: value }
        : node
    ));
    updateDefinition({ ...definition, nodes: nextNodes });
  };

  const handleBulkJointType = (value: RobotJointType) => {
    if (!selection.jointIds.length) return;
    const nextJoints = definition.joints.map(joint => (
      selection.jointIds.includes(joint.id)
        ? { ...joint, type: value }
        : joint
    ));
    updateDefinition({ ...definition, joints: nextJoints });
  };

  const handleClearGeometry = () => {
    if (!selection.nodeIds.length) return;
    const activeId = selection.nodeIds[0];
    updateNode(activeId, { geometryIds: [] });
  };

  const handleNameChange = (name: string) => {
    if (!selection.nodeIds.length) return;
    const activeId = selection.nodeIds[0];
    updateNode(activeId, { name });
  };

  const geometryLookup = useMemo(() => {
    // We don't have the full map of ID -> Name here easily without tree reference.
    // Ideally pass geometryMap or similar. For now just displaying ID.
    // If we want names, we need the geometry map from App.tsx or derived from tree.
    // Let's assume we just show ID for now unless `refGeometry` or similar helps.
    // Actually, `refGeometry` is for frames. `tree` has components.
    return {};
  }, []);

  return (
    <div className="robot-def-panel">
      <div className="robot-def-header">
        <div className="robot-def-header-left">
          <div className="robot-def-title">Robot Definition</div>
        </div>
          <div className="robot-def-actions">
            <button className="robot-def-button" onClick={onUndo} disabled={!canUndo}>Undo</button>
            <button className="robot-def-button" onClick={onRedo} disabled={!canRedo}>Redo</button>
            <button className="robot-def-button" onClick={onClear}>Clear</button>
            <button className="robot-def-button robot-def-primary" onClick={onSave}>Save</button>
            {onSaveVersion && (
              <button className="robot-def-button" onClick={onSaveVersion}>Save Version</button>
            )}
            {onLoad && (
              <button className="robot-def-button" onClick={onLoad}>Load</button>
            )}
            {onHistory && (
              <button className="robot-def-button" onClick={onHistory}>History</button>
            )}
            <button className="robot-def-button robot-def-ghost" onClick={handleFit}>Fit</button>
          </div>
        </div>
      <div className="robot-def-body">
        <div className="robot-def-canvas">
          <div
            ref={containerRef}
            className="robot-def-canvas-stage"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerLeave={handleCanvasPointerUp}
            onWheel={handleWheel}
            role="presentation"
          >
            <svg ref={svgRef} width="100%" height="100%">
              <defs>
                <filter id="robot-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="rgba(43, 198, 127, 0.35)" />
                </filter>
              </defs>
              <g transform={`translate(${pan.x + CANVAS_PADDING * zoom} ${pan.y + CANVAS_PADDING * zoom}) scale(${zoom})`}>
                {definition.joints.map(joint => {
                  const parentPos = layout.positions.get(joint.parentId);
                  const childPos = layout.positions.get(joint.childId);
                  if (!parentPos || !childPos) return null;
                  const startX = parentPos.x + NODE_WIDTH;
                  const startY = parentPos.y + NODE_HEIGHT / 2;
                  const endX = childPos.x;
                  const endY = childPos.y + NODE_HEIGHT / 2;
                  const midX = (startX + endX) / 2;
                  const path = `M ${startX} ${startY} C ${midX} ${startY} ${midX} ${endY} ${endX} ${endY}`;
                  const isSelected = selection.jointIds.includes(joint.id);
                  return (
                    <g key={joint.id}>
                      <path
                        d={path}
                        className={`robot-joint ${isSelected ? 'selected' : ''}`}
                        stroke={JOINT_STYLE[joint.type].color}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSelectJoint(joint.id, event.ctrlKey || event.metaKey);
                        }}
                      />
                      <circle
                        cx={midX}
                        cy={startY + (endY - startY) / 2}
                        r={6}
                        className={`robot-joint-node ${isSelected ? 'selected' : ''}`}
                        fill={JOINT_STYLE[joint.type].color}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSelectJoint(joint.id, event.ctrlKey || event.metaKey);
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </g>
                  );
                })}
                {definition.nodes.map(node => {
                  const pos = layout.positions.get(node.id);
                  if (!pos) return null;
                  const isSelected = selection.nodeIds.includes(node.id);
                  const isHovered = hoveredNodeId === node.id;
                  const isCollapsed = collapsedIds.has(node.id);
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x} ${pos.y})`}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(prev => (prev === node.id ? null : prev))}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (onNodeClick && onNodeClick(node.id)) return;
                        handleSelectNode(node.id, event.ctrlKey || event.metaKey);
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        handleToggleCollapse(node.id);
                      }}
                      className="robot-node-group"
                    >
                      <rect
                        width={NODE_WIDTH}
                        height={NODE_HEIGHT}
                        rx={8}
                        className={`robot-node ${isSelected ? 'selected' : ''}`}
                        fill={NODE_STYLE[node.type].color}
                      />
                      <rect
                        x={8}
                        y={10}
                        width={24}
                        height={24}
                        rx={6}
                        className="robot-node-icon"
                      />
                      <text x={20} y={26} textAnchor="middle" className="robot-node-icon-text">
                        {node.type === 'body' ? 'B' : node.type === 'sensor' ? 'S' : 'F'}
                      </text>
                      <text x={40} y={18} className="robot-node-title">{node.name}</text>
                      <text x={40} y={32} className="robot-node-subtitle">{NODE_STYLE[node.type].label}</text>
                      {isCollapsed && (
                        <circle cx={NODE_WIDTH - 12} cy={10} r={4} className="robot-node-collapse" />
                      )}
                      {isHovered && (
                        <>
                          <g
                            className="robot-node-action"
                            transform={`translate(${NODE_WIDTH - 28} ${NODE_HEIGHT - 14})`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleAddChild(node.id);
                            }}
                          >
                            <circle r={8} />
                            <line x1={-3} y1={0} x2={3} y2={0} />
                            <line x1={0} y1={-3} x2={0} y2={3} />
                          </g>
                          <g
                            className="robot-node-action"
                            transform={`translate(${NODE_WIDTH - 50} ${NODE_HEIGHT - 14})`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemoveNode(node.id);
                            }}
                          >
                            <circle r={8} />
                            <line x1={-3} y1={0} x2={3} y2={0} />
                          </g>
                        </>
                      )}
                    </g>
                  );
                })}
                {selectionBox && (
                  <rect
                    className="robot-selection-box"
                    x={selectionBox.x}
                    y={selectionBox.y}
                    width={selectionBox.width}
                    height={selectionBox.height}
                  />
                )}
              </g>
            </svg>
          </div>
          {selectionCount > 0 && (
            <div className="robot-def-meta">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="robot-def-meta-title">Metadata</div>
                <button 
                  onClick={() => setSelection({ nodeIds: [], jointIds: [] })}
                  style={{ background: 'transparent', border: 'none', color: '#9cb5c8', cursor: 'pointer', padding: '0 4px', fontSize: '1rem', lineHeight: '1' }}
                >
                  &times;
                </button>
              </div>
              {activeNode && (
                <>
                  <div className="robot-def-field">
                    <label>Name</label>
                    <input
                      value={activeNode.name}
                      onChange={(event) => updateNode(activeNode.id, { name: event.target.value })}
                    />
                  </div>
                  <div className="robot-def-field">
                    <label>Node Type</label>
                    <select
                      value={activeNode.type}
                      onChange={(event) => updateNode(activeNode.id, { type: event.target.value as RobotNodeType })}
                    >
                      <option value="body">Body</option>
                      <option value="sensor">Sensor</option>
                      <option value="frame">Frame</option>
                    </select>
                  </div>
                  <div className="robot-def-field">
                    <label>{activeNode.type === 'frame' ? 'Frame' : 'Origin Frame'}</label>
                    <select
                      value={activeNode.frameId || ''}
                      onChange={(event) => updateNode(activeNode.id, { frameId: event.target.value || undefined })}
                    >
                      <option value="">(None)</option>
                      {refGeometry.map(ref => (
                        <option key={ref.id} value={ref.id}>
                          {ref.path}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="robot-def-field">
                    <label>Geometry IDs</label>
                    <div className="robot-def-geometry">
                      {activeNode.geometryIds.map(id => (
                        <div key={id} className="robot-def-chip">
                          <span title={id} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {geometryMap[id] || id}
                          </span>
                          <button
                            onClick={() => {
                              const next = activeNode.geometryIds.filter(entry => entry !== id);
                              updateNode(activeNode.id, { geometryIds: next });
                            }}
                          >
                            x
                          </button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="robot-def-add-geometry"
                          style={{ color: '#ff8a80', borderColor: '#ff8a80', width: '100%' }}
                          onClick={handleClearGeometry}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {activeJoint && (
                <>
                  <div className="robot-def-field">
                    <label>Joint Type</label>
                    <select
                      value={activeJoint.type}
                      onChange={(event) => updateJoint(activeJoint.id, { type: event.target.value as RobotJointType })}
                    >
                      <option value="fixed">Fixed</option>
                      <option value="revolute">Revolute</option>
                      <option value="linear">Linear</option>
                    </select>
                  </div>
                  <div className="robot-def-field">
                    <label>Parent</label>
                    <div className="robot-def-readonly">{nodeMap.get(activeJoint.parentId)?.name ?? activeJoint.parentId}</div>
                  </div>
                  <div className="robot-def-field">
                    <label>Child</label>
                    <div className="robot-def-readonly">{nodeMap.get(activeJoint.childId)?.name ?? activeJoint.childId}</div>
                  </div>
                  <div className="robot-def-field">
                    <label>Axis</label>
                    <select
                      value={activeJoint.axisRefId || ''}
                      disabled={activeJoint.type === 'fixed'}
                      onChange={(event) => {
                        const nextId = event.target.value || undefined;
                        if (!nextId) {
                          updateJoint(activeJoint.id, { axisRefId: undefined, axis: undefined });
                          return;
                        }
                        const axisRef = axisOptions.find(ref => ref.id === nextId);
                        const axis = resolveAxisDirection(axisRef) ?? [1, 0, 0];
                        updateJoint(activeJoint.id, { axisRefId: nextId, axis });
                      }}
                    >
                      <option value="">(None)</option>
                      {axisOptions.map(ref => (
                        <option key={ref.id} value={ref.id}>
                          {ref.path}
                        </option>
                      ))}
                    </select>
                    <div className="robot-def-axis">
                      {activeJoint.axis
                        ? `dir: [${activeJoint.axis.map(value => value.toFixed(3)).join(', ')}]`
                        : 'dir: —'}
                    </div>
                  </div>
                </>
              )}
              {!activeNode && !activeJoint && selectionCount > 1 && (
                <>
                  <div className="robot-def-field">
                    <label>Bulk Update</label>
                    {selection.nodeIds.length > 0 && (
                      <select onChange={(event) => handleBulkNodeType(event.target.value as RobotNodeType)} defaultValue="">
                        <option value="" disabled>Set node type</option>
                        <option value="body">Body</option>
                        <option value="sensor">Sensor</option>
                        <option value="frame">Frame</option>
                      </select>
                    )}
                    {selection.jointIds.length > 0 && (
                      <select onChange={(event) => handleBulkJointType(event.target.value as RobotJointType)} defaultValue="">
                        <option value="" disabled>Set joint type</option>
                        <option value="fixed">Fixed</option>
                        <option value="revolute">Revolute</option>
                        <option value="linear">Linear</option>
                      </select>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
