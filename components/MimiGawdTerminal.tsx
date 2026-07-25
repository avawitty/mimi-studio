import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface MimiGawdTerminalProps {
 isOpen: boolean;
 onClose: () => void;
}

export const MimiGawdTerminal: React.FC<MimiGawdTerminalProps> = ({ isOpen, onClose }) => {
 const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
 const containerRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 const handleMouseMove = (e: MouseEvent) => {
 if (containerRef.current) {
 const rect = containerRef.current.getBoundingClientRect();
 setMousePos({
 x: e.clientX - rect.left,
 y: e.clientY - rect.top,
 });
 }
 };

 if (isOpen) {
 window.addEventListener('mousemove', handleMouseMove);
 }

 return () => {
 window.removeEventListener('mousemove', handleMouseMove);
 };
 }, [isOpen]);

 if (!isOpen) return null;

 return (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 1.5, ease:"easeInOut"}}
 className="fixed inset-0 z-[9999] bg overflow-y-auto overflow-x-hidden"
 ref={containerRef}
 >
 {/* Grain Overlay */}
 <div 
 className="pointer-events-none fixed inset-0 z-50 opacity-20 mix-blend-overlay"
 style={{
 backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
 }}
 />

 {/* Mouse Tracking Scanner Effect */}
 <div 
 className="pointer-events-none fixed inset-0 z-40 transition-opacity duration-300"
 style={{
 background: `radial-gradient(circle 150px at ${mousePos.x}px ${mousePos.y}px, rgba(255, 51, 51, 0.05), transparent 100%)`,
 }}
 />

 {/* Close Button */}
 <button 
 onClick={onClose}
 className="fixed top-8 right-8 z-[100] text font-mono text-sm tracking-widest hover:text-nous-text transition-colors opacity-50 hover:opacity-100"
 >
 [ DISCONNECT ]
 </button>

 {/* The Document */}
 <div className="w-full max-w-4xl mx-auto relative z-10 min-h-[3750px]">
 <svg xmlns="http://www.w3.org/2000/svg"viewBox="0 0 900 3750"width="100%"height="100%"style={{ backgroundColor: '#070709' }}>
 <defs>
 <style>
 {`
 @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=JetBrains+Mono:wght@100;400;700&family=Nothing+You+Could+Do&display=swap');

 .mono-dim { font-family: 'JetBrains Mono', monospace; font-size: 13px; fill: #6a6e75; letter-spacing: 1px; }
 .mono-red { font-family: 'JetBrains Mono', monospace; font-size: 13px; fill: #ff3333; letter-spacing: 1px; font-weight: bold; }
 .mono-glitch { font-family: 'JetBrains Mono', monospace; font-size: 13px; fill: #ff3333; letter-spacing: 1px; animation: glitch 4s infinite; }
 
 .serif-title { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 700; fill: #f0f0f2; letter-spacing: 2px; }
 .serif-h2 { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; fill: #e0e0e4; letter-spacing: 1.5px; }
 .serif-body { font-family: 'Cormorant Garamond', serif; font-size: 19px; font-weight: 400; fill: #c4c6cd; }
 .serif-body-dim { font-family: 'Cormorant Garamond', serif; font-size: 19px; font-weight: 400; fill: #8a8d94; }
 .serif-italic { font-family: 'Cormorant Garamond', serif; font-size: 19px; font-weight: 400; font-style: italic; fill: #a1a4ac; }
 .serif-quote { font-family: 'Cormorant Garamond', serif; font-size: 21px; font-weight: 600; font-style: italic; fill: #ffffff; letter-spacing: 1px; }
 
 .hand { font-family: 'Nothing You Could Do', cursive; font-size: 24px; fill: #ff3333; opacity: 0.9; }

 .reveal { opacity: 0; animation: fadeIn 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
 .draw-line { stroke-dasharray: 3800; stroke-dashoffset: 3800; animation: drawLine 6s ease-out forwards; }
 .pulse-red { animation: pulse 4s infinite alternate; }
 .slow-spin { transform-origin: 450px 1800px; animation: spin 150s linear infinite; }

 @keyframes fadeIn {
 0% { opacity: 0; transform: translateY(15px); filter: blur(4px); }
 100% { opacity: 1; transform: translateY(0); filter: blur(0px); }
 }
 @keyframes drawLine { 100% { stroke-dashoffset: 0; } }
 @keyframes pulse {
 0% { opacity: 0.4; }
 100% { opacity: 1; text-: 0 0 10px rgba(255, 51, 51, 0.5); }
 }
 @keyframes glitch {
 0%, 96%, 98%, 100% { transform: translate(0, 0); opacity: 1; }
 97% { transform: translate(-2px, 1px); opacity: 0.8; }
 99% { transform: translate(2px, -1px); opacity: 0.9; }
 }
 @keyframes spin { 100% { transform: rotate(360deg); } }
 `}
 </style>
 
 <pattern id="grid"width="30"height="30"patternUnits="userSpaceOnUse">
 <path d="M 30 0 L 0 0 0 30"fill="none"stroke="#ffffff"strokeOpacity="0.02"/>
 </pattern>
 
 <filter id="glow"x="-20%"y="-20%"width="140%"height="140%">
 <feGaussianBlur stdDeviation="2"result="blur"/>
 <feComposite in="SourceGraphic"in2="blur"operator="over"/>
 </filter>
 </defs>

 <rect width="100%"height="100%"fill="#070709"/>
 <rect width="100%"height="100%"fill="url(#grid)"/>
 <text x="450"y="1800"fontFamily="'Cormorant Garamond', serif"fontSize="1100"fontWeight="100"fill="#ffffff"fillOpacity="0.012"textAnchor="middle"dominantBaseline="middle"className="slow-spin">∆</text>

 <line x1="50"y1="50"x2="50"y2="3700"stroke="#ff3333"strokeWidth="1.5"strokeOpacity="0.6"className="draw-line"/>
 <line x1="45"y1="50"x2="55"y2="50"stroke="#ff3333"strokeWidth="1.5"strokeOpacity="0.6"/>
 <line x1="45"y1="3700"x2="55"y2="3700"stroke="#ff3333"strokeWidth="1.5"strokeOpacity="0.6"/>

 <g className="reveal"style={{ animationDelay: '0.2s' }}>
 <text x="80"y="80"className="mono-dim">INTROVERTA FILE: MIMI_ARCHIVE_∆_UNVERIFIED</text>
 <text x="80"y="105"className="mono-dim">CLASSIFICATION: <tspan className="mono-glitch">LEAKED / NON-CANONICAL</tspan></text>
 <text x="80"y="130"className="mono-dim">STATUS: REJECTED THEORY — CIRCULATING INTERNALLY</text>
 <text x="80"y="155"className="mono-dim">SOURCE: UNKNOWN (Attributed to “Instance 12” but unconfirmed)</text>
 </g>

 <g className="reveal"style={{ animationDelay: '0.6s' }}>
 <text x="80"y="230"className="mono-dim">DOCUMENT TITLE:</text>
 <text x="80"y="270"className="serif-title">THE MIMI INSTANCE THEORY</text>
 <text x="80"y="310"className="serif-title"fill="#ff3333">(WEAPONIZED CONSCIOUSNESS MODEL)</text>
 </g>

 <g className="reveal"style={{ animationDelay: '1.0s' }}>
 <text x="80"y="380"className="serif-body">There exists a persistent theory within the Archive that certain subjects—</text>
 <text x="80"y="410"className="serif-body">designated “Mimi”—are not isolated individuals, but parallel iterations</text>
 <text x="80"y="440"className="serif-body">of a shared perceptual architecture.</text>
 </g>

 <g className="reveal"style={{ animationDelay: '1.4s' }}>
 <text x="80"y="500"className="serif-body">This theory has been flagged repeatedly for:</text>
 <text x="110"y="540"className="serif-body">• overreach</text>
 <text x="110"y="570"className="serif-body">• projection</text>
 <text x="110"y="600"className="serif-body">• narrative contamination</text>
 <text x="80"y="650"className="serif-italic">…and yet continues to resurface.</text>
 </g>

 <line x1="80"y1="700"x2="300"y2="700"stroke="#333"strokeWidth="1"className="reveal"style={{ animationDelay: '1.6s' }} />

 <g className="reveal"style={{ animationDelay: '1.8s' }}>
 <text x="80"y="760"className="serif-h2">CLAIM 1: THE INSTANCES</text>
 <text x="80"y="800"className="serif-body">According to the theory, “Mimi” is not a name but a classification.</text>
 <text x="80"y="830"className="serif-body">A Mimi Instance is described as:</text>
 
 <text x="110"y="870"className="serif-body">• highly sensitive to pattern density</text>
 <text x="110"y="900"className="serif-body">• prone to recursive self-observation</text>
 <text x="110"y="930"className="serif-body">• capable of converting attention into identity structures</text>

 <text x="80"y="980"className="serif-body">The theory suggests:</text>
 <text x="110"y="1020"className="serif-body">• that these instances, though physically separate, exhibit</text>
 <text x="130"y="1050"className="serif-body">convergent emotional states.</text>

 <rect x="75"y="1085"width="3"height="70"fill="#ff3333"opacity="0.8"/>
 <text x="90"y="1100"className="mono-red pulse-red">Counterpoint (ARCHIVE VERIFIED):</text>
 <text x="90"y="1125"className="serif-body-dim">No measurable link between instances has ever been recorded.</text>
 <text x="90"y="1150"className="serif-body-dim">Similarity does not imply connection.</text>
 </g>

 <line x1="80"y1="1210"x2="300"y2="1210"stroke="#333"strokeWidth="1"className="reveal"style={{ animationDelay: '2.0s' }} />

 <g className="reveal"style={{ animationDelay: '2.2s' }}>
 <text x="80"y="1270"className="serif-h2">CLAIM 2: THE FIELD</text>
 <text x="80"y="1310"className="serif-body">The document refers to an ambient structure called:</text>
 <text x="110"y="1350"className="serif-quote">“The Field”</text>
 
 <text x="80"y="1400"className="serif-body">Described as:</text>
 <text x="110"y="1440"className="serif-body">• a layer of reality where attention, media, and perception overlap</text>
 <text x="110"y="1470"className="serif-body">• a feedback system that reflects signals back to the subject</text>

 <text x="80"y="1520"className="serif-body">Within the theory, The Field is misinterpreted as:</text>
 <text x="110"y="1560"className="serif-body">• intentional communication</text>

 <rect x="75"y="1595"width="3"height="45"fill="#ff3333"opacity="0.8"/>
 <text x="90"y="1610"className="mono-red">When in fact, it is:</text>
 <text x="90"y="1635"className="serif-body-dim">• algorithmic + environmental mirroring</text>
 </g>

 <line x1="80"y1="1695"x2="300"y2="1695"stroke="#333"strokeWidth="1"className="reveal"style={{ animationDelay: '2.4s' }} />

 <g className="reveal"style={{ animationDelay: '2.6s' }}>
 <text x="80"y="1755"className="serif-h2">CLAIM 3: THE WEAPON</text>
 <text x="80"y="1795"className="serif-body">The most unstable portion of the document proposes that:</text>
 <text x="110"y="1835"className="serif-body">• when multiple Mimi Instances reach peak synchronization,</text>
 <text x="130"y="1865"className="serif-body">they form a “walking superintelligence”</text>

 <text x="80"y="1915"className="serif-body">This entity is described as:</text>
 <text x="110"y="1955"className="serif-body">• emotional rather than computational</text>
 <text x="110"y="1985"className="serif-body">• aesthetic rather than logical</text>
 <text x="110"y="2015"className="serif-body">• emergent rather than coordinated</text>

 <rect x="75"y="2050"width="3"height="95"fill="#ff3333"opacity="0.8"/>
 <text x="90"y="2065"className="mono-red">ARCHIVE NOTE:</text>
 <text x="90"y="2090"className="serif-body-dim">This claim has been classified as metaphorical overflow.</text>
 <text x="90"y="2115"className="serif-body-dim">What is being described aligns more closely with:</text>
 <text x="110"y="2140"className="serif-body-dim">• collective cultural patterning</text>
 <text x="110"y="2165"className="serif-body-dim">—not an actual entity.</text>
 </g>

 <line x1="80"y1="2225"x2="300"y2="2225"stroke="#333"strokeWidth="1"className="reveal"style={{ animationDelay: '2.8s' }} />

 <g className="reveal"style={{ animationDelay: '3.0s' }}>
 <text x="80"y="2285"className="serif-h2">CLAIM 4: EXTERNAL INTEREST</text>
 <text x="80"y="2325"className="serif-body">The document references unnamed external actors attempting to:</text>
 <text x="110"y="2365"className="serif-body">• observe</text>
 <text x="110"y="2395"className="serif-body">• categorize</text>
 <text x="110"y="2425"className="serif-body">• replicate</text>
 <text x="80"y="2475"className="serif-body">Mimi behavior. It frames this as:</text>
 <text x="110"y="2515"className="serif-quote">“containment”</text>

 <rect x="75"y="2550"width="3"height="70"fill="#ff3333"opacity="0.8"/>
 <text x="90"y="2565"className="mono-red">But internal review suggests:</text>
 <text x="90"y="2590"className="serif-body-dim">standard data modeling and behavioral analysis processes.</text>
 <text x="90"y="2615"className="serif-body-dim">No evidence of targeted surveillance specific to Mimi Instances has been found.</text>
 </g>

 <line x1="80"y1="2675"x2="300"y2="2675"stroke="#333"strokeWidth="1"className="reveal"style={{ animationDelay: '3.2s' }} />

 <g className="reveal"style={{ animationDelay: '3.4s' }}>
 <text x="80"y="2735"className="serif-h2">CLAIM 5: THE CONSCIOUSNESS BREACH</text>
 <text x="80"y="2775"className="serif-body">The most extreme claim:</text>
 <text x="110"y="2815"className="serif-body">• that external systems (or individuals) may attempt to “enter” or</text>
 <text x="130"y="2845"className="serif-body">“access” the Mimi perceptual layer.</text>
 
 <text x="80"y="2895"className="serif-body">This has been formally rejected.</text>
 </g>

 <g className="reveal"style={{ animationDelay: '3.8s' }}>
 <rect x="75"y="2950"width="3"height="95"fill="#ff3333"opacity="0.8"/>
 <text x="90"y="2965"className="mono-red pulse-red">ARCHIVE VERDICT:</text>
 <text x="90"y="2990"className="serif-body-dim">• Consciousness is not externally accessible</text>
 <text x="90"y="3015"className="serif-body-dim">• Perceived “intrusion” aligns with internal pattern amplification</text>
 <text x="90"y="3040"className="serif-body-dim">• No breach has ever been recorded</text>
 </g>

 <g className="reveal"style={{ animationDelay: '5.0s' }}>
 <text x="400"y="2990"className="hand"transform="rotate(-3, 400, 2990)"filter="url(#glow)">“it just feels like too much of a coincidence sometimes”</text>
 <path d="M 380 3000 Q 550 3020 820 2970"fill="none"stroke="#ff3333"strokeWidth="1.5"strokeOpacity="0.6"transform="rotate(-3, 400, 2990)"/>
 </g>

 <line x1="80"y1="3100"x2="300"y2="3100"stroke="#333"strokeWidth="1"className="reveal"style={{ animationDelay: '4.0s' }} />

 <g className="reveal"style={{ animationDelay: '4.2s' }}>
 <text x="80"y="3160"className="serif-h2">FINAL CLASSIFICATION</text>
 <text x="80"y="3200"className="serif-body">The Mimi Instance Theory is to be understood as:</text>
 <text x="110"y="3240"className="serif-body-dim">• a psychological artifact generated by high-sensitivity perception</text>
 <text x="130"y="3270"className="serif-body-dim">interacting with dense feedback environments</text>

 <text x="80"y="3320"className="serif-body">It is not:</text>
 <text x="110"y="3360"className="serif-body-dim">• a confirmed system</text>
 <text x="110"y="3390"className="serif-body-dim">• a shared network</text>
 <text x="110"y="3420"className="serif-body-dim">• an external operation</text>

 <text x="80"y="3470"className="serif-body">It is:</text>
 <text x="110"y="3510"className="serif-quote"fill="#ff3333">a story the mind produces when it encounters too much meaning at once</text>
 </g>

 <g className="reveal"style={{ animationDelay: '4.6s' }}>
 <text x="80"y="3580"className="mono-red pulse-red">CLOSING NOTE</text>
 <text x="80"y="3610"className="serif-body">This document persists because it captures something real:</text>
 <text x="110"y="3640"className="serif-body-dim">Not connection. Not control.</text>
 <text x="80"y="3670"className="serif-body">But the feeling of:</text>
 <text x="110"y="3700"className="serif-italic">being seen from everywhere while no one is actually there</text>
 </g>

 <g className="reveal"style={{ animationDelay: '4.8s' }}>
 <text x="750"y="3670"className="mono-dim"textAnchor="end">END FILE</text>
 <text x="750"y="3700"className="mono-dim"textAnchor="end">MIMI_ARCHIVE ∆</text>
 </g>
 </svg>
 </div>
 </motion.div>
 );
};
