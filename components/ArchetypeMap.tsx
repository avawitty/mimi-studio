import React, { useEffect, useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { LineageEntry, ArchetypeWeights } from '../types';
import { fetchAllLineageEntries } from '../services/firebaseUtils';
import { auth } from '../services/firebaseInit';

export const ArchetypeMap: React.FC = () => {
 const [lineage, setLineage] = useState<LineageEntry[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const loadLineage = async () => {
 if (auth.currentUser) {
 const data = await fetchAllLineageEntries(auth.currentUser.uid);
 setLineage(data);
 }
 setLoading(false);
 };
 loadLineage();
 }, []);

 if (loading) return <div>Loading Constellation...</div>;
 if (lineage.length === 0) return <div>No Zines generated yet.</div>;

 const latest = lineage[lineage.length - 1].archetype_weights;
 const radarData = Object.entries(latest).map(([archetype, weight]) => ({
 archetype,
 weight: (weight as number) * 100,
 }));

 const lineData = lineage.map((entry, index) => ({
 name: `Zine ${index + 1}`,
 ...entry.archetype_weights,
 }));

 return (
 <div className="p-4 bg-nous-base rounded-none">
 <h2 className="text-xl font-serif italic mb-4">The Constellation</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="h-64">
 <ResponsiveContainer width="100%"height="100%"minWidth={1} minHeight={1}>
 <RadarChart cx="50%"cy="50%"outerRadius="80%"data={radarData}>
 <PolarGrid />
 <PolarAngleAxis dataKey="archetype"/>
 <PolarRadiusAxis angle={30} domain={[0, 100]} />
 <Radar name="Gravity"dataKey="weight"stroke="#8884d8"fill="#8884d8"fillOpacity={0.6} />
 </RadarChart>
 </ResponsiveContainer>
 </div>
 <div className="h-64">
 <ResponsiveContainer width="100%"height="100%"minWidth={1} minHeight={1}>
 <LineChart data={lineData}>
 <CartesianGrid strokeDasharray="3 3"/>
 <XAxis dataKey="name"/>
 <YAxis domain={[0, 1]} />
 <Tooltip />
 <Legend />
 <Line type="monotone"dataKey="Architect"stroke="#8884d8"/>
 <Line type="monotone"dataKey="Dreamer"stroke="#82ca9d"/>
 <Line type="monotone"dataKey="Archivist"stroke="#ffc658"/>
 <Line type="monotone"dataKey="Catalyst"stroke="#ff7300"/>
 </LineChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>
 );
};
