import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
import type { MemoryAtom } from "../../types";
import type { ScribeThreadEdge, ScribeThreadNode } from "../../lib/scribeThreadGraph";

interface ScribeThreadSceneProps {
  nodes: ScribeThreadNode[];
  edges: ScribeThreadEdge[];
  selectedId?: string | null;
  onSelectAtom?: (atom: MemoryAtom) => void;
}

const MemoryCore: React.FC = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.25;
  });
  return (
    <group>
      <mesh ref={ref}>
        <octahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial color="#ecfdf5" emissive="#065f46" emissiveIntensity={0.5} wireframe />
      </mesh>
      <Html center distanceFactor={14}>
        <p className="font-mono text-[6px] uppercase tracking-[0.35em] text-emerald-400/80 pointer-events-none whitespace-nowrap">
          Memory reservoir
        </p>
      </Html>
    </group>
  );
};

const ThreadNode: React.FC<{
  data: ScribeThreadNode;
  selected: boolean;
  onSelect?: (atom: MemoryAtom) => void;
  index: number;
}> = ({ data, selected, onSelect, index }) => {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const phase = index * 0.55;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * data.orbitSpeed + phase;
    const [bx, by, bz] = data.position;
    ref.current.position.x = bx + Math.cos(t) * data.orbitRadius * 0.35;
    ref.current.position.y = by + Math.sin(t * 0.7) * 0.25;
    ref.current.position.z = bz + Math.sin(t) * data.orbitRadius * 0.35;
  });

  const active = hovered || selected;

  return (
    <group
      ref={ref}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(data.atom);
      }}
    >
      <mesh>
        <sphereGeometry args={[active ? 0.16 : 0.1, 14, 14]} />
        <meshStandardMaterial
          color={data.color}
          emissive={data.color}
          emissiveIntensity={active ? 0.85 : 0.35}
        />
      </mesh>
      <AnimatePresence>
        {active && (
          <Html distanceFactor={14}>
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="bg-stone-950/95 border border-emerald-500/25 px-2 py-1.5 backdrop-blur-md pointer-events-none max-w-[160px]"
            >
              <p className="font-serif italic text-[10px] text-white leading-snug line-clamp-2">
                {data.atom.title || data.atom.content.slice(0, 48)}
              </p>
              <p className="font-mono text-[6px] text-stone-400 uppercase tracking-wider mt-0.5">
                {data.atom.projectId}
              </p>
            </motion.div>
          </Html>
        )}
      </AnimatePresence>
    </group>
  );
};

const ThreadEdges: React.FC<{
  edges: ScribeThreadEdge[];
  nodeById: Map<string, ScribeThreadNode>;
}> = ({ edges, nodeById }) => (
  <>
    {edges.map((edge) => {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      if (!from || !to) return null;
      return (
        <Line
          key={edge.id}
          points={[from.position, to.position]}
          color="#525252"
          lineWidth={1}
          transparent
          opacity={0.35}
        />
      );
    })}
  </>
);

export const ScribeThreadScene: React.FC<ScribeThreadSceneProps> = ({
  nodes,
  edges,
  selectedId,
  onSelectAtom,
}) => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [10, 6, 10], fov: 42 }}>
      <color attach="background" args={["#050505"]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[6, 8, 6]} intensity={1.1} color="#a8b79f" />
      <pointLight position={[-5, -3, -4]} intensity={0.35} color="#8b5cf6" />
      <Stars radius={50} depth={24} count={1200} factor={2.5} saturation={0} fade speed={0.4} />
      <OrbitControls
        enableDamping
        dampingFactor={0.07}
        autoRotate
        autoRotateSpeed={0.28}
        minDistance={3}
        maxDistance={22}
      />
      <MemoryCore />
      <ThreadEdges edges={edges} nodeById={nodeById} />
      {nodes.map((node, index) => (
        <ThreadNode
          key={node.id}
          data={node}
          index={index}
          selected={selectedId === node.id}
          onSelect={onSelectAtom}
        />
      ))}
    </Canvas>
  );
};
