import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import * as THREE from 'three';
import { Palette, Sliders, Wand2, Save } from 'lucide-react';
import type { Doll } from '../../types';
import {
  deriveProceduralAesthetic,
  type ProceduralDollAesthetic,
} from '../../services/dollEngine';

export interface ProceduralDollStudioProps {
  /** When set, dresser initializes from this Doll projection. */
  boundDoll?: Doll | null;
  onAestheticCommit?: (aesthetic: ProceduralDollAesthetic) => void;
  headerLabel?: string;
}

// Custom Vertex and Fragment Shaders for the high-fidelity, shader-animated doll
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;
  uniform float uWarpSpeed;
  uniform float uWarpIntensity;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Wave-based procedural vertex deformation
    vec3 pos = position;
    float waveX = sin(pos.y * 3.0 + uTime * uWarpSpeed) * uWarpIntensity;
    float waveZ = cos(pos.y * 2.5 + uTime * uWarpSpeed) * uWarpIntensity;
    
    // Deform lower parts of the dress/gown more dynamically
    float factor = (1.0 - uv.y); 
    pos.x += waveX * factor;
    pos.z += waveZ * factor;

    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  uniform sampler2D uTexture;
  uniform float uGlossiness;

  void main() {
    // Sample the procedurally generated texture
    vec4 texColor = texture2D(uTexture, vUv);
    
    // Compute dynamic Fresnel glowing edge reflection
    float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
    
    // Pulse animation based on time and height
    float pulse = sin(uTime * 2.0 + vPosition.y * 4.0) * 0.15 + 0.85;
    
    // Combine base texture with interactive accent lights
    vec3 baseColor = mix(uSecondaryColor, texColor.rgb, texColor.a);
    vec3 specular = vec3(fresnel) * uGlossiness * uPrimaryColor;
    vec3 finalColor = baseColor + specular * pulse;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Doll meshes rendering component
const DollMesh: React.FC<{
  primaryColor: string;
  secondaryColor: string;
  textureCanvas: HTMLCanvasElement | null;
  warpSpeed: number;
  warpIntensity: number;
  glossiness: number;
  accessoryMode: string;
}> = ({ primaryColor, secondaryColor, textureCanvas, warpSpeed, warpIntensity, glossiness, accessoryMode }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);

  // Set up custom shader materials
  const uniforms = useMemo(() => {
    return {
      uTime: { value: 0 },
      uWarpSpeed: { value: warpSpeed },
      uWarpIntensity: { value: warpIntensity },
      uPrimaryColor: { value: new THREE.Color(primaryColor) },
      uSecondaryColor: { value: new THREE.Color(secondaryColor) },
      uTexture: { value: new THREE.Texture() },
      uGlossiness: { value: glossiness }
    };
  }, [primaryColor, secondaryColor, warpSpeed, warpIntensity, glossiness]);

  // Update canvas texture whenever textureCanvas changes
  useEffect(() => {
    if (textureCanvas && uniforms.uTexture.value) {
      const tex = new THREE.CanvasTexture(textureCanvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      uniforms.uTexture.value = tex;
    }
  }, [textureCanvas, uniforms]);

  // Animate elements inside the frame
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    uniforms.uTime.value = time;

    // Body slow breathing rotation
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(time * 0.2) * 0.1;
    }

    // Floating head animation
    if (headRef.current) {
      headRef.current.position.y = 1.25 + Math.sin(time * 1.5) * 0.03;
      headRef.current.rotation.y = Math.sin(time * 0.5) * 0.08;
    }

    // Glowing halo slow spinning and pulsing
    if (haloRef.current) {
      haloRef.current.position.y = 1.35 + Math.sin(time * 1.5) * 0.03;
      haloRef.current.rotation.z = time * 0.5;
      haloRef.current.rotation.x = Math.PI / 2 + Math.sin(time * 0.8) * 0.1;
    }

    // Soft arm swaying
    if (leftArmRef.current) {
      leftArmRef.current.rotation.z = -Math.PI / 6 + Math.sin(time * 1.2) * 0.08;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.z = Math.PI / 6 - Math.sin(time * 1.2) * 0.08;
    }
  });

  return (
    <group position={[0, -0.6, 0]}>
      {/* 1. Gown / Torso (Shader-deformed cylinder) */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.75, 1.8, 32, 16]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
        />
      </mesh>

      {/* 2. Abstract Head */}
      <mesh ref={headRef} position={[0, 1.25, 0]}>
        <sphereGeometry args={[0.24, 32, 32]} />
        <meshPhysicalMaterial
          color={primaryColor}
          roughness={0.1}
          metalness={0.9}
          clearcoat={1.0}
        />
      </mesh>

      {/* 3. Floating Halo (Procedural accessory) */}
      {accessoryMode !== 'none' && (
        <mesh ref={haloRef} position={[0, 1.35, 0]}>
          <torusGeometry args={[0.38, 0.02, 16, 100]} />
          <meshBasicMaterial
            color={accessoryMode === 'halo' ? primaryColor : '#ffffff'}
            wireframe={accessoryMode === 'crown'}
          />
        </mesh>
      )}

      {/* 4. Left Arm */}
      <mesh ref={leftArmRef} position={[-0.45, 0.4, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <capsuleGeometry args={[0.06, 0.6, 8, 16]} />
        <meshPhysicalMaterial
          color={secondaryColor}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {/* 5. Right Arm */}
      <mesh ref={rightArmRef} position={[0.45, 0.4, 0]} rotation={[0, 0, Math.PI / 6]}>
        <capsuleGeometry args={[0.06, 0.6, 8, 16]} />
        <meshPhysicalMaterial
          color={secondaryColor}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
};

// Main procedural doll studio view — bound to Taste Graph Doll when provided
export const ProceduralDollStudio: React.FC<ProceduralDollStudioProps> = ({
  boundDoll = null,
  onAestheticCommit,
  headerLabel,
}) => {
  const [pattern, setPattern] = useState<string>(() => localStorage.getItem('mimi_doll_pattern') || 'ripples');
  const [primaryColor, setPrimaryColor] = useState<string>(() => localStorage.getItem('mimi_doll_primaryColor') || '#9d62f2');
  const [secondaryColor, setSecondaryColor] = useState<string>(() => localStorage.getItem('mimi_doll_secondaryColor') || '#131313');
  const [complexity, setComplexity] = useState<number>(() => {
    const v = localStorage.getItem('mimi_doll_complexity');
    return v ? parseInt(v, 10) : 5;
  });
  const [warpSpeed, setWarpSpeed] = useState<number>(() => {
    const v = localStorage.getItem('mimi_doll_warpSpeed');
    return v ? parseFloat(v) : 1.2;
  });
  const [warpIntensity, setWarpIntensity] = useState<number>(() => {
    const v = localStorage.getItem('mimi_doll_warpIntensity');
    return v ? parseFloat(v) : 0.12;
  });
  const [glossiness, setGlossiness] = useState<number>(() => {
    const v = localStorage.getItem('mimi_doll_glossiness');
    return v ? parseFloat(v) : 0.8;
  });
  const [accessoryMode, setAccessoryMode] = useState<string>(() => localStorage.getItem('mimi_doll_accessoryMode') || 'halo');
  const [dirty, setDirty] = useState(false);

  const applyAesthetic = useCallback((aesthetic: ProceduralDollAesthetic) => {
    setPattern(aesthetic.pattern);
    setPrimaryColor(aesthetic.primaryColor);
    setSecondaryColor(aesthetic.secondaryColor);
    setComplexity(aesthetic.complexity);
    setWarpSpeed(aesthetic.warpSpeed);
    setWarpIntensity(aesthetic.warpIntensity);
    setGlossiness(aesthetic.glossiness);
    setAccessoryMode(aesthetic.accessoryMode);
  }, []);

  // Re-derive from bound Doll when selection changes
  useEffect(() => {
    if (!boundDoll) return;
    applyAesthetic(deriveProceduralAesthetic(boundDoll));
    setDirty(false);
  }, [boundDoll?.id, boundDoll?.updatedAt, applyAesthetic, boundDoll]);

  // Synchronize design parameters with local storage to persist doll across navigation
  useEffect(() => {
    localStorage.setItem('mimi_doll_pattern', pattern);
    localStorage.setItem('mimi_doll_primaryColor', primaryColor);
    localStorage.setItem('mimi_doll_secondaryColor', secondaryColor);
    localStorage.setItem('mimi_doll_complexity', String(complexity));
    localStorage.setItem('mimi_doll_warpSpeed', String(warpSpeed));
    localStorage.setItem('mimi_doll_warpIntensity', String(warpIntensity));
    localStorage.setItem('mimi_doll_glossiness', String(glossiness));
    localStorage.setItem('mimi_doll_accessoryMode', accessoryMode);
  }, [pattern, primaryColor, secondaryColor, complexity, warpSpeed, warpIntensity, glossiness, accessoryMode]);

  const currentAesthetic = useCallback((): ProceduralDollAesthetic => ({
    pattern: pattern as ProceduralDollAesthetic['pattern'],
    primaryColor,
    secondaryColor,
    complexity,
    warpSpeed,
    warpIntensity,
    glossiness,
    accessoryMode: accessoryMode as ProceduralDollAesthetic['accessoryMode'],
    userLocked: true,
    updatedAt: Date.now(),
  }), [pattern, primaryColor, secondaryColor, complexity, warpSpeed, warpIntensity, glossiness, accessoryMode]);

  const markDirty = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>) => {
    return (value: T | ((prev: T) => T)) => {
      setDirty(true);
      setter(value);
    };
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [textureCanvas, setTextureCanvas] = useState<HTMLCanvasElement | null>(null);

  // Generate the 2D procedural canvas texture whenever parameters change
  useEffect(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background base
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = primaryColor;
    ctx.strokeStyle = primaryColor;

    if (pattern === 'ripples') {
      ctx.lineWidth = 3 + complexity;
      for (let i = 0; i < size * 1.5; i += 32 - complexity * 1.5) {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, i, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (pattern === 'grid') {
      const spacing = 48 - complexity * 3;
      ctx.lineWidth = 2;
      for (let x = 0; x < size; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
      }
      for (let y = 0; y < size; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
      }
    } else if (pattern === 'marble') {
      ctx.lineWidth = 4 + complexity / 2;
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (i * size) / 10);
        ctx.bezierCurveTo(
          size / 3,
          Math.sin(i + 1) * size,
          (2 * size) / 3,
          Math.cos(i) * size,
          size,
          (i * size) / 10 + Math.sin(i) * 50
        );
        ctx.stroke();
      }
    } else if (pattern === 'halftone') {
      const r = 4 + complexity;
      const spacing = 24;
      for (let x = spacing / 2; x < size; x += spacing) {
        for (let y = spacing / 2; y < size; y += spacing) {
          const dist = Math.sqrt(Math.pow(x - size / 2, 2) + Math.pow(y - size / 2, 2));
          const sizeMult = Math.max(0.1, 1.0 - dist / (size * 0.7));
          ctx.beginPath();
          ctx.arc(x, y, r * sizeMult, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    setTextureCanvas(canvas);
  }, [pattern, primaryColor, secondaryColor, complexity]);

  // Presets trigger function
  const applyPreset = (presetName: string) => {
    setDirty(true);
    if (presetName === 'cyberpunk') {
      setPattern('grid');
      setPrimaryColor('#00f0ff');
      setSecondaryColor('#140026');
      setComplexity(7);
      setWarpSpeed(2.0);
      setWarpIntensity(0.18);
      setGlossiness(1.0);
      setAccessoryMode('halo');
    } else if (presetName === 'witchcore') {
      setPattern('marble');
      setPrimaryColor('#2d9a6c');
      setSecondaryColor('#15111b');
      setComplexity(6);
      setWarpSpeed(0.6);
      setWarpIntensity(0.08);
      setGlossiness(0.4);
      setAccessoryMode('crown');
    } else if (presetName === 'minimalist') {
      setPattern('ripples');
      setPrimaryColor('#dbd1c1');
      setSecondaryColor('#1d1d1b');
      setComplexity(2);
      setWarpSpeed(0.8);
      setWarpIntensity(0.04);
      setGlossiness(0.2);
      setAccessoryMode('none');
    } else if (presetName === 'royal') {
      setPattern('halftone');
      setPrimaryColor('#e1ad01');
      setSecondaryColor('#2a1140');
      setComplexity(8);
      setWarpSpeed(1.4);
      setWarpIntensity(0.15);
      setGlossiness(0.9);
      setAccessoryMode('halo');
    }
  };

  const handleCommit = () => {
    const aesthetic = currentAesthetic();
    onAestheticCommit?.(aesthetic);
    setDirty(false);
  };

  const handleResetToDoll = () => {
    if (boundDoll) {
      applyAesthetic(deriveProceduralAesthetic({ ...boundDoll, proceduralAesthetic: undefined }));
      setDirty(true);
      return;
    }
    setPattern('ripples');
    setPrimaryColor('#9d62f2');
    setSecondaryColor('#131313');
    setComplexity(5);
    setWarpSpeed(1.2);
    setWarpIntensity(0.12);
    setGlossiness(0.8);
    setAccessoryMode('halo');
    setDirty(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[650px] min-h-0 bg-stone-950 text-stone-100 p-4 border border-stone-800 rounded-none">
      {/* Three.js 3D Viewer Panel */}
      <div className="lg:col-span-7 relative h-full bg-stone-900 border border-stone-800 overflow-hidden">
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-purple-400 bg-purple-950/80 px-2 py-1">
            {boundDoll ? 'Bound Projection' : 'Realtime Shader'}
          </span>
          <span className="font-serif italic text-sm text-stone-300">
            {headerLabel || (boundDoll ? boundDoll.name : 'Procedural Doll Curation')}
          </span>
        </div>

        <Canvas camera={{ position: [0, 0, 3.2], fov: 40 }} dpr={[1, 1.5]}>
          <color attach="background" args={['#0c0c0e']} />
          <ambientLight intensity={0.2} />
          <pointLight position={[3, 4, 3]} intensity={1.5} color={primaryColor} />
          <pointLight position={[-3, -2, 2]} intensity={0.5} color={secondaryColor} />
          <pointLight position={[0, 0, -2]} intensity={0.3} color="#ffffff" />
          
          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
            <DollMesh
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              textureCanvas={textureCanvas}
              warpSpeed={warpSpeed}
              warpIntensity={warpIntensity}
              glossiness={glossiness}
              accessoryMode={accessoryMode}
            />
          </Float>
          <OrbitControls enableZoom={true} enablePan={false} maxDistance={6} minDistance={2} />
        </Canvas>

        {/* Dynamic micro-details to highlight craftsmanship */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-stone-400 font-mono text-[8px] tracking-wider pointer-events-none">
          <span>LATENT SHADER WARP: {(warpSpeed * warpIntensity).toFixed(3)}</span>
          <span>ROUGHNESS INVERSE: {glossiness.toFixed(2)}</span>
        </div>
      </div>

      {/* Real-time Dressing & Procedural Styling Customizer Panel */}
      <div className="lg:col-span-5 flex flex-col justify-between h-full bg-stone-900/40 p-5 border border-stone-800/80 overflow-y-auto">
        <div className="space-y-6">
          <div className="border-b border-stone-800 pb-4">
            <h2 className="font-sans text-xs uppercase tracking-[0.3em] font-semibold text-stone-200 flex items-center gap-2">
              <Wand2 size={13} className="text-purple-400" /> Aesthetic Dresser
            </h2>
            <p className="text-[10px] text-stone-400 mt-1">
              {boundDoll
                ? `Driven by Doll projection “${boundDoll.name}” — palette, materials, and motifs map into the shader pipeline. Save to persist on the Doll record.`
                : 'Select designer presets or map custom vector waveforms. Bind a Tailor Doll from the chamber to sync with the Taste Graph.'}
            </p>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-[8px] uppercase tracking-widest text-stone-400 font-semibold mb-2">
              DESIGNER PRESETS
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => applyPreset('cyberpunk')}
                className="px-3 py-1.5 border border-purple-900/60 bg-purple-950/20 hover:bg-purple-950/40 font-mono text-[9px] text-purple-300 text-left transition-all"
              >
                ✦ Cyberpunk
              </button>
              <button
                onClick={() => applyPreset('witchcore')}
                className="px-3 py-1.5 border border-emerald-900/60 bg-emerald-950/20 hover:bg-emerald-950/40 font-mono text-[9px] text-emerald-300 text-left transition-all"
              >
                ✦ Witchcore
              </button>
              <button
                onClick={() => applyPreset('minimalist')}
                className="px-3 py-1.5 border border-stone-700 bg-stone-800/20 hover:bg-stone-800/40 font-mono text-[9px] text-stone-300 text-left transition-all"
              >
                ✦ Minimalist
              </button>
              <button
                onClick={() => applyPreset('royal')}
                className="px-3 py-1.5 border border-yellow-900/60 bg-yellow-950/20 hover:bg-yellow-950/40 font-mono text-[9px] text-yellow-400 text-left transition-all"
              >
                ✦ Royal Gilt
              </button>
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-[8px] uppercase tracking-widest text-stone-400 font-semibold mb-2 flex items-center gap-1">
              <Palette size={10} /> COLORWAY SELECT
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[9px] text-stone-400 block mb-1">Primary Accents</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => markDirty(setPrimaryColor)(e.target.value)}
                    className="w-8 h-8 bg-transparent border border-stone-700 cursor-pointer rounded-none"
                  />
                  <span className="font-mono text-[10px] text-stone-300 uppercase">{primaryColor}</span>
                </div>
              </div>
              <div>
                <span className="text-[9px] text-stone-400 block mb-1">Underlay Base</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => markDirty(setSecondaryColor)(e.target.value)}
                    className="w-8 h-8 bg-transparent border border-stone-700 cursor-pointer rounded-none"
                  />
                  <span className="font-mono text-[10px] text-stone-300 uppercase">{secondaryColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Texture Patterns */}
          <div>
            <label className="block text-[8px] uppercase tracking-widest text-stone-400 font-semibold mb-2">
              TEXTURE PATTERNS (2D PROCEDURAL GENERATOR)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['ripples', 'grid', 'marble', 'halftone'].map((pat) => (
                <button
                  key={pat}
                  onClick={() => markDirty(setPattern)(pat)}
                  className={`px-3 py-2 border font-mono text-[9px] text-center uppercase transition-all ${
                    pattern === pat
                      ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                      : 'border-stone-800 bg-stone-900/60 hover:bg-stone-800/80 text-stone-400'
                  }`}
                >
                  {pat}
                </button>
              ))}
            </div>
          </div>

          {/* Slider Sliders */}
          <div className="space-y-4">
            <label className="block text-[8px] uppercase tracking-widest text-stone-400 font-semibold flex items-center gap-1">
              <Sliders size={10} /> SHADER VARIABLES
            </label>

            <div>
              <div className="flex justify-between text-[9px] text-stone-400 mb-1">
                <span>Texture Wave Complexity</span>
                <span>{complexity}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={complexity}
                onChange={(e) => markDirty(setComplexity)(parseInt(e.target.value))}
                className="w-full accent-purple-500 bg-stone-800 h-1 rounded-none outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between text-[9px] text-stone-400 mb-1">
                <span>Vertex Warp Speed</span>
                <span>{warpSpeed.toFixed(1)}Hz</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={warpSpeed}
                onChange={(e) => markDirty(setWarpSpeed)(parseFloat(e.target.value))}
                className="w-full accent-purple-500 bg-stone-800 h-1 rounded-none outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between text-[9px] text-stone-400 mb-1">
                <span>Vertex Displacement</span>
                <span>{warpIntensity.toFixed(2)}m</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.3"
                step="0.01"
                value={warpIntensity}
                onChange={(e) => markDirty(setWarpIntensity)(parseFloat(e.target.value))}
                className="w-full accent-purple-500 bg-stone-800 h-1 rounded-none outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between text-[9px] text-stone-400 mb-1">
                <span>Fresnel Glossiness Reflection</span>
                <span>{glossiness.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={glossiness}
                onChange={(e) => markDirty(setGlossiness)(parseFloat(e.target.value))}
                className="w-full accent-purple-500 bg-stone-800 h-1 rounded-none outline-none"
              />
            </div>
          </div>

          {/* Accessory Mode selection */}
          <div>
            <label className="block text-[8px] uppercase tracking-widest text-stone-400 font-semibold mb-2">
              ACCESSORIES & EMBODIMENTS
            </label>
            <div className="flex gap-2">
              {['none', 'halo', 'crown'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => markDirty(setAccessoryMode)(mode)}
                  className={`flex-1 px-2 py-1.5 border font-mono text-[9px] text-center uppercase transition-all ${
                    accessoryMode === mode
                      ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                      : 'border-stone-800 bg-stone-900/60 hover:bg-stone-800/80 text-stone-400'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-stone-800 mt-6 pt-4 flex gap-2">
          <button
            type="button"
            onClick={handleResetToDoll}
            className="flex-1 px-3 py-2 border border-stone-700 bg-transparent hover:bg-stone-800 font-mono text-[9px] text-center uppercase transition-all"
          >
            {boundDoll ? 'Re-derive from Doll' : 'Reset Design'}
          </button>
          {boundDoll && onAestheticCommit && (
            <button
              type="button"
              onClick={handleCommit}
              disabled={!dirty}
              className={`flex-1 px-3 py-2 border font-mono text-[9px] text-center uppercase transition-all flex items-center justify-center gap-1 ${
                dirty
                  ? 'border-purple-500 bg-purple-500/15 text-purple-200 hover:bg-purple-500/25'
                  : 'border-stone-800 text-stone-600 cursor-not-allowed'
              }`}
            >
              <Save size={11} /> Save to Doll
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
