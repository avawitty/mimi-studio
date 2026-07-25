import React from 'react';

const features = [
 { name: 'Thimble', status: 'in-progress' },
 { name: 'Tag signals', status: 'todo' },
 { name: 'Narrative threads', status: 'todo' },
 { name: 'Narrative passing', status: 'todo' },
 { name: 'Tag graph', status: 'todo' },
 { name: 'Constellations', status: 'todo' },
 { name: 'The signature', status: 'todo' },
];

export const FeatureChecklist: React.FC = () => {
 return (
 <div className="bg-nous-base border border-nous-border p-6 rounded-none">
 <h3 className="font-serif text-xl italic mb-4">Development Roadmap</h3>
 <ul className="space-y-2">
 {features.map((feature) => (
 <li key={feature.name} className="flex items-center justify-between text-sm font-mono">
 <span>{feature.name}</span>
 <span className={`px-2 py-0.5 rounded-none text-[10px] ${
 feature.status === 'in-progress' ? 'bg-amber-100 text-amber-800' : 'bg-nous-base text-nous-subtle'
 }`}>
 {feature.status}
 </span>
 </li>
 ))}
 </ul>
 </div>
 );
};
