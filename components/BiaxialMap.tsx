import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Cluster {
 name: string;
 position: { x: number; y: number };
}

interface BiaxialMapProps {
 clusters: Cluster[];
}

export const BiaxialMap: React.FC<BiaxialMapProps> = ({ clusters }) => {
 const svgRef = useRef<SVGSVGElement>(null);

 useEffect(() => {
 if (!svgRef.current) return;

 const svg = d3.select(svgRef.current);
 svg.selectAll('*').remove();

 const width = 600;
 const height = 600;
 const margin = 50;

 const x = d3.scaleLinear().domain([-1, 1]).range([margin, width - margin]);
 const y = d3.scaleLinear().domain([-1, 1]).range([height - margin, margin]);

 // Draw axes
 svg.append('line').attr('x1', margin).attr('y1', height / 2).attr('x2', width - margin).attr('y2', height / 2).attr('stroke', '#444');
 svg.append('line').attr('x1', width / 2).attr('y1', margin).attr('x2', width / 2).attr('y2', height - margin).attr('stroke', '#444');

 // Labels
 svg.append('text').attr('x', width - margin).attr('y', height / 2 - 10).text('Material').attr('fill', '#888').attr('font-size', '10px');
 svg.append('text').attr('x', margin).attr('y', height / 2 - 10).text('Symbolic').attr('fill', '#888').attr('font-size', '10px');
 svg.append('text').attr('x', width / 2 + 10).attr('y', margin).text('Observable').attr('fill', '#888').attr('font-size', '10px');
 svg.append('text').attr('x', width / 2 + 10).attr('y', height - margin).text('Hidden').attr('fill', '#888').attr('font-size', '10px');

 // Plot points
 svg.selectAll('circle')
 .data(clusters)
 .enter()
 .append('circle')
 .attr('cx', (d: Cluster) => x(d.position.x))
 .attr('cy', (d: Cluster) => y(d.position.y))
 .attr('r', 6)
 .attr('fill', '#10b981');

 svg.selectAll('text.label')
 .data(clusters)
 .enter()
 .append('text')
 .attr('x', (d: Cluster) => x(d.position.x) + 10)
 .attr('y', (d: Cluster) => y(d.position.y) + 5)
 .text((d: Cluster) => d.name)
 .attr('fill', '#fff')
 .attr('font-size', '12px');

 }, [clusters]);

 return <svg ref={svgRef} width="100%"height="auto"viewBox="0 0 600 600"className="bg-nous-base"/>;
};
