
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial, Float, PerspectiveCamera, OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { fetchAllPublicProfiles } from '../services/firebaseUtils';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { VisionClipProjections } from './VisionClipProjections';

const UserStar = ({ profile, position }: { profile: UserProfile, position: [number, number, number] }) => {
 const [hovered, setHovered] = useState(false);
 const meshRef = useRef<THREE.Mesh>(null);

 return (
 <group position={position}>
 <mesh
 ref={meshRef}
 onPointerOver={() => setHovered(true)}
 onPointerOut={() => setHovered(false)}
 >
 <sphereGeometry args={[0.1, 16, 16]} />
 <meshBasicMaterial color={hovered ?"#00FF00":"#FFFFFF"} transparent opacity={0.8} />
 </mesh>
 
 <AnimatePresence>
 {hovered && (
 <Html distanceFactor={10}>
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 10 }}
 className="bg border border-nous-border p-3 backdrop-blur-xl text-nous-subtle min-w-[150px] pointer-events-none"
 >
 <div className="text-xs font-mono opacity-50 uppercase tracking-widest mb-1">Aesthetic Frequency</div>
 <div className="text-sm font-medium mb-2">@{profile.handle || 'anonymous'}</div>
 <div className="flex flex-wrap gap-1">
 {Object.entries(profile.tasteVector || {})
 .sort((a, b) => b[1] - a[1])
 .slice(0, 3)
 .map(([tag]) => (
 <span key={tag} className="text-[9px] font-mono uppercase tracking-widest bg-transparent border border-nous-border px-1.5 py-0.5 text-nous-subtle">
 {tag}
 </span>
 ))}
 </div>
 </motion.div>
 </Html>
 )}
 </AnimatePresence>
 </group>
 );
};

const Constellation = () => {
 const [profiles, setProfiles] = useState<UserProfile[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const load = async () => {
 try {
 const all = await fetchAllPublicProfiles();
 setProfiles(all);
 } catch (e) {
 console.error("MIMI // Failed to load profiles:", e);
 } finally {
 setLoading(false);
 }
 };
 load();
 }, []);

 const starData = useMemo(() => {
 return profiles.map(p => {
 const vector = p.tasteVector || {};
 let x = 0, y = 0, z = 0;
 
 // Map tags to axes
 Object.entries(vector).forEach(([tag, weight]) => {
 const lowerTag = tag.toLowerCase();
 if (['brutalist', 'structured', 'industrial', 'dark', 'geometric'].includes(lowerTag)) {
 x += weight * 10;
 } else if (['ethereal', 'fluid', 'soft', 'organic', 'gothic'].includes(lowerTag)) {
 y += weight * 10;
 } else if (['minimal', 'minimalist', 'clean', 'vintage', 'retro'].includes(lowerTag)) {
 z += weight * 10;
 } else {
 // Default distribution for unknown tags
 x += weight * 2;
 y += weight * 2;
 z += weight * 2;
 }
 });
 
 // Fallback to archetype weights if tasteVector is empty
 if (x === 0 && y === 0 && z === 0) {
 const weights = p.tasteProfile?.archetype_weights || {};
 x = (weights['Architect'] || 0) * 10;
 y = (weights['Dreamer'] || 0) * 10;
 z = (weights['Archivist'] || 0) * 10;
 }
 
 // Add jitter
 const jitter = () => (Math.random() - 0.5) * 5;
 
 return {
 profile: p,
 position: [x + jitter(), y + jitter(), z + jitter()] as [number, number, number]
 };
 });
 }, [profiles]);

 if (loading) return null;

 return (
 <>
 {starData.map((data, i) => (
 <UserStar key={data.profile.uid || i} profile={data.profile} position={data.position} />
 ))}
 
 {/* Visual Axis Labels */}
 <group>
 <Html position={[12, 0, 0]} center>
 <div className="text-white/50 font-mono text-xs uppercase tracking-widest pointer-events-none">ARCHITECT</div>
 </Html>
 <Html position={[0, 12, 0]} center>
 <div className="text-white/50 font-mono text-xs uppercase tracking-widest pointer-events-none">DREAMER</div>
 </Html>
 <Html position={[0, 0, 12]} center>
 <div className="text-white/50 font-mono text-xs uppercase tracking-widest pointer-events-none">ARCHIVIST</div>
 </Html>
 </group>
 </>
 );
};

export const LatentConstellation = () => {
  const [subMode, setSubMode] = useState<'3d' | '2d_clip'>('3d');

  return (
    <div className="w-full h-full bg-[#FCFCFA] dark:bg-[#070707] relative overflow-hidden flex flex-col min-h-[500px]">
      {/* Header Controls */}
      <div className="p-6 pb-3 z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-nous-border/40 bg-zinc-500/5 select-none font-mono">
        <div>
          <h2 className="text-[#141414] dark:text-white font-[Cormorant] italic font-bold text-xl md:text-2xl tracking-[0.1em]">The Latent Constellation</h2>
          <p className="text-stone-500 dark:text-stone-400 text-[9px] mt-1 uppercase tracking-widest leading-none font-extrabold">✥ Aesthetic Curation & Multi-Dimensional Latent Systems</p>
        </div>

        {/* Dynamic Mode Switcher */}
        <div className="flex gap-2 border border-nous-border bg-stone-500/5 p-0.5 text-[9px]">
          <button
            onClick={() => setSubMode('3d')}
            className={`px-3 py-1.5 font-sans font-black uppercase tracking-widest transition-all rounded-none ${
              subMode === '3d'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-black shadow-sm font-black'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            3D Resonance Space
          </button>
          <button
            onClick={() => setSubMode('2d_clip')}
            className={`px-3 py-1.5 font-sans font-black uppercase tracking-widest transition-all rounded-none ${
              subMode === '2d_clip'
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-black shadow-sm font-black'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            2D Vision Projection
          </button>
        </div>
      </div>

      <div className="flex-1 relative w-full h-full min-h-[420px]">
        {subMode === '3d' ? (
          <div className="w-full h-full bg-black relative min-h-[420px]">
            <Canvas shadows dpr={[1, 2]}>
              <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={50} />
              <OrbitControls enableDamping dampingFactor={0.05} autoRotate autoRotateSpeed={0.5} />
              <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
              
              <ambientLight intensity={0.2} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              
              <Constellation />
            </Canvas>
            
            <div className="absolute bottom-6 right-6 z-10 flex flex-col items-end pointer-events-none select-none">
              <div className="text-[8px] text-white/40 uppercase tracking-[0.3em] mb-3 font-bold">Navigation: Orbit & Zoom / Hover Point</div>
              <div className="flex gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-nous-base border border-white/20"/>
                  <span className="text-[8px] font-mono text-white/50 uppercase tracking-widest font-bold">User Specimen</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-stone-300"/>
                  <span className="text-[8px] font-mono text-white/50 uppercase tracking-widest font-bold">Aesthetic Weight</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full p-4 md:p-6 bg-transparent">
            <VisionClipProjections />
          </div>
        )}
      </div>
    </div>
  );
};

export default LatentConstellation;
