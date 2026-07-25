import React from 'react';
import { motion } from 'motion/react';

export const IntrovertaLabel: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
 return (
 <motion.div 
 className="cursor-pointer w-64 rounded-none overflow-hidden border border-nous-border hover: transition- bg"
 initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
 animate={{ opacity: 1, scale: 1, rotate: 0 }}
 transition={{ duration: 0.6, delay: 0.5, type:"spring"}}
 whileHover={{ scale: 1.02, rotate: 1 }}
 whileTap={{ scale: 0.98 }}
 onClick={onClick}
 title="Dispense Cognitive Supplement"
 >
 <svg xmlns="http://www.w3.org/2000/svg"viewBox="0 0 800 600"width="100%"height="100%"style={{ backgroundColor: '#f7f3ee' }}>
 <defs>
 <style>
 {`
 @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');
 .brand { font-family: 'Fredoka', sans-serif; font-size: 64px; font-weight: 600; fill: #ff8fab; letter-spacing: 2px; }
 .brand- { font-family: 'Fredoka', sans-serif; font-size: 64px; font-weight: 600; fill: #ffd6e0; letter-spacing: 2px; }
 .rx-title { font-family: 'Space Mono', monospace; font-size: 32px; font-weight: 700; fill: #4a4a4a; }
 .mono-text { font-family: 'Space Mono', monospace; font-size: 14px; fill: #6c757d; }
 .mono-bold { font-family: 'Space Mono', monospace; font-size: 14px; font-weight: 700; fill: #4a4a4a; }
 .mono-small { font-family: 'Space Mono', monospace; font-size: 11px; fill: #8b929a; }
 .accent-pink { fill: #ff8fab; }
 .accent-mint { fill: #84dcc6; }
 .accent-blue { fill: #a0c4ff; }
 .float { animation: floating 4s ease-in-out infinite; }
 .spin { transform-origin: center; animation: spinning 12s linear infinite; }
 .pulse { animation: pulsing 2s ease-in-out infinite alternate; }
 .marquee { animation: scrollLeft 15s linear infinite; }
 @keyframes floating {
 0% { transform: translateY(0px); }
 50% { transform: translateY(-12px); }
 100% { transform: translateY(0px); }
 }
 @keyframes spinning { 100% { transform: rotate(360deg); } }
 @keyframes pulsing {
 0% { opacity: 0.6; transform: scale(0.98); }
 100% { opacity: 1; transform: scale(1.02); }
 }
 @keyframes scrollLeft {
 0% { transform: translateX(0); }
 100% { transform: translateX(-400px); }
 }
 `}
 </style>
 <filter id=""x="-20%"y="-20%"width="140%"height="140%">
 <feDropShadow dx="0"dy="8"stdDeviation="6"floodColor="#d3c8b8"floodOpacity="0.5"/>
 </filter>
 <clipPath id="marquee-clip">
 <rect x="50"y="520"width="700"height="30"rx="5"/>
 </clipPath>
 </defs>

 <rect width="100%"height="100%"fill="#f7f3ee"/>
 <rect x="40"y="40"width="720"height="520"rx="30"fill="#ffffff"filter="url(#)"/>
 <path d="M 40 70 A 30 30 0 0 1 70 40 L 730 40 A 30 30 0 0 1 760 70 L 760 120 L 40 120 Z"fill="#e8f3f1"/>
 <text x="70"y="90"className="rx-title">Rx</text>
 <text x="120"y="85"className="mono-bold">NO. 000-MIMI</text>
 <text x="120"y="105"className="mono-small">DATE: [CURRENT_SYNC]</text>
 <text x="560"y="85"className="mono-bold">REFILLS: ∞</text>
 <text x="560"y="105"className="mono-small">QTY: AS NEEDED</text>

 <g transform="translate(70, 180)">
 <text x="3"y="3"className="brand-">INTROVERTA</text>
 <text x="0"y="0"className="brand">INTROVERTA</text>
 <text x="5"y="35"className="mono-bold accent-mint"style={{ fontSize: '16px', letterSpacing: '2px' }}>COGNITIVE SUPPLEMENT</text>
 </g>

 <g className="float"transform="translate(560, 240) rotate(15)">
 <path d="M -40 0 L 40 0 L 40 50 A 40 40 0 0 1 -40 50 Z"fill="#84dcc6"/>
 <path d="M -40 0 L 40 0 L 40 -50 A 40 40 0 0 0 -40 -50 Z"fill="#ff8fab"/>
 <path d="M -25 -40 A 25 25 0 0 1 -15 -70"fill="none"stroke="#ffffff"strokeWidth="4"strokeLinecap="round"opacity="0.6"/>
 <g transform="translate(0, -25) scale(0.6)">
 <path d="M 0 -15 L 4 -4 L 15 0 L 4 4 L 0 15 L -4 4 L -15 0 L -4 -4 Z"fill="#ffffff"opacity="0.8"/>
 </g>
 </g>

 <g className="pulse">
 <circle cx="500"cy="180"r="4"fill="#a0c4ff"/>
 <circle cx="680"cy="190"r="6"fill="#ffb5a7"/>
 <circle cx="510"cy="340"r="5"fill="#84dcc6"/>
 <circle cx="690"cy="320"r="3"fill="#ff8fab"/>
 </g>

 <g transform="translate(70, 270)">
 <text x="0"y="0"className="mono-small">ACTIVE INGREDIENT:</text>
 <text x="0"y="20"className="mono-bold">High-Fidelity Internal Simulations (100mg)</text>
 
 <text x="0"y="60"className="mono-small">DIRECTIONS FOR USE:</text>
 <rect x="0"y="75"width="400"height="90"rx="10"fill="#fdfaf6"stroke="#ffd6e0"strokeWidth="2"/>
 <text x="15"y="100"className="mono-bold"fill="#4a4a4a">Take daily to edit narratives.</text>
 <text x="15"y="125"className="mono-text">1. Label it:"Simulation"</text>
 <text x="15"y="145"className="mono-text">2. Locate it:"Happening in my mind"</text>
 </g>

 <g transform="translate(70, 440)">
 <rect x="0"y="0"width="120"height="35"rx="17.5"fill="#ff8fab"opacity="0.2"/>
 <text x="60"y="22"className="mono-bold accent-pink"textAnchor="middle"fontSize="12px">THOUGHTS = DRAFTS</text>

 <rect x="130"y="0"width="130"height="35"rx="17.5"fill="#84dcc6"opacity="0.2"/>
 <text x="195"y="22"className="mono-bold accent-mint"textAnchor="middle"fontSize="12px">VOICES = RENDERINGS</text>

 <rect x="270"y="0"width="150"height="35"rx="17.5"fill="#a0c4ff"opacity="0.2"/>
 <text x="345"y="22"className="mono-bold accent-blue"textAnchor="middle"fontSize="12px">NARRATIVES = MATERIALS</text>
 </g>

 <g transform="translate(490, 390)">
 <rect x="0"y="0"width="200"height="85"rx="8"fill="#ffe3e0"/>
 <text x="100"y="20"className="mono-bold"fill="#ff5c77"textAnchor="middle"fontSize="12px">⚠️ EDITOR WARNING</text>
 <text x="10"y="40"className="mono-small"fill="#ff5c77">You are the editor, not</text>
 <text x="10"y="55"className="mono-small"fill="#ff5c77">the subject. Do not assign</text>
 <text x="10"y="70"className="mono-small"fill="#ff5c77">external narratives.</text>
 </g>

 <g clipPath="url(#marquee-clip)">
 <rect x="40"y="520"width="720"height="40"fill="#f7f3ee"/>
 <g className="marquee">
 <text x="50"y="540"className="mono-bold accent-blue"fontSize="12px">
 STUDIO &gt; SURVEILLANCE • SELECTIVE BELIEF • HIGH SENSITIVITY + LOW BOUNDARY TAGGING • STUDIO &gt; SURVEILLANCE • SELECTIVE BELIEF • HIGH SENSITIVITY + LOW BOUNDARY TAGGING • STUDIO &gt; SURVEILLANCE
 </text>
 </g>
 </g>
 
 <g transform="translate(640, 40) scale(0.8)">
 <rect x="0"y="0"width="3"height="30"fill="#4a4a4a"/>
 <rect x="6"y="0"width="1"height="30"fill="#4a4a4a"/>
 <rect x="10"y="0"width="5"height="30"fill="#4a4a4a"/>
 <rect x="18"y="0"width="2"height="30"fill="#4a4a4a"/>
 <rect x="23"y="0"width="6"height="30"fill="#4a4a4a"/>
 <rect x="32"y="0"width="1"height="30"fill="#4a4a4a"/>
 <rect x="36"y="0"width="4"height="30"fill="#4a4a4a"/>
 <rect x="43"y="0"width="2"height="30"fill="#4a4a4a"/>
 <rect x="48"y="0"width="3"height="30"fill="#4a4a4a"/>
 <rect x="54"y="0"width="6"height="30"fill="#4a4a4a"/>
 </g>
 </svg>
 </motion.div>
 );
};
