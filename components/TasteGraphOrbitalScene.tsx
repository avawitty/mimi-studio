import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Stars } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";
import type { TasteGraphNode } from "../types";

interface ArtifactDatum {
  id: string;
  label: string;
  position: [number, number, number];
  distance: number;
  orbitRadius: number;
  orbitSpeed: number;
  color: string;
}

interface ClusterDatum {
  id: string;
  label: string;
  position: [number, number, number];
  artifactCount: number;
  color: string;
  orbitRadius: number;
}

interface GraphNodeDatum {
  node: TasteGraphNode;
  position: [number, number, number];
  color: string;
}

interface TasteGraphOrbitalSceneProps {
  centerOfGravity: number[] | null;
  artifacts: ArtifactDatum[];
  clusters: ClusterDatum[];
  graphNodes: GraphNodeDatum[];
  isDark: boolean;
  onSelectNode?: (node: TasteGraphNode) => void;
}

const CenterOfGravityCore: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.3;
      ref.current.rotation.x += delta * 0.1;
    }
  });
  return (
    <group>
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial
          color={isDark ? "#a8b79f" : "#10b981"}
          emissive={isDark ? "#065f46" : "#047857"}
          emissiveIntensity={0.6}
          wireframe
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color={isDark ? "#ecfdf5" : "#6ee7b7"} />
      </mesh>
      <Html center distanceFactor={12}>
        <div className="font-mono text-[7px] uppercase tracking-[0.3em] text-emerald-400/70 pointer-events-none whitespace-nowrap">
          Center of Gravity
        </div>
      </Html>
    </group>
  );
};

const OrbitingArtifact: React.FC<{ data: ArtifactDatum; index: number }> = ({
  data,
  index,
}) => {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const phase = index * 0.7;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * data.orbitSpeed + phase;
    ref.current.position.x = Math.cos(t) * data.orbitRadius + data.position[0] * 0.3;
    ref.current.position.y = data.position[1] * 0.5 + Math.sin(t * 0.5) * 0.4;
    ref.current.position.z = Math.sin(t) * data.orbitRadius + data.position[2] * 0.3;
  });

  return (
    <group
      ref={ref}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh>
        <sphereGeometry args={[hovered ? 0.14 : 0.08, 12, 12]} />
        <meshBasicMaterial color={data.color} transparent opacity={hovered ? 1 : 0.7} />
      </mesh>
      <AnimatePresence>
        {hovered && (
          <Html distanceFactor={14}>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="bg-stone-900/90 border border-emerald-500/30 px-2 py-1 backdrop-blur-md pointer-events-none max-w-[140px]"
            >
              <p className="font-serif italic text-[10px] text-white leading-tight line-clamp-2">
                {data.label}
              </p>
            </motion.div>
          </Html>
        )}
      </AnimatePresence>
    </group>
  );
};

const ClusterRing: React.FC<{ data: ClusterDatum; index: number }> = ({ data, index }) => {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * (0.08 + index * 0.02);
    ref.current.position.set(data.position[0], data.position[1], data.position[2]);
  });

  return (
    <group
      ref={ref}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[data.orbitRadius * 0.35, 0.02, 8, 48]} />
        <meshBasicMaterial color={data.color} transparent opacity={hovered ? 0.9 : 0.35} />
      </mesh>
      <mesh position={[data.orbitRadius * 0.35, 0, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial
          color={data.color}
          emissive={data.color}
          emissiveIntensity={hovered ? 0.8 : 0.3}
        />
      </mesh>
      <AnimatePresence>
        {hovered && (
          <Html position={[0, 0.8, 0]} center distanceFactor={14}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-stone-900/90 border border-purple-500/30 px-2 py-1 backdrop-blur-md pointer-events-none"
            >
              <p className="font-serif italic text-[10px] text-white">{data.label}</p>
              <p className="font-mono text-[7px] text-purple-300 uppercase tracking-wider">
                {data.artifactCount} artifacts
              </p>
            </motion.div>
          </Html>
        )}
      </AnimatePresence>
    </group>
  );
};

const GraphNodeMarker: React.FC<{
  data: GraphNodeDatum;
  onSelect?: (node: TasteGraphNode) => void;
}> = ({ data, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <group
      position={data.position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(data.node);
      }}
    >
      <mesh>
        <boxGeometry args={[0.15, 0.15, 0.15]} />
        <meshStandardMaterial
          color={data.color}
          emissive={data.color}
          emissiveIntensity={hovered ? 0.6 : 0.2}
        />
      </mesh>
      {hovered && (
        <Html distanceFactor={12}>
          <div className="font-mono text-[8px] uppercase tracking-wider text-white/80 pointer-events-none whitespace-nowrap">
            {data.node.label}
          </div>
        </Html>
      )}
    </group>
  );
};

export const TasteGraphOrbitalScene: React.FC<TasteGraphOrbitalSceneProps> = ({
  artifacts,
  clusters,
  graphNodes,
  isDark,
  onSelectNode,
}) => {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [12, 8, 12], fov: 45 }}>
      <color attach="background" args={[isDark ? "#070707" : "#0a0a0a"]} />
      <ambientLight intensity={0.25} />
      <pointLight position={[8, 10, 8]} intensity={1.2} color={isDark ? "#a8b79f" : "#6ee7b7"} />
      <pointLight position={[-6, -4, -6]} intensity={0.4} color="#8b5cf6" />
      <Stars radius={60} depth={30} count={2000} factor={3} saturation={0} fade speed={0.5} />
      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        autoRotate
        autoRotateSpeed={0.35}
        minDistance={4}
        maxDistance={28}
      />

      <CenterOfGravityCore isDark={isDark} />

      {clusters.map((c, i) => (
        <ClusterRing key={c.id} data={c} index={i} />
      ))}

      {artifacts.map((a, i) => (
        <OrbitingArtifact key={a.id} data={a} index={i} />
      ))}

      {graphNodes.map((g) => (
        <GraphNodeMarker key={g.node.id} data={g} onSelect={onSelectNode} />
      ))}
    </Canvas>
  );
};
