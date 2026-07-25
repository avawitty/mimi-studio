import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const PortraitOrb: React.FC<{ accent: string; secondary: string; seed: number }> = ({
  accent,
  secondary,
  seed,
}) => {
  const ref = useRef<THREE.Mesh>(null);
  const speed = 0.15 + (seed % 10) * 0.02;

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * speed;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh ref={ref} scale={1.1}>
        <icosahedronGeometry args={[1, 1]} />
        <MeshDistortMaterial
          color={accent}
          emissive={secondary}
          emissiveIntensity={0.35}
          distort={0.28 + (seed % 5) * 0.04}
          speed={1.5}
          roughness={0.35}
          metalness={0.15}
        />
      </mesh>
    </Float>
  );
};

export const DollPortraitScene: React.FC<{
  accent: string;
  secondary: string;
  seed: number;
}> = ({ accent, secondary, seed }) => (
  <Canvas dpr={[1, 1.25]} camera={{ position: [0, 0, 3.2], fov: 42 }}>
    <color attach="background" args={["#0a0a0a"]} />
    <ambientLight intensity={0.35} />
    <pointLight position={[2, 2, 2]} intensity={1.2} color={accent} />
    <pointLight position={[-2, -1, 1]} intensity={0.4} color={secondary} />
    <PortraitOrb accent={accent} secondary={secondary} seed={seed} />
    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
  </Canvas>
);
