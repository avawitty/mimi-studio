import React, { useEffect, useRef } from 'react';

interface CodeNodeProps {
 analyser?: AnalyserNode | null;
 className?: string;
}

export const CodeNode: React.FC<CodeNodeProps> = ({ analyser, className = '' }) => {
 const logicCoreRef = useRef<SVGCircleElement>(null);
 const dataStreamRef1 = useRef<SVGPathElement>(null);
 const dataStreamRef2 = useRef<SVGPathElement>(null);
 const requestRef = useRef<number | undefined>(undefined);

 useEffect(() => {
 if (!analyser) return;

 const dataArray = new Uint8Array(analyser.frequencyBinCount);

 const breatheWithTheRoom = () => {
 requestRef.current = requestAnimationFrame(breatheWithTheRoom);
 
 analyser.getByteFrequencyData(dataArray);
 
 let sum = dataArray.reduce((a, b) => a + b, 0);
 let volume = sum / dataArray.length; 

 if (logicCoreRef.current) {
 let dynamicRadius = 8 + (volume * 0.5); 
 logicCoreRef.current.setAttribute('r', dynamicRadius.toString());
 }
 
 const opacity = volume > 50 ? '1' : '0.3';
 if (dataStreamRef1.current) dataStreamRef1.current.style.opacity = opacity;
 if (dataStreamRef2.current) dataStreamRef2.current.style.opacity = opacity;
 };

 breatheWithTheRoom();

 return () => {
 if (requestRef.current) {
 cancelAnimationFrame(requestRef.current);
 }
 };
 }, [analyser]);

 return (
 <svg xmlns="http://www.w3.org/2000/svg"viewBox="0 0 400 250"className={`w-full max-w-[600px] h-auto ${className}`}>
 <style>
 {`
 .stroke-main {
 stroke: currentColor;
 stroke-width: 1;
 fill: none;
 }
 .stroke-fine {
 stroke: currentColor;
 stroke-width: 0.5;
 fill: none;
 opacity: 0.6;
 }
 .text-telemetry {
 font-family: monospace, sans-serif;
 font-size: 7px;
 letter-spacing: 0.15em;
 fill: currentColor;
 opacity: 0.7;
 }
 .text-title {
 font-family: monospace, sans-serif;
 font-size: 9px;
 letter-spacing: 0.2em;
 fill: currentColor;
 font-weight: bold;
 text-transform: uppercase;
 }
 .pulse-core {
 animation: pulse 3s ease-in-out infinite;
 transition: r 0.1s ease-out;
 }
 .data-stream {
 stroke-dasharray: 2 4;
 animation: flow 15s linear infinite;
 transition: opacity 0.2s ease;
 }
 @keyframes flow {
 to { stroke-dashoffset: -100; }
 }
 @keyframes pulse {
 0%, 100% { opacity: 0.2; transform: scale(0.95); }
 50% { opacity: 0.8; transform: scale(1.05); }
 }
 .node-group {
 transform-origin: 200px 125px;
 }
 `}
 </style>

 <defs>
 <pattern id="micro-grid"width="10"height="10"patternUnits="userSpaceOnUse">
 <circle cx="1"cy="1"r="0.5"fill="currentColor"opacity="0.15"/>
 </pattern>
 </defs>

 <rect width="100%"height="100%"fill="url(#micro-grid)"/>

 <path ref={dataStreamRef1} d="M 40 60 C 100 60, 120 125, 150 125"className="stroke-fine data-stream"/>
 <path d="M 40 190 C 100 190, 120 125, 150 125"className="stroke-fine"/>
 
 <text x="40"y="50"className="text-telemetry">IN_DOM_TREE</text>
 <text x="40"y="180"className="text-telemetry">IN_USER_EVENT</text>

 <path ref={dataStreamRef2} d="M 250 125 C 280 125, 300 70, 360 70"className="stroke-fine data-stream"/>
 <path d="M 250 125 C 280 125, 300 180, 360 180"className="stroke-fine"/>
 
 <text x="280"y="60"className="text-telemetry">OUT_VISUAL_RENDER</text>
 <text x="280"y="170"className="text-telemetry">OUT_DATA_STATE</text>

 <g className="node-group">
 <rect x="140"y="75"width="120"height="100"rx="4"className="stroke-main"/>
 <rect x="145"y="80"width="110"height="90"rx="2"className="stroke-fine"/>
 
 <circle cx="140"cy="125"r="3"fill="currentColor"/>
 <circle cx="140"cy="125"r="7"className="stroke-fine"/>
 
 <circle cx="260"cy="125"r="3"fill="currentColor"/>
 <circle cx="260"cy="125"r="7"className="stroke-fine"/>

 <circle cx="200"cy="125"r="18"className="stroke-main"/>
 <circle cx="200"cy="125"r="14"className="stroke-fine"strokeDasharray="1 3"/>
 
 <circle ref={logicCoreRef} cx="200"cy="125"r="8"fill="currentColor"className="pulse-core"/>
 
 <line x1="143"y1="125"x2="182"y2="125"className="stroke-fine"/>
 <line x1="218"y1="125"x2="257"y2="125"className="stroke-fine"/>

 <text x="145"y="65"className="text-title">NODE_0x8F</text>
 
 <text x="150"y="95"className="text-telemetry">type: &lt;path&gt;</text>
 <text x="150"y="105"className="text-telemetry">id:"thread_main"</text>
 
 <text x="150"y="155"className="text-telemetry">stroke: currentColor</text>
 <text x="150"y="165"className="text-telemetry">fill: none</text>
 </g>

 <path d="M 20 20 L 10 20 L 10 30"className="stroke-main"/>
 <path d="M 380 230 L 390 230 L 390 220"className="stroke-main"/>
 </svg>
 );
};
