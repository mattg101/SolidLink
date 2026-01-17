/**
 * Viewport component for rendering 3D robot models using React Three Fiber.
 * Transforms are applied using absolute positioning from SolidWorks assembly data.
 */
import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei';
import { Box3, Matrix4, Vector3, Quaternion, Euler } from 'three';
import { useSelection } from '../../context/SelectionContext';
import { log } from '../../utils/logger';

interface MeshData {
  positions: number[];
  indices: number[];
}

interface GeometryModel {
  type: string;
  meshData: MeshData;
  color: number[];
}

interface Frame {
  id: string;
  name: string;
  localTransform: {
    position: number[];
    rotation: number[];
    matrix?: number[];
  };
  links: Array<{
    name: string;
    visuals: GeometryModel[];
  }>;
  children: Frame[];
}

interface RefGeometryNode {
  id: string;
  type: 'axis' | 'csys';
  name: string;
  path: string;
  parentPath: string;
  localTransform?: {
    position?: number[];
    rotation?: number[];
    matrix?: number[];
  };
}

type RegisterMesh = (frameId: string, mesh: THREE.Mesh) => () => void;

const MeshVisual = ({
  frameId,
  visual,
  linkIndex,
  visualIndex,
  isSelected,
  isHovered,
  registerMesh,
  onSelect,
  onHover
}: {
  frameId: string;
  visual: GeometryModel;
  linkIndex: number;
  visualIndex: number;
  isSelected: boolean;
  isHovered: boolean;
  registerMesh: RegisterMesh;
  onSelect: (e: any) => void;
  onHover: (hovered: boolean, e: any) => void;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const posArray = useMemo(() => new Float32Array(visual.meshData.positions), [visual.meshData.positions]);
  const indArray = useMemo(() => new Uint32Array(visual.meshData.indices), [visual.meshData.indices]);
  const baseColor = `rgb(${visual.color[0] * 255}, ${visual.color[1] * 255}, ${visual.color[2] * 255})`;

  useEffect(() => {
    if (!meshRef.current) return;
    return registerMesh(frameId, meshRef.current);
  }, [frameId, registerMesh]);

  return (
    <mesh
      ref={meshRef}
      key={`${frameId}-link-${linkIndex}-vis-${visualIndex}`}
      onClick={onSelect}
      onPointerOver={(e) => onHover(true, e)}
      onPointerOut={(e) => onHover(false, e)}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={posArray.length / 3}
          array={posArray}
          itemSize={3}
          args={[posArray, 3]}
        />
        <bufferAttribute
          attach="index"
          count={indArray.length}
          array={indArray}
          itemSize={1}
          args={[indArray, 1]}
        />
      </bufferGeometry>
      <meshStandardMaterial
        color={isSelected ? '#4a9eff' : (isHovered ? '#ffd54a' : baseColor)}
        metalness={0.5}
        roughness={0.5}
        transparent={true}
        opacity={isSelected ? 0.9 : 1.0}
        emissive={isSelected ? '#4a9eff' : (isHovered ? '#ffd54a' : '#000000')}
        emissiveIntensity={isSelected || isHovered ? 0.2 : 0}
      />
    </mesh>
  );
};

const RobotMesh = ({ frame, registerMesh, visibleIds }: { frame: Frame; registerMesh: RegisterMesh; visibleIds?: Set<string> | null }) => {
  const { selectedIds, hoveredId, selectSingle, toggleSelection, setSelection, setHover } = useSelection();
  const isVisible = !visibleIds || visibleIds.has(frame.id);

  useEffect(() => {
    if (frame.links && frame.links.length > 0) {
      log('Viewport', `Rendering ${frame.name}`);
    }
  }, [frame.id]);

  const isSelected = selectedIds.includes(frame.id);
  const isHovered = hoveredId === frame.id;
  const handleSelect = useCallback((e: any) => {
    e.stopPropagation();
    if (e.shiftKey) {
      if (!isSelected) {
        setSelection([...selectedIds, frame.id], frame.id);
      }
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      toggleSelection(frame.id);
      return;
    }
    selectSingle(frame.id);
  }, [frame.id, isSelected, selectedIds, selectSingle, setSelection, toggleSelection]);

  const handleHover = useCallback((hovered: boolean, e: any) => {
    e.stopPropagation();
    setHover(hovered ? frame.id : null);
  }, [frame.id, setHover]);

  const { position, quaternion } = useMemo(() => {
    if (!frame.localTransform?.matrix) {
      return {
        position: new Vector3(
          frame.localTransform?.position?.[0] || 0,
          frame.localTransform?.position?.[1] || 0,
          frame.localTransform?.position?.[2] || 0
        ),
        quaternion: new Quaternion(0, 0, 0, 1)
      };
    }
    const d = frame.localTransform.matrix;
    const m = new Matrix4();
    // SolidWorks ArrayData format: [r0-r8 rotation, tx, ty, tz, scale]
    // SolidWorks stores axis directions as rows; Three.js expects columns (transpose)
    m.set(
      d[0], d[3], d[6], d[9],
      d[1], d[4], d[7], d[10],
      d[2], d[5], d[8], d[11],
      0, 0, 0, 1
    );

    const p = new Vector3();
    const q = new Quaternion();
    const s = new Vector3();
    m.decompose(p, q, s);

    if (frame.links && frame.links.length > 0) {
      const euler = new Euler().setFromQuaternion(q);
      log('Viewport', `${frame.name} pos:[${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}] rot:[${(euler.x * 180 / Math.PI).toFixed(0)}°,${(euler.y * 180 / Math.PI).toFixed(0)}°,${(euler.z * 180 / Math.PI).toFixed(0)}°]`);
    }

    return { position: p, quaternion: q };
  }, [frame.localTransform]);

  // Collect all descendant frames to render at root level (absolute transforms)
  const allDescendants = useMemo(() => {
    const descendants: Frame[] = [];
    const collectDescendants = (f: Frame) => {
      f.children.forEach(child => {
        descendants.push(child);
        collectDescendants(child);
      });
    };
    collectDescendants(frame);
    return descendants;
  }, [frame]);

  return (
    <>
      {/* Render this frame's meshes with its absolute transform */}
      {isVisible && (
        <group position={position} quaternion={quaternion}>
          {frame.links?.map((link, lIdx) => (
            link.visuals?.map((visual, vIdx) => (
              visual.type === 'mesh' && visual.meshData ? (
                <MeshVisual
                  key={`${frame.id}-link-${lIdx}-vis-${vIdx}`}
                  frameId={frame.id}
                  visual={visual}
                  linkIndex={lIdx}
                  visualIndex={vIdx}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  registerMesh={registerMesh}
                  onSelect={handleSelect}
                  onHover={handleHover}
                />
              ) : null
            ))
          ))}
        </group>
      )}
      {/* Render all descendants at root level (not nested) since transforms are absolute */}
      {allDescendants.map(child => (
        <RobotMeshFlat key={child.id} frame={child} registerMesh={registerMesh} visibleIds={visibleIds} />
      ))}
    </>
  );
};

// Flat version that doesn't recurse - just renders one frame with its meshes
const RobotMeshFlat = ({ frame, registerMesh, visibleIds }: { frame: Frame; registerMesh: RegisterMesh; visibleIds?: Set<string> | null }) => {
  const { selectedIds, hoveredId, selectSingle, toggleSelection, setSelection, setHover } = useSelection();
  const isVisible = !visibleIds || visibleIds.has(frame.id);

  const hasMeshes = !!frame.links?.some(link => link.visuals?.some(visual => visual.type === 'mesh' && visual.meshData));
  if (!isVisible || !hasMeshes) return null;

  const isSelected = selectedIds.includes(frame.id);
  const isHovered = hoveredId === frame.id;

  const handleSelect = useCallback((e: any) => {
    e.stopPropagation();
    if (e.shiftKey) {
      if (!isSelected) {
        setSelection([...selectedIds, frame.id], frame.id);
      }
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      toggleSelection(frame.id);
      return;
    }
    selectSingle(frame.id);
  }, [frame.id, isSelected, selectedIds, selectSingle, setSelection, toggleSelection]);

  const handleHover = useCallback((hovered: boolean, e: any) => {
    e.stopPropagation();
    setHover(hovered ? frame.id : null);
  }, [frame.id, setHover]);

  const { position, quaternion } = useMemo(() => {
    if (!frame.localTransform?.matrix) {
      return { position: new Vector3(), quaternion: new Quaternion() };
    }
    const d = frame.localTransform.matrix;
    const m = new Matrix4();
    m.set(d[0], d[3], d[6], d[9], d[1], d[4], d[7], d[10], d[2], d[5], d[8], d[11], 0, 0, 0, 1);
    const p = new Vector3(); const q = new Quaternion(); const s = new Vector3();
    m.decompose(p, q, s);
    return { position: p, quaternion: q };
  }, [frame.localTransform]);

  return (
    <group position={position} quaternion={quaternion}>
      {frame.links?.map((link, lIdx) => (
        link.visuals?.map((visual, vIdx) => (
          visual.type === 'mesh' && visual.meshData ? (
            <MeshVisual
              key={`${frame.id}-link-${lIdx}-vis-${vIdx}`}
              frameId={frame.id}
              visual={visual}
              linkIndex={lIdx}
              visualIndex={vIdx}
              isSelected={isSelected}
              isHovered={isHovered}
              registerMesh={registerMesh}
              onSelect={handleSelect}
              onHover={handleHover}
            />
          ) : null
        ))
      ))}
    </group>
  );
};

const AxisLine = ({ size = 0.12, color = '#f5c16c' }: { size?: number; color?: string }) => {
  const positions = useMemo(() => new Float32Array([-size, 0, 0, size, 0, 0]), [size]);
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} />
    </line>
  );
};

const RefGeometryGlyph = ({
  node,
  showOrigin
}: {
  node: RefGeometryNode;
  showOrigin: boolean;
}) => {
  const { position, quaternion } = useMemo(() => {
    const matrix = node.localTransform?.matrix;
    if (!matrix || matrix.length < 12) {
      return {
        position: new Vector3(
          node.localTransform?.position?.[0] || 0,
          node.localTransform?.position?.[1] || 0,
          node.localTransform?.position?.[2] || 0
        ),
        quaternion: new Quaternion(0, 0, 0, 1)
      };
    }
    const m = new Matrix4();
    m.set(
      matrix[0], matrix[3], matrix[6], matrix[9],
      matrix[1], matrix[4], matrix[7], matrix[10],
      matrix[2], matrix[5], matrix[8], matrix[11],
      0, 0, 0, 1
    );
    const p = new Vector3();
    const q = new Quaternion();
    const s = new Vector3();
    m.decompose(p, q, s);
    return { position: p, quaternion: q };
  }, [node.localTransform?.matrix, node.localTransform?.position]);

  return (
    <group position={position} quaternion={quaternion}>
      {node.type === 'csys' ? (
        <axesHelper args={[0.15]} />
      ) : (
        <AxisLine />
      )}
      {showOrigin && (
        <mesh>
          <sphereGeometry args={[0.012, 12, 12]} />
          <meshStandardMaterial color="#f5c16c" emissive="#f5c16c" emissiveIntensity={0.35} />
        </mesh>
      )}
    </group>
  );
};

const RenderReadbackBridge = ({ enabled }: { enabled: boolean }) => {
  const { gl, size, scene, camera } = useThree();

  useEffect(() => {
    if (!enabled) return;
    const ctx = gl.getContext();
    (window as any).__renderReadback__ = (point?: { x: number; y: number }) => {
      const pixelRatio = gl.getPixelRatio();
      const width = Math.floor(size.width * pixelRatio);
      const height = Math.floor(size.height * pixelRatio);
      const x = point?.x ?? size.width / 2;
      const y = point?.y ?? size.height / 2;
      const readX = Math.min(width - 1, Math.max(0, Math.floor(x * pixelRatio)));
      const readY = Math.min(height - 1, Math.max(0, Math.floor((size.height - y) * pixelRatio)));
      const buffer = new Uint8Array(4);
      gl.render(scene, camera);
      ctx.readPixels(readX, readY, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, buffer);
      return { r: buffer[0], g: buffer[1], b: buffer[2], a: buffer[3] };
    };
    return () => {
      delete (window as any).__renderReadback__;
    };
  }, [camera, enabled, gl, scene, size.height, size.width]);

  return null;
};

export const Viewport = ({
  tree,
  visibleIds,
  refGeometry,
  refOriginVisibility,
  hiddenRefIds
}: {
  tree: any;
  visibleIds?: Set<string> | null;
  refGeometry?: RefGeometryNode[];
  refOriginVisibility?: Record<string, boolean>;
  hiddenRefIds?: Set<string>;
}) => {
  const { selectedIds, setSelection, clearSelection } = useSelection();
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{ start: Vector3; end: Vector3 } | null>(null);
  const dragStateRef = useRef<{
    start: { x: number; y: number };
    mode: 'add' | 'replace';
    moved: boolean;
    pointerId: number;
  } | null>(null);
  const meshRegistry = useRef<Map<string, Set<THREE.Mesh>>>(new Map());

  const updateMeshRegistryDebug = useCallback(() => {
    if (!import.meta.env.DEV) return;
    const snapshot: Record<string, number> = {};
    meshRegistry.current.forEach((meshes, frameId) => {
      snapshot[frameId] = meshes.size;
    });
    (window as any).__meshRegistry__ = snapshot;
  }, []);

  const registerMesh = useCallback<RegisterMesh>((frameId, mesh) => {
    const map = meshRegistry.current;
    if (!map.has(frameId)) {
      map.set(frameId, new Set());
    }
    map.get(frameId)!.add(mesh);
    updateMeshRegistryDebug();
    return () => {
      const set = map.get(frameId);
      if (!set) return;
      set.delete(mesh);
      if (set.size === 0) {
        map.delete(frameId);
      }
      updateMeshRegistryDebug();
    };
  }, [updateMeshRegistryDebug]);

  const getCanvasSize = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return { width: 1, height: 1 };
    }
    return { width: rect.width, height: rect.height };
  }, []);

  const projectBoxToScreen = useCallback((box: Box3) => {
    const camera = cameraRef.current;
    if (!camera) return null;
    camera.updateMatrixWorld();
    const size = getCanvasSize();
    const corners = [
      new Vector3(box.min.x, box.min.y, box.min.z),
      new Vector3(box.min.x, box.min.y, box.max.z),
      new Vector3(box.min.x, box.max.y, box.min.z),
      new Vector3(box.min.x, box.max.y, box.max.z),
      new Vector3(box.max.x, box.min.y, box.min.z),
      new Vector3(box.max.x, box.min.y, box.max.z),
      new Vector3(box.max.x, box.max.y, box.min.z),
      new Vector3(box.max.x, box.max.y, box.max.z)
    ];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    corners.forEach((corner) => {
      const projected = corner.project(camera);
      const x = (projected.x * 0.5 + 0.5) * size.width;
      const y = (-projected.y * 0.5 + 0.5) * size.height;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      return null;
    }
    return { minX, minY, maxX, maxY };
  }, [getCanvasSize]);

  const selectMeshesInRect = useCallback((rect: { minX: number; minY: number; maxX: number; maxY: number }, mode: 'add' | 'replace') => {
    const hits: string[] = [];
    meshRegistry.current.forEach((meshes, frameId) => {
      for (const mesh of meshes) {
        mesh.updateWorldMatrix(true, true);
        const box = new Box3().setFromObject(mesh);
        const bounds = projectBoxToScreen(box);
        if (!bounds) continue;
        const intersects = !(bounds.maxX < rect.minX || bounds.minX > rect.maxX || bounds.maxY < rect.minY || bounds.minY > rect.maxY);
        if (intersects) {
          hits.push(frameId);
          break;
        }
      }
    });

    if (hits.length === 0) {
      if (mode === 'replace') {
        clearSelection();
      }
      return;
    }
    if (mode === 'add') {
      setSelection([...selectedIds, ...hits]);
      return;
    }
    setSelection(hits);
  }, [clearSelection, projectBoxToScreen, selectedIds, setSelection]);

  useEffect(() => {
    log('Viewport', `Mounting with tree: ${tree?.name}`);
  }, [tree?.name]);

  // Check WebGL support
  const hasWebGL = useMemo(() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }, []);

  if (!hasWebGL) {
    console.error('[Viewport] WebGL not supported in this environment!');
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a1a1a', color: '#ff4a4a' }}>
        <h3>Error: WebGL Not Supported</h3>
      </div>
    );
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (!(e.shiftKey || e.ctrlKey || e.metaKey)) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const start = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    dragStateRef.current = {
      start,
      mode: e.ctrlKey || e.metaKey || e.shiftKey ? 'add' : 'replace',
      moved: false,
      pointerId: e.pointerId
    };
    setSelectionRect({ start: new Vector3(start.x, start.y, 0), end: new Vector3(start.x, start.y, 0) });
    setIsDraggingSelection(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const distance = Math.hypot(current.x - state.start.x, current.y - state.start.y);
    if (distance > 3) {
      state.moved = true;
    }
    if (state.moved) {
      setSelectionRect({
        start: new Vector3(state.start.x, state.start.y, 0),
        end: new Vector3(current.x, current.y, 0)
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state) return;
    dragStateRef.current = null;
    setIsDraggingSelection(false);
    setSelectionRect(null);
    e.currentTarget.releasePointerCapture(state.pointerId);
    if (!state.moved) {
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const end = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const minX = Math.min(state.start.x, end.x);
    const minY = Math.min(state.start.y, end.y);
    const maxX = Math.max(state.start.x, end.x);
    const maxY = Math.max(state.start.y, end.y);
    selectMeshesInRect({ minX, minY, maxX, maxY }, state.mode);
  };

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: '#1a1a1a', position: 'relative' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <Canvas shadows gl={{ antialias: true }}>
        <PerspectiveCamera ref={cameraRef} makeDefault position={[1, 1, 1]} />
        <OrbitControls makeDefault enabled={!isDraggingSelection} />

        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.0} />
        <axesHelper args={[0.5]} />
        <Grid infiniteGrid sectionSize={0.1} cellSize={0.02} />

        {tree && tree.rootFrame && <RobotMesh frame={tree.rootFrame} registerMesh={registerMesh} visibleIds={visibleIds} />}
        {refGeometry?.map(node => {
          if (hiddenRefIds?.has(node.id)) return null;
          const showOrigin = refOriginVisibility?.[node.id] ?? false;
          return <RefGeometryGlyph key={node.id} node={node} showOrigin={showOrigin} />;
        })}
        <RenderReadbackBridge enabled={import.meta.env.DEV} />
      </Canvas>
      {selectionRect && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(selectionRect.start.x, selectionRect.end.x),
            top: Math.min(selectionRect.start.y, selectionRect.end.y),
            width: Math.abs(selectionRect.end.x - selectionRect.start.x),
            height: Math.abs(selectionRect.end.y - selectionRect.start.y),
            border: '1px dashed rgba(255,255,255,0.6)',
            background: 'rgba(255,255,255,0.1)',
            pointerEvents: 'none'
          }}
        />
      )}
    </div>
  );
};
