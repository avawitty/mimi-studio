import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { DossierPatternGraph } from '../../types';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  kind: 'signal' | 'ref' | 'outlier';
  label: string;
  weight: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface DossierPatternGraphVizProps {
  patternGraph: DossierPatternGraph;
  className?: string;
}

export const DossierPatternGraphViz: React.FC<DossierPatternGraphVizProps> = ({
  patternGraph,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { recurringSignals, outliers } = patternGraph;

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || recurringSignals.length === 0) return;

    const width = svgEl.clientWidth || 640;
    const height = Math.max(220, 72 + recurringSignals.length * 36 + outliers.length * 24);

    const refIds = new Set<string>();
    recurringSignals.forEach((sig) => sig.evidenceRefIds.forEach((id) => refIds.add(id)));
    outliers.forEach((o) => refIds.add(o.refId));

    const nodes: GraphNode[] = [];
    recurringSignals.forEach((sig, index) => {
      nodes.push({
        id: `signal-${index}`,
        kind: 'signal',
        label: sig.signal.length > 42 ? `${sig.signal.slice(0, 40)}…` : sig.signal,
        weight: Math.max(6, 8 + sig.count * 3),
      });
    });
    refIds.forEach((refId) => {
      nodes.push({
        id: `ref-${refId}`,
        kind: refId.startsWith('outlier') ? 'outlier' : 'ref',
        label: refId,
        weight: 5,
      });
    });

    const links: GraphLink[] = [];
    recurringSignals.forEach((sig, index) => {
      sig.evidenceRefIds.forEach((refId) => {
        links.push({
          source: `signal-${index}`,
          target: `ref-${refId}`,
        });
      });
    });

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(72)
          .strength(0.55),
      )
      .force('charge', d3.forceManyBody().strength(-140))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX<GraphNode>((d) => (d.kind === 'signal' ? width * 0.28 : width * 0.72)).strength(0.35))
      .force('y', d3.forceY(height / 2).strength(0.05));

    const g = svg.append('g');

    const link = g
      .append('g')
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.18)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', 1);

    const node = g
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'default');

    node
      .append('circle')
      .attr('r', (d) => d.weight)
      .attr('fill', (d) => {
        if (d.kind === 'signal') return 'rgba(20, 20, 20, 0.88)';
        if (d.kind === 'outlier') return 'rgba(180, 80, 60, 0.75)';
        return 'rgba(120, 120, 110, 0.55)';
      })
      .attr('stroke', 'rgba(255,255,255,0.35)')
      .attr('stroke-width', 0.5);

    node
      .append('text')
      .text((d) => d.label)
      .attr('x', (d) => (d.kind === 'signal' ? -(d.weight + 6) : d.weight + 6))
      .attr('y', 4)
      .attr('text-anchor', (d) => (d.kind === 'signal' ? 'end' : 'start'))
      .attr('font-size', (d) => (d.kind === 'ref' ? 9 : 10))
      .attr('font-family', (d) => (d.kind === 'ref' ? 'ui-monospace, monospace' : 'Georgia, serif'))
      .attr('fill', 'currentColor')
      .attr('opacity', 0.82);

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0);

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [outliers, recurringSignals]);

  if (recurringSignals.length === 0) {
    return (
      <p className="text-sm text-nous-subtle italic font-serif">
        No recurring signals detected in this dossier yet.
      </p>
    );
  }

  return (
    <div className={`text-nous-text ${className}`}>
      <svg ref={svgRef} className="w-full overflow-visible mb-6" role="img" aria-label="Pattern graph linking signals to evidence references" />
      <div className="grid sm:grid-cols-2 gap-3 text-[10px] font-mono uppercase tracking-widest text-nous-subtle">
        <span className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-nous-text/90" /> Signal
        </span>
        <span className="flex items-center gap-2 sm:justify-end">
          <span className="inline-block w-2 h-2 rounded-full bg-nous-subtle/50" /> Evidence ref
        </span>
      </div>
    </div>
  );
};
