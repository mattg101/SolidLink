import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Center } from '@react-three/drei';
import { useSelection } from '../../context/SelectionContext';

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
    };
    links: Array<{
        name: string;
        visuals: GeometryModel[];
    }>;
    children: Frame[];
}

const RobotMesh = ({ frame }: { frame: Frame }) => {
    const { selectedId, setSelectedId, setHoveredId } = useSelection();

    const meshes = useMemo(() => {
        const list: React.ReactNode[] = [];

        if (frame.links.length > 0) {
            console.log(`[Viewport] Processing frame: ${frame.name}, links: ${frame.links.length}`);
        }

        frame.links.forEach((link, lIdx) => {
            link.visuals.forEach((visual, vIdx) => {
                if (visual.type === 'mesh' && visual.meshData) {
                    const { positions, indices } = visual.meshData;
                    console.log(`[Viewport] Mesh for ${frame.name}: ${positions.length / 3} vertices. First vert: ${positions[0]}, ${positions[1]}, ${positions[2]}`);
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
                                />
                                <bufferAttribute
                                    attach="index"
                                    count={indArray.length}
                                    array={indArray}
                                    itemSize={1}
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

    return (
        <group
            position={[frame.localTransform.position[0], frame.localTransform.position[1], frame.localTransform.position[2]]}
            quaternion={[frame.localTransform.rotation[0], frame.localTransform.rotation[1], frame.localTransform.rotation[2], frame.localTransform.rotation[3]]}
        >
            {meshes}
            {frame.children.map(child => (
                <RobotMesh key={child.id} frame={child} />
            ))}
        </group>
    );
};

export const Viewport = ({ tree }: { tree: any }) => {
    console.log('[Viewport] Rendering with tree:', tree?.name);
    return (
        <div style={{ width: '100%', height: '100%', background: '#1a1a1a' }}>
            <Canvas shadows gl={{ antialias: true }}>
                <PerspectiveCamera makeDefault position={[0.5, 0.5, 0.5]} />
                <OrbitControls makeDefault />

                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1.0} castShadow />
                <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={0.5} />

                <axesHelper args={[0.5]} />
                <Grid
                    infiniteGrid
                    fadeDistance={10}
                    fadeStrength={5}
                    sectionSize={0.1}
                    sectionColor="#2a2a2a"
                    cellSize={0.02}
                    cellColor="#3a3a3a"
                />

                <Center>
                    {tree && tree.rootFrame && <RobotMesh frame={tree.rootFrame} />}
                </Center>
            </Canvas>
        </div>
    );
};
