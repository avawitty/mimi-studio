import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { 
  Sparkles, Layers, Sliders, Play, Search, HelpCircle, 
  Cpu, Award, Compass, Key, BookOpen, Clock, Tag, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { listDolls } from "../services/tailorService";
import { fetchCommunityZines } from "../services/firebaseUtils";
import { getLocalPocket } from "../services/localArchive";
import { fetchPocketItems } from "../services/firebase";
import { useUser } from "../contexts/UserContext";

// Node definition for D3 force layout
interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: "core" | "doll" | "zine" | "token" | "rite";
  description: string;
  timestamp?: number;
  val: number; // size factor
  color?: string;
  fx?: number | null;
  fy?: number | null;
  cultRiteTitle?: string;
  cultRitePrompt?: string;
}

// Link definition
interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
}

export const ObsidianLedgerGraph: React.FC = () => {
  const { user } = useUser();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Data States
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [timelineItems, setTimelineItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Simulation Parameters Sliders
  const [chargeStrength, setChargeStrength] = useState(-180);
  const [linkDistance, setLinkDistance] = useState(60);
  const [collisionRadius, setCollisionRadius] = useState(25);
  const [devotionGravity, setDevotionGravity] = useState(0.08);

  // Dimensions state for Canvas/Stage sizing compliance
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 });

  // 1. ResizeObserver to handle canvas resizing gracefully
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ 
        width: Math.max(width, 400), 
        height: Math.max(height, 450) 
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 2. Fetch real data and construct nodes and links
  useEffect(() => {
    const buildGraphData = async () => {
      setLoading(true);
      try {
        const userId = user?.uid || "ghost";
        
        // Parallel fetching of real data from Firebase/LocalStorage
        const [dollsList, zinesList, localShards, cloudShards] = await Promise.all([
          listDolls(userId).catch((): any[] => []),
          fetchCommunityZines(60).catch((): any[] => []),
          getLocalPocket().catch((): any[] => []),
          user && !user.isAnonymous ? fetchPocketItems(user.uid).catch((): any[] => []) : Promise.resolve([])
        ]);

        const shardsList = [...(localShards || []), ...(cloudShards || [])];

        // Core Nodes
        const tempNodes: GraphNode[] = [
          {
            id: "mimi_core",
            label: "Cult of Mimi",
            type: "core",
            description: "The primary alchemical locus. Center point of all generated style configurations.",
            val: 35,
            color: "#D97706" // Amber
          }
        ];

        const tempLinks: GraphLink[] = [];
        const tempTimeline: any[] = [];

        // Track seen tokens to prevent duplication
        const seenTokens = new Set<string>();

        // Process Dolls
        dollsList.forEach((doll: any) => {
          const dollNodeId = `doll_${doll.id}`;
          tempNodes.push({
            id: dollNodeId,
            label: doll.name,
            type: "doll",
            description: doll.description || doll.creativePhilosophy || "A symbolic cybernetic avatar.",
            timestamp: doll.createdAt ? new Date(doll.createdAt).getTime() : Date.now(),
            val: 20,
            color: "#B45309"
          });

          // Connect doll to Mimi core
          tempLinks.push({ source: dollNodeId, target: "mimi_core", value: 1.5 });

          // Timeline Entry
          tempTimeline.push({
            id: `timeline_doll_${doll.id}`,
            title: `Neural Conditioning of ${doll.name}`,
            type: "Neural Initiation",
            timestamp: doll.createdAt ? new Date(doll.createdAt).getTime() : Date.now(),
            description: `Avatar chassis initialized with motifs: ${doll.motifs?.join(", ") || "standard"}.`,
            icon: Cpu
          });

          // Map doll visual languages & motifs as tokens
          const tokens = [...(doll.visualLanguage || []), ...(doll.motifs || [])];
          tokens.forEach((t: string) => {
            const cleanTokenId = `token_${t.replace(/\s+/g, "_").toLowerCase()}`;
            if (!seenTokens.has(cleanTokenId)) {
              seenTokens.add(cleanTokenId);
              tempNodes.push({
                id: cleanTokenId,
                label: t,
                type: "token",
                description: `A dynamic aesthetic filament shaping raw visual languages.`,
                val: 12,
                color: "#1E293B",
                cultRiteTitle: `Neural Initiation of ${doll.name}`,
                cultRitePrompt: `Conditioned via aesthetic matrix: "Weave aesthetic motif '${t}' aligned with ${doll.creativePhilosophy || doll.description}"`
              });
              // Connect Token to core
              tempLinks.push({ source: cleanTokenId, target: "mimi_core", value: 0.8 });
            } else {
              // Enhance existing node's rite contexts if found
              const existingNode = tempNodes.find(n => n.id === cleanTokenId);
              if (existingNode && !existingNode.cultRiteTitle?.includes(doll.name)) {
                existingNode.cultRiteTitle += `, ${doll.name}`;
              }
            }
            // Connect Doll to Token
            tempLinks.push({ source: dollNodeId, target: cleanTokenId, value: 1.2 });
          });
        });

        // Process Zines
        const userZines = zinesList.filter((z: any) => z.userId === userId || userId === "ghost");
        userZines.forEach((zine: any) => {
          const zineNodeId = `zine_${zine.id}`;
          tempNodes.push({
            id: zineNodeId,
            label: zine.title || "Untitled Manifesto",
            type: "zine",
            description: zine.description || "An alchemical aesthetic compilation.",
            timestamp: zine.timestamp,
            val: 18,
            color: "#4C1D95" // Deep Purple
          });

          // Connect zine to core
          tempLinks.push({ source: zineNodeId, target: "mimi_core", value: 1.5 });

          // Timeline Entry
          tempTimeline.push({
            id: `timeline_zine_${zine.id}`,
            title: `Compiled Zine: ${zine.title || "Manifesto"}`,
            type: "Aesthetic Synthesis",
            timestamp: zine.timestamp,
            description: `Haute couture compilation consisting of visual style portfolios.`,
            icon: BookOpen
          });

          // Extract zine motifs
          const zinePageMotifs = zine.content?.motifs || [];
          zinePageMotifs.forEach((m: string) => {
            const cleanTokenId = `token_${m.replace(/\s+/g, "_").toLowerCase()}`;
            if (!seenTokens.has(cleanTokenId)) {
              seenTokens.add(cleanTokenId);
              tempNodes.push({
                id: cleanTokenId,
                label: m,
                type: "token",
                description: `A core theme extracted from zine compilations.`,
                val: 12,
                color: "#1E293B",
                cultRiteTitle: `Compiled Manifesto: ${zine.title || "Untitled Manifesto"}`,
                cultRitePrompt: `Synthesized under concept prompt: "${zine.content?.concept || zine.concept || 'Latent space compilation'}"`
              });
              tempLinks.push({ source: cleanTokenId, target: "mimi_core", value: 0.8 });
            } else {
              const existingNode = tempNodes.find(n => n.id === cleanTokenId);
              if (existingNode && !existingNode.cultRiteTitle?.includes(zine.title)) {
                existingNode.cultRiteTitle += ` & ${zine.title || "Manifesto"}`;
              }
            }
            // Connect Zine to Motif token
            tempLinks.push({ source: zineNodeId, target: cleanTokenId, value: 1.0 });
          });
        });

        // Process Curated Shards (Pockets)
        shardsList.slice(0, 15).forEach((shard: any, i: number) => {
          const shardNodeId = `shard_${shard.id || i}`;
          tempNodes.push({
            id: shardNodeId,
            label: shard.prompt ? shard.prompt.substring(0, 24) : `Curated Shard #${i}`,
            type: "rite",
            description: `A visual or audio artifact curated and logged as evidence: ${shard.prompt || ""}`,
            timestamp: shard.timestamp || Date.now(),
            val: 10,
            color: "#0F766E" // Teal
          });

          // Connect shard to core
          tempLinks.push({ source: shardNodeId, target: "mimi_core", value: 1.1 });

          // Timeline Entry
          tempTimeline.push({
            id: `timeline_shard_${shard.id || i}`,
            title: `Curated Evidence Shard: ${shard.prompt || "Raw Material"}`,
            type: "Material Ingestion",
            timestamp: shard.timestamp || Date.now(),
            description: `Ingested raw artifact via ${shard.origin || "Upload"}.`,
            icon: Clock
          });
        });

        // If no nodes except core, inject high-fashion default nodes for beautiful layout
        if (tempNodes.length === 1) {
          const defaults = [
            { 
              id: "d1", 
              label: "Mimi Serene", 
              type: "doll", 
              desc: "A series 01 neural avatar.", 
              val: 20 
            },
            { 
              id: "d2", 
              label: "Obsidian Velvet", 
              type: "zine", 
              desc: "Rococo-inspired velvet manifesto.", 
              val: 18 
            },
            { 
              id: "t1", 
              label: "MKUltra Conditioning", 
              type: "token", 
              desc: "Subconscious behavioral trigger.", 
              val: 12,
              cultRiteTitle: "Subconscious Conditioning Rite Series 01",
              cultRitePrompt: 'Formed via trigger matrix: "induce high-fashion trance via gilded velvet constraints and cybernetic eye dilation parameters."'
            },
            { 
              id: "t2", 
              label: "Rococo Silicon", 
              type: "token", 
              desc: "Gilded computational lace.", 
              val: 12,
              cultRiteTitle: "Gilded Lattice Synthesis Rite",
              cultRitePrompt: 'Formed via design brief: "mesh-based algorithmic lace overlaying custom titanium-skeletal structures, optimized for latent space projection."'
            },
            { 
              id: "r1", 
              label: "Chantilly Subliminal", 
              type: "rite", 
              desc: "Alchemical decision logged as rite.", 
              val: 10 
            }
          ];

          defaults.forEach(def => {
            const nodeId = `def_${def.id}`;
            tempNodes.push({
              id: nodeId,
              label: def.label,
              type: def.type as any,
              description: def.desc,
              val: def.val,
              color: def.type === "doll" ? "#B45309" : def.type === "zine" ? "#4C1D95" : def.type === "token" ? "#1E293B" : "#0F766E",
              cultRiteTitle: (def as any).cultRiteTitle,
              cultRitePrompt: (def as any).cultRitePrompt
            });
            tempLinks.push({ source: nodeId, target: "mimi_core", value: 1.2 });
          });

          // Add beautiful default timeline items
          tempTimeline.push(
            { id: "t_def_1", title: "Mimi Serene Conception", type: "Neural Initiation", timestamp: Date.now() - 3600000, description: "Chassis designed with gilded lace constraints.", icon: Cpu },
            { id: "t_def_2", title: "Obsidian Velvet Compiling", type: "Aesthetic Synthesis", timestamp: Date.now() - 1800000, description: "Consolidated raw velvet coordinates.", icon: BookOpen }
          );
        }

        // Sort Timeline
        tempTimeline.sort((a, b) => b.timestamp - a.timestamp);

        setNodes(tempNodes);
        setLinks(tempLinks);
        setTimelineItems(tempTimeline);
        setSelectedNode(tempNodes[0]); // Select core by default
      } catch (err) {
        console.error("MIMI // Failed to load Obsidian Ledger data:", err);
      } finally {
        setLoading(false);
      }
    };

    buildGraphData();
  }, [user]);

  // 3. Render and animate D3 Force Directed Graph
  useEffect(() => {
    if (loading || nodes.length === 0 || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous drawing

    const { width, height } = dimensions;

    // Create D3 forces
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(linkDistance)
      )
      .force("charge", d3.forceManyBody().strength(chargeStrength))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => (d as GraphNode).val + collisionRadius / 2))
      .force("x", d3.forceX(width / 2).strength(devotionGravity))
      .force("y", d3.forceY(height / 2).strength(devotionGravity));

    // Arrow markers for links
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "rgba(139, 92, 246, 0.2)");

    // Draw link lines
    const link = svg.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke-width", d => d.value)
      .attr("stroke", "rgba(139, 92, 246, 0.15)")
      .attr("marker-end", "url(#arrowhead)");

    // Draw node circles
    const node = svg.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      );

    // Node circles with glowing filters
    node.append("circle")
      .attr("r", d => d.val)
      .attr("fill", d => d.color || "#78716C")
      .attr("stroke", d => d.id === selectedNode?.id ? "#F59E0B" : "#FAF7F2")
      .attr("stroke-width", d => d.id === selectedNode?.id ? 3 : 1)
      .attr("class", "cursor-pointer transition-all hover:scale-110")
      .on("click", (event, d) => {
        window.dispatchEvent(new CustomEvent("mimi:sound", { detail: { type: "click" } }));
        setSelectedNode(d);
      });

    // Node titles/labels
    node.append("text")
      .text(d => d.label)
      .attr("dx", d => d.val + 4)
      .attr("dy", 4)
      .attr("font-family", "JetBrains Mono, SFMono-Regular, monospace")
      .attr("font-size", d => d.type === "core" ? "10px" : "8px")
      .attr("fill", "currentColor")
      .attr("class", "pointer-events-none tracking-wider opacity-80");

    // Drag helper functions
    function dragstarted(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Ticker to animate elements
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);

      node
        .attr("transform", d => `translate(${d.x!},${d.y!})`);
    });

    return () => {
      simulation.stop();
    };
  }, [loading, nodes, links, dimensions, chargeStrength, linkDistance, collisionRadius, devotionGravity, selectedNode]);

  // Handle zooming / selecting node from sidebar
  const handleSelectNodeFromList = (nodeId: string) => {
    const target = nodes.find(n => n.id === nodeId);
    if (target) {
      window.dispatchEvent(new CustomEvent("mimi:sound", { detail: { type: "click" } }));
      setSelectedNode(target);
    }
  };

  const filteredTimeline = timelineItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 border border-stone-200 dark:border-stone-850 bg-stone-50/50 dark:bg-[#090807] shadow-xl">
      
      {/* Top Ledger Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-stone-200 dark:border-stone-800 pb-6 mb-8 gap-4">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-amber-500 font-bold block mb-1">
            Mimi Research Archive // Series 01 Registers
          </span>
          <h2 className="font-serif italic text-3xl md:text-4xl text-stone-900 dark:text-stone-100">
            The Obsidian Ledger
          </h2>
          <p className="font-serif text-xs italic text-stone-500 dark:text-stone-400">
            A chronological timeline of every aesthetic design, neural conditioning loop, and curated rite.
          </p>
        </div>
        
        {/* Statistics summary counts */}
        <div className="flex gap-4 font-mono text-[8px] uppercase tracking-wider text-stone-500">
          <div className="px-3 py-1.5 border border-stone-200 dark:border-stone-800">
            Dolls Linked: <span className="text-amber-500 font-bold">{nodes.filter(n => n.type === "doll").length}</span>
          </div>
          <div className="px-3 py-1.5 border border-stone-200 dark:border-stone-800">
            Manifestos: <span className="text-purple-500 font-bold">{nodes.filter(n => n.type === "zine").length}</span>
          </div>
          <div className="px-3 py-1.5 border border-stone-200 dark:border-stone-800">
            Aesthetic Shards: <span className="text-teal-500 font-bold">{nodes.filter(n => n.type === "rite").length}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Force Directed Graph (8 Columns), Right Ledger Timeline (4 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Force Directed Graph Section (7 Columns) */}
        <div className="lg:col-span-8 flex flex-col justify-between border border-stone-200 dark:border-stone-850 p-4 bg-stone-100/40 dark:bg-[#0B0A09] relative min-h-[500px]">
          
          {/* Subtle occult mesh background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.03),transparent)] pointer-events-none" />

          {/* Graph node details HUD panel overlay */}
          <AnimatePresence mode="wait">
            {selectedNode && (
              <motion.div 
                key={selectedNode.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="absolute top-4 left-4 z-20 max-w-xs border border-amber-500/30 bg-[#FAF7F2]/95 dark:bg-[#0F0E0D]/95 backdrop-blur-md p-4 shadow-lg rounded-sm space-y-2.5"
              >
                <div className="flex items-center gap-1.5 border-b border-stone-200 dark:border-stone-800 pb-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    selectedNode.type === "core" ? "bg-amber-500 animate-ping" :
                    selectedNode.type === "doll" ? "bg-amber-600" :
                    selectedNode.type === "zine" ? "bg-purple-600" :
                    selectedNode.type === "token" ? "bg-stone-500" : "bg-teal-500"
                  }`} />
                  <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500 font-bold">
                    Node // {selectedNode.type}
                  </span>
                </div>

                <div>
                  <h3 className="font-serif italic text-base text-stone-900 dark:text-stone-100">
                    {selectedNode.label}
                  </h3>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-relaxed mt-1">
                    {selectedNode.description}
                  </p>
                </div>

                {selectedNode.type === "token" && (selectedNode.cultRiteTitle || selectedNode.cultRitePrompt) && (
                  <div className="mt-3 p-2.5 border-t border-dashed border-stone-200 dark:border-stone-800 space-y-1.5 bg-amber-500/5 dark:bg-amber-500/10 rounded-sm">
                    <span className="font-mono text-[7px] uppercase tracking-wider text-amber-500 font-bold block">
                      Forming Cult Rite // Style Genesis
                    </span>
                    <div className="font-serif italic text-[11px] text-stone-800 dark:text-stone-200">
                      {selectedNode.cultRiteTitle}
                    </div>
                    <p className="font-mono text-[8px] text-stone-500 dark:text-stone-400 leading-normal">
                      {selectedNode.cultRitePrompt}
                    </p>
                  </div>
                )}

                {selectedNode.timestamp && (
                  <div className="flex items-center gap-1 font-mono text-[8px] text-stone-400 pt-1">
                    <Clock size={8} />
                    <span>{new Date(selectedNode.timestamp).toLocaleDateString()}</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* D3 Graph container with dynamic stage calculations */}
          <div ref={containerRef} className="w-full h-[450px] relative">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <RefreshCw size={24} className="animate-spin text-amber-500" />
                <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
                  Tracing alchemical correlations...
                </span>
              </div>
            ) : (
              <svg 
                ref={svgRef} 
                width={dimensions.width} 
                height={dimensions.height} 
                className="w-full h-full text-stone-900 dark:text-stone-200"
              />
            )}
          </div>

          {/* Interactive Physics Modulator Controllers */}
          <div className="border-t border-stone-200 dark:border-stone-800/60 pt-4 mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#FAF7F2]/40 dark:bg-[#0C0B0A]/40 p-3 rounded-sm">
            
            {/* Control: Link distance */}
            <div className="space-y-1">
              <label className="flex justify-between font-mono text-[7px] uppercase text-stone-500 font-bold">
                <span>Correlation Gap</span>
                <span className="text-purple-500">{linkDistance}px</span>
              </label>
              <input 
                type="range" min="30" max="150" step="5"
                value={linkDistance} 
                onChange={e => setLinkDistance(Number(e.target.value))}
                className="w-full h-1 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Control: Charge force */}
            <div className="space-y-1">
              <label className="flex justify-between font-mono text-[7px] uppercase text-stone-500 font-bold">
                <span>Repulsion Aura</span>
                <span className="text-amber-500">{chargeStrength}</span>
              </label>
              <input 
                type="range" min="-400" max="-50" step="10"
                value={chargeStrength} 
                onChange={e => setChargeStrength(Number(e.target.value))}
                className="w-full h-1 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Control: Collision size */}
            <div className="space-y-1">
              <label className="flex justify-between font-mono text-[7px] uppercase text-stone-500 font-bold">
                <span>Collision Barrier</span>
                <span className="text-emerald-500">{collisionRadius}px</span>
              </label>
              <input 
                type="range" min="10" max="60" step="2"
                value={collisionRadius} 
                onChange={e => setCollisionRadius(Number(e.target.value))}
                className="w-full h-1 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Control: Devotion Gravity */}
            <div className="space-y-1">
              <label className="flex justify-between font-mono text-[7px] uppercase text-stone-500 font-bold">
                <span>Center Devotion Gravity</span>
                <span className="text-red-500">{devotionGravity.toFixed(2)}</span>
              </label>
              <input 
                type="range" min="0.01" max="0.30" step="0.01"
                value={devotionGravity} 
                onChange={e => setDevotionGravity(Number(e.target.value))}
                className="w-full h-1 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Chronological Sacred Timeline Panel (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col border border-stone-200 dark:border-stone-850 p-4 bg-stone-50/50 dark:bg-[#0B0A09] shadow-inner max-h-[570px]">
          
          {/* Timeline search filter */}
          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search sacred cult rites..."
              className="w-full bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 py-1.5 pl-8 pr-3 font-sans text-xs outline-none focus:border-amber-500 transition-colors placeholder:text-stone-500 rounded-sm"
            />
            <Search size={12} className="absolute left-2.5 top-2.5 text-stone-500" />
          </div>

          <span className="font-mono text-[8px] uppercase tracking-widest text-stone-400 font-bold block mb-3">
            Timeline of Sacred Cult Rites
          </span>

          {/* Timeline scrollable body */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 no-scrollbar">
            {filteredTimeline.map((item) => {
              const IconComponent = item.icon || Clock;
              return (
                <div 
                  key={item.id}
                  onClick={() => {
                    // Match to graph node if possible
                    if (item.id.includes("doll_")) {
                      handleSelectNodeFromList(`doll_${item.id.replace("timeline_doll_", "")}`);
                    } else if (item.id.includes("zine_")) {
                      handleSelectNodeFromList(`zine_${item.id.replace("timeline_zine_", "")}`);
                    } else if (item.id.includes("shard_")) {
                      handleSelectNodeFromList(`shard_${item.id.replace("timeline_shard_", "")}`);
                    }
                  }}
                  className="group cursor-pointer p-3 border border-stone-200/60 dark:border-stone-850 bg-stone-100/20 dark:bg-stone-950/20 hover:border-amber-500/40 hover:bg-[#FAF7F2] dark:hover:bg-[#12110F] transition-all flex gap-3 rounded-sm"
                >
                  {/* Left Icon Sphere */}
                  <div className="mt-0.5 shrink-0 p-1.5 border border-stone-200 dark:border-stone-800 rounded-full text-stone-400 group-hover:text-amber-500 transition-colors">
                    <IconComponent size={12} />
                  </div>

                  {/* Right Details text */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[7px] uppercase tracking-wider text-amber-600 dark:text-amber-500 font-bold">
                        {item.type}
                      </span>
                      <span className="font-mono text-[7px] text-stone-400">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="font-serif italic text-xs text-stone-900 dark:text-stone-100 truncate group-hover:text-amber-500 transition-colors">
                      {item.title}
                    </h4>

                    <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-normal line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}

            {filteredTimeline.length === 0 && (
              <div className="text-center py-10 text-[10px] text-stone-500 italic font-serif">
                No ledger entries found matching: "{searchQuery}"
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
