import React from 'react';

interface ThimbleProps {
 className?: string;
 onClick?: () => void;
 isActive?: boolean;
}

export const Thimble: React.FC<ThimbleProps> = ({ className = '', onClick, isActive = false }) => {
 return (
 <svg 
 xmlns="http://www.w3.org/2000/svg"
 viewBox="0 0 120 120"
 className={`w-full max-w-[120px] h-auto ${className}`}
 onClick={onClick}
 >
 <style>
 {`
 .thimble-group {
 transform-origin: center;
 transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
 cursor: pointer;
 }
 .thimble-group:hover {
 transform: translateY(-4px);
 }
 .stroke-main {
 stroke: currentColor;
 stroke-width: 1;
 fill: none;
 }
 .stroke-heavy {
 stroke: currentColor;
 stroke-width: 1.5;
 fill: none;
 }
 .glass-reflection {
 stroke: currentColor;
 stroke-width: 0.5;
 stroke-linecap: round;
 opacity: 0.4;
 }
 .thimble-active .stroke-heavy,
 .thimble-active .stroke-main {
 stroke: #78716c; /* Stone 500 */
 }
 .thimble-active .dimple-mesh-circle {
 fill: #10B981;
 }
 `}
 </style>

 <defs>
 <pattern id="dimple-mesh"x="0"y="0"width="6"height="6"patternUnits="userSpaceOnUse">
 <circle cx="3"cy="3"r="0.5"fill="currentColor"opacity="0.4"className="dimple-mesh-circle transition-colors"/>
 </pattern>
 
 <clipPath id="thimble-clip">
 <path d="M 38 90 L 44 35 C 44 20, 76 20, 76 35 L 82 90 Z"/>
 </clipPath>
 </defs>

 <g className={`thimble-group ${isActive ? 'thimble-active' : ''}`}>
 <rect x="30"y="20"width="60"height="80"fill="url(#dimple-mesh)"clipPath="url(#thimble-clip)"/>

 <line x1="38"y1="90"x2="44"y2="35"className="stroke-heavy transition-colors"/>
 <line x1="82"y1="90"x2="76"y2="35"className="stroke-heavy transition-colors"/>
 
 <path d="M 44 35 C 44 18, 76 18, 76 35"className="stroke-heavy transition-colors"/>
 <path d="M 44 35 C 44 42, 76 42, 76 35"className="stroke-main transition-colors"strokeDasharray="2 3"opacity="0.6"/>

 <ellipse cx="60"cy="90"rx="22"ry="6"className="stroke-heavy transition-colors"/>
 <path d="M 38 90 C 38 85, 82 85, 82 90"className="stroke-main transition-colors"opacity="0.5"/>

 <line x1="50"y1="38"x2="46"y2="84"className="glass-reflection"/>
 <line x1="53"y1="40"x2="50"y2="78"className="glass-reflection"/>
 </g>
 </svg>
 );
};
