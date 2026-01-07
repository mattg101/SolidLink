/**
 * Viewport component for rendering 3D robot models using React Three Fiber.
 * Transforms are applied using absolute positioning from SolidWorks assembly data.
 */
import React, { useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei';
import { Matrix4, Vector3, Quaternion, Euler } from 'three';
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

const RobotMesh = ({ frame }: { frame: Frame }) => {
  const { selectedId, setSelectedId, setHoveredId } = useSelection();

  useEffect(() => {
    if (frame.links && frame.links.length > 0) {
      log('Viewport', `Rendering ${frame.name}`);
    }
  }, [frame.id]);

  const meshes = useMemo(() => {
    const list: React.ReactNode[] = [];
    if (!frame.links) return list;

    frame.links.forEach((link, lIdx) => {
      if (!link.visuals) return;
      link.visuals.forEach((visual, vIdx) => {
        if (visual.type === 'mesh' && visual.meshData) {
          const { positions, indices } = visual.meshData;

          if (lIdx === 0 && vIdx === 0) {
            log('Viewport', `Mesh: ${positions.length / 3} verts`);
          }

          const posArray = new Float32Array(positions);
          const indArray = new Uint32Array(indices);

          const isSelected = selectedId === frame.id;

          list.push(
            <mesh
              key={`${frame.id}-link-${lIdx}-vis-${vIdx}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(frame.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredId(frame.id);
              }}
              onPointerOut={() => setHoveredId(null)}
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
                color={isSelected ? '#4a9eff' : `rgb(${visual.color[0] * 255}, ${visual.color[1] * 255}, ${visual.color[2] * 255})`}
                metalness={0.5}
                roughness={0.5}
                transparent={true}
                opacity={isSelected ? 0.9 : 1.0}
                emissive={isSelected ? '#4a9eff' : '#000000'}
                emissiveIntensity={isSelected ? 0.2 : 0}
              />
            </mesh>
          );
        }
      });
    });

    return list;
  }, [frame, selectedId, setSelectedId, setHoveredId]);

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
      <group position={position} quaternion={quaternion}>
        {meshes}
      </group>
      {/* Render all descendants at root level (not nested) since transforms are absolute */}
      {allDescendants.map(child => (
        <RobotMeshFlat key={child.id} frame={child} />
      ))}
    </>
  );
};

// Flat version that doesn't recurse - just renders one frame with its meshes
const RobotMeshFlat = ({ frame }: { frame: Frame }) => {
  const { selectedId, setSelectedId, setHoveredId } = useSelection();

  const meshes = useMemo(() => {
    const list: React.ReactNode[] = [];
    if (!frame.links) return list;

    frame.links.forEach((link, lIdx) => {
      if (!link.visuals) return;
      link.visuals.forEach((visual, vIdx) => {
        if (visual.type === 'mesh' && visual.meshData) {
          const { positions, indices } = visual.meshData;
          const posArray = new Float32Array(positions);
          const indArray = new Uint32Array(indices);
          const isSelected = selectedId === frame.id;

          list.push(
            <mesh
              key={`${frame.id}-link-${lIdx}-vis-${vIdx}`}
              onClick={(e) => { e.stopPropagation(); setSelectedId(frame.id); }}
              onPointerOver={(e) => { e.stopPropagation(); setHoveredId(frame.id); }}
              onPointerOut={() => setHoveredId(null)}
            >
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={posArray.length / 3} array={posArray} itemSize={3} args={[posArray, 3]} />
                <bufferAttribute attach="index" count={indArray.length} array={indArray} itemSize={1} args={[indArray, 1]} />
              </bufferGeometry>
              <meshStandardMaterial
                color={isSelected ? '#4a9eff' : `rgb(${visual.color[0] * 255}, ${visual.color[1] * 255}, ${visual.color[2] * 255})`}
                metalness={0.5} roughness={0.5} transparent opacity={isSelected ? 0.9 : 1.0}
                emissive={isSelected ? '#4a9eff' : '#000000'} emissiveIntensity={isSelected ? 0.2 : 0}
              />
            </mesh>
          );
        }
      });
    });
    return list;
  }, [frame, selectedId, setSelectedId, setHoveredId]);

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

  if (meshes.length === 0) return null;

  return (
    <group position={position} quaternion={quaternion}>
      {meshes}
    </group>
  );
};

export const Viewport = ({ tree }: { tree: any }) => {
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

  return (
    <div style={{ width: '100%', height: '100%', background: '#1a1a1a', position: 'relative' }}>
      <Canvas shadows gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[1, 1, 1]} />
        <OrbitControls makeDefault />

        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.0} />
        <axesHelper args={[0.5]} />
        <Grid infiniteGrid sectionSize={0.1} cellSize={0.02} />

        {tree && tree.rootFrame && <RobotMesh frame={tree.rootFrame} />}
      </Canvas>
    </div>
  );
};
