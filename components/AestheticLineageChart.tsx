import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Fragment } from '../types';

interface Props {
 fragments: Fragment[];
}

export const AestheticLineageChart: React.FC<Props> = ({ fragments }) => {
 const data = fragments
 .sort((a, b) => a.createdAt - b.createdAt)
 .map(f => ({
 date: new Date(f.createdAt).toLocaleDateString(),
 ...f.aestheticVector
 }));

 return (
 <div className="h-64 w-full bg-nous-base/50 p-4 rounded-none">
 <ResponsiveContainer width="100%"height="100%"minWidth={1} minHeight={1}>
 <LineChart data={data}>
 <CartesianGrid strokeDasharray="3 3"stroke="#333"/>
 <XAxis dataKey="date"stroke="#888"/>
 <YAxis stroke="#888"/>
 <Tooltip />
 <Legend />
 <Line type="monotone"dataKey="density"stroke="#8884d8"/>
 <Line type="monotone"dataKey="entropy"stroke="#82ca9d"/>
 <Line type="monotone"dataKey="warmth"stroke="#ffc658"/>
 </LineChart>
 </ResponsiveContainer>
 </div>
 );
};
