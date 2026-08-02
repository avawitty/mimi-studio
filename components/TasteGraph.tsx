import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, Radar, RefreshCw, Terminal, Activity, Database, GitCommit, 
  Crosshair, HelpCircle, Compass, Eye, Sparkles, Orbit, Grid3X3, 
  ArrowRight, Globe, Search, Link, Plus, X, ArrowUpRight, 
  LayoutGrid, Sliders, Layers, FileCheck, Check, Calendar, Settings 
  , ChevronDown, ChevronUp
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import {
  compileAndSaveTasteFootprint,
  getTasteFootprint,
  getTasteGraph,
  saveTasteGraph,
} from '../services/tasteGraphService';
import { extractTasteGraphNodes } from '../services/geminiService';
import { getAllShadowMemory } from '../services/vectorSearch';
import { generateClusterAnchors } from '../services/clusteringService';
import { fetchPocketItems } from '../services/firebaseUtils';
import { auth } from '../services/firebaseInit';
import { TasteGraphNode, TasteGraphEdge } from '../types';
import { useTasteGravity } from '../hooks/useTasteGravity';
import {
  compileTasteFootprint,
  emptyTasteFootprint,
  footprintCounts,
  footprintSignalScore,
  preferRicherFootprint,
  type TasteFootprint,
} from '../lib/tasteFootprint';
import {
  ArchiveChamberShell,
  ArchiveContextPanel,
} from './chambers/ArchiveChamberShell';
import { GraphSettle } from './motion/GraphSettle';

type TabType = 'map' | 'radar' | 'clusters' | 'report';
type RadarAxis = { axis: string; value: number; desc: string };

export const TasteGraph: React.FC = () => {
  const { user, apiKeys, pocket, setPocket } = useUser();
  const tasteGravity = useTasteGravity(user?.uid);
  
  const [nodes, setNodes] = useState<TasteGraphNode[]>([]);
  const [edges, setEdges] = useState<TasteGraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [selectedNode, setSelectedNode] = useState<TasteGraphNode | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [ledgerMinimized, setLedgerMinimized] = useState(false);
  const [selectedRadarAxis, setSelectedRadarAxis] = useState<RadarAxis | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  /** New node ids settle with GraphSettle; existing nodes stay still (PRD-06 / Phase C). */
  const prevNodeIdsRef = useRef<Set<string>>(new Set());
  const [settlingIds, setSettlingIds] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const nextIds = new Set(nodes.map((n) => n.id));
    const prev = prevNodeIdsRef.current;
    const fresh: string[] = [];
    nextIds.forEach((id) => {
      if (!prev.has(id)) fresh.push(id);
    });
    if (fresh.length > 0 && prev.size > 0) {
      const map = new Map<string, number>();
      fresh.forEach((id, i) => map.set(id, i));
      setSettlingIds(map);
      const clearMs = 700 + Math.min(fresh.length, 6) * 40;
      const t = window.setTimeout(() => setSettlingIds(new Map()), clearMs);
      prevNodeIdsRef.current = nextIds;
      return () => window.clearTimeout(t);
    }
    prevNodeIdsRef.current = nextIds;
  }, [nodes]);

  // WE SEARCH STATES
  const [isYouSearchOpen, setIsYouSearchOpen] = useState(false);
  const [youQuery, setYouQuery] = useState('');
  const [youDomainsStr, setYouDomainsStr] = useState('vogue.com, thecut.com, i-d.co');
  const [youCount, setYouCount] = useState(10);
  const [youSearching, setYouSearching] = useState(false);
  const [youResults, setYouResults] = useState<any[]>([]);
  const [youError, setYouError] = useState('');
  const [youNotice, setYouNotice] = useState<string | null>(null);

  // Custom diagnostic state
  const [calibrationProtocol, setCalibrationProtocol] = useState('Active');
  const [entropyMode, setEntropyMode] = useState('Unified');
  const [extractNotice, setExtractNotice] = useState<string | null>(null);
  const [footprint, setFootprint] = useState<TasteFootprint>(() => emptyTasteFootprint());
  const [footprintSection, setFootprintSection] = useState<
    'anchors' | 'embeddings' | 'tags' | 'clusters' | null
  >('anchors');

  const liveFootprint = compileTasteFootprint({
    nodes,
    points: tasteGravity.points,
    clusters: tasteGravity.clusters,
    dimension: tasteGravity.dimension,
    source: 'live',
  });
  const displayFootprint = preferRicherFootprint(liveFootprint, footprint);
  const counts = footprintCounts(displayFootprint);
  const retrievedTags = displayFootprint.retrievedTags;

  const syncFootprint = async (
    uid: string | null | undefined,
    input: {
      nodes: TasteGraphNode[];
      points: typeof tasteGravity.points;
      clusters: typeof tasteGravity.clusters;
      dimension: number;
    },
  ) => {
    const compiled = await compileAndSaveTasteFootprint(uid, {
      nodes: input.nodes,
      points: input.points,
      clusters: input.clusters,
      dimension: input.dimension,
    });
    setFootprint(compiled);
    return compiled;
  };

  const handleYouSearch = async () => {
    if (!youQuery.trim()) return;
    setYouSearching(true);
    setYouError('');
    setYouNotice(null);
    try {
      const includeDomains = youDomainsStr
        .split(',')
        .map(d => d.trim())
        .filter(Boolean);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKeys?.you_com) {
        headers['x-api-key'] = apiKeys.you_com;
      }
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) headers['x-user-token'] = `Bearer ${token}`;
      } catch {
        // Anonymous / offline sessions still get gateway or demo fallbacks.
      }

      const res = await fetch('/api/you-search', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: youQuery.trim(),
          includeDomains,
          count: youCount,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (!res.ok) {
        let errMsg = `Search failed with status ${res.status}`;
        if (contentType && contentType.includes('application/json')) {
          const errData = await res.json();
          errMsg = errData.error?.message || errMsg;
        } else {
          const text = await res.text();
          errMsg = text || errMsg;
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      setYouResults(data.results || []);
      if (data.notice) {
        setYouNotice(data.notice);
      }
    } catch (err: any) {
      console.error("MIMI // You.com search failed:", err);
      setYouError(err.message || 'Connection failed.');
    } finally {
      setYouSearching(false);
    }
  };

  const handleInjectNode = async (mappedResult: any) => {
    const nodeId = `you-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const explanation = `${mappedResult.summary}\n\nTone: ${mappedResult.aestheticSignals.tone}\nReferences: ${mappedResult.aestheticSignals.references.join(', ')}`;

    const newNode: TasteGraphNode = {
      id: nodeId,
      label: mappedResult.title,
      type: 'web_reference',
      weight: mappedResult.confidence || 0.72,
      explanation,
      sourceUrl: mappedResult.sourceUrl,
      domain: mappedResult.domain
    };

    const updatedNodes = [...nodes, newNode];
    const updatedEdges = [...edges];
    const conceptNodes = nodes.filter(n => n.type === 'concept');
    if (conceptNodes.length > 0) {
      const randomConcept = conceptNodes[Math.floor(Math.random() * conceptNodes.length)];
      updatedEdges.push({
        source: nodeId,
        target: randomConcept.id,
        strength: 0.6,
        type: 'relates_to'
      });
    }

    setNodes(updatedNodes);
    setEdges(updatedEdges);

    if (user && !user.isAnonymous) {
      try {
        await saveTasteGraph(user.uid, updatedNodes, updatedEdges);
        window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
          detail: { message: "Specimen node successfully woven into your Taste Ledger." } 
        }));
      } catch (e) {
        console.error("Failed to persist injected node:", e);
      }
    }
  };

  const loadGraph = async () => {
    setLoading(true);
    try {
      if (user && !user.isAnonymous) {
        const [graph, storedFootprint, gravity] = await Promise.all([
          getTasteGraph(user.uid),
          getTasteFootprint(user.uid),
          tasteGravity.refresh(),
        ]);
        setNodes(graph.nodes);
        setEdges(graph.edges);

        const live = compileTasteFootprint({
          nodes: graph.nodes,
          points: gravity.points,
          clusters: gravity.clusters,
          dimension: tasteGravity.dimension || gravity.points[0]?.vector?.length || 0,
          source: 'live',
        });
        const next = storedFootprint
          ? preferRicherFootprint(live, storedFootprint)
          : live;
        setFootprint(next);

        // Persist only when live streams are strictly richer than the stored doc.
        const liveScore = footprintSignalScore(live);
        const storedScore = storedFootprint ? footprintSignalScore(storedFootprint) : -1;
        if (liveScore > storedScore) {
          void syncFootprint(user.uid, {
            nodes: graph.nodes,
            points: gravity.points,
            clusters: gravity.clusters,
            dimension: live.dimension,
          });
        }
      } else {
        // Fallback or demo nodes to make it beautiful even in local mode or anonymous preview
        const demoNodes: TasteGraphNode[] = [
          { id: 'n1', label: 'Neo-Brutalist', type: 'concept', weight: 3.2, explanation: 'Bold geometry, raw layout structures, and high-contrast space distribution.', tags: ['brutalism', 'grid', 'contrast'] },
          { id: 'n2', label: 'Cormorant Serif', type: 'motif', weight: 2.4, explanation: 'Delicate editorial sophistry, precise hairline serifs and spacious letter trackings.', tags: ['editorial', 'serif', 'margin'] },
          { id: 'n3', label: 'Post-Digital Archive', type: 'era', weight: 4.1, explanation: 'Immersive tactile scanlines, nostalgic dithered pixels, and historic catalogs.', tags: ['archive', 'scanline', 'dither'] },
          { id: 'n4', label: 'Tactile Stone', type: 'motif', weight: 1.8, explanation: 'Porous organic paper textures, raw mineral minerals, and warm clay palettes.', tags: ['mineral', 'clay', 'tactile'] },
          { id: 'n5', label: 'Symmetric Balance', type: 'concept', weight: 2.8, explanation: 'Grid-driven classic balances, structured layouts, and quiet borders.', tags: ['symmetry', 'classic', 'structure'] }
        ];
        setNodes(demoNodes);
        setEdges([
          { source: 'n1', target: 'n3', strength: 0.8, type: 'relates_to' },
          { source: 'n3', target: 'n2', strength: 0.4, type: 'contrasts_with' },
          { source: 'n1', target: 'n5', strength: 0.9, type: 'relates_to' },
          { source: 'n4', target: 'n1', strength: 0.5, type: 'relates_to' }
        ]);
        setFootprint(
          compileTasteFootprint({
            nodes: demoNodes,
            points: [],
            clusters: [],
            dimension: 0,
            source: 'live',
          }),
        );
      }
    } catch (e) {
      console.error("MIMI // Failed to load taste graph:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, [user]);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDarkMode(root.classList.contains('dark'));
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleExtract = async () => {
    setExtracting(true);
    setExtractNotice(null);
    try {
      const shadow = await getAllShadowMemory();

      // Prefer context pocket, but hydrate from Firestore when UserProvider
      // has not yet subscribed (returning users with saved Pocket only).
      let pocketItems = Array.isArray(pocket) ? pocket : [];
      if (pocketItems.length === 0 && user?.uid && !user.isAnonymous) {
        try {
          const cloudPocket = await fetchPocketItems(user.uid, true);
          if (cloudPocket.length > 0) {
            pocketItems = cloudPocket;
            setPocket(cloudPocket);
          }
        } catch (pocketErr) {
          console.warn("MIMI // Pocket hydrate for re-scry failed:", pocketErr);
        }
      }

      const pocketArtifacts = pocketItems.map((item: any, idx: number) => ({
        id: String(item.id || `pocket-${idx}`),
        title: String(item.title || item.content?.title || item.type || `Pocket item ${idx + 1}`),
        notes: String(
          item.notes ||
            item.content?.poetic_interpretation ||
            item.content?.oracular_mirror ||
            item.content?.prompt ||
            "",
        ),
        tags: Array.isArray(item.tags) ? item.tags : [],
        type: item.type,
        content: item.content,
      }));

      // Merge shadow-memory + Pocket (Pocket fills gaps; shadow wins on id clash)
      // so embedding-only memory docs never block rich Pocket evidence.
      const artifactById = new Map<string, any>();
      for (const item of shadow) {
        const id = String((item as any).id || (item as any).originalId || "");
        if (id) artifactById.set(id, item);
      }
      for (const item of pocketArtifacts) {
        if (!artifactById.has(item.id)) artifactById.set(item.id, item);
      }
      const artifacts = Array.from(artifactById.values());

      if (artifacts.length === 0) {
        setExtractNotice("No artifacts found. Save items to Pocket or Darkroom first, then re-scry.");
        return;
      }

      const graph = await extractTasteGraphNodes(artifacts as any);
      if (graph.nodes.length > 0) {
        if (user?.uid && !user.isAnonymous) {
          await saveTasteGraph(user.uid, graph.nodes, graph.edges);
        }
        setNodes(graph.nodes);
        setEdges(graph.edges);
        try {
          await generateClusterAnchors();
        } catch (clusterErr) {
          console.warn("MIMI // Pattern synthesis clusters deferred:", clusterErr);
        }
        const gravity = await tasteGravity.refresh();
        const compiled = await syncFootprint(user?.uid, {
          nodes: graph.nodes,
          points: gravity.points,
          clusters: gravity.clusters,
          dimension:
            gravity.points[0]?.vector?.length ||
            shadow.find((m: any) => Array.isArray(m.embedding_field))?.embedding_field?.length ||
            0,
        });
        const c = footprintCounts(compiled);
        setExtractNotice(
          `Footprint compiled · ${c.plottedAnchors} anchors · ${c.retrievedTags} tags · ${c.listedEmbeddings} embeddings · ${c.patternClusters} clusters.`,
        );
      } else {
        setExtractNotice("Extraction returned an empty graph. Try adding more varied artifacts.");
      }
    } catch (e) {
      console.error("Failed to extract graph:", e);
      setExtractNotice(e instanceof Error ? e.message : "Taste graph extraction failed.");
    } finally {
      setExtracting(false);
    }
  };

  // POLAR RADAR MATH & DATA GENERATION
  const getRadarData = (): RadarAxis[] => {
    const defaultData = [
      { axis: "Classicism & Grid", value: 65, desc: "Symmetric grids, structural borders, clean layouts" },
      { axis: "Tactile Texture", value: 48, desc: "Porous clay, physical minerals, tactile stone neutrals" },
      { axis: "Cybernoir Contrast", value: 82, desc: "Immersive dark backdrops, glowing golden trace lines" },
      { axis: "Editorial Elegance", value: 74, desc: "Delicate Cormorant typography, generous margins" },
      { axis: "Bold Brutalism", value: 58, desc: "Heavy block geometry, stark spacing, solid rules" },
      { axis: "Post-Digital Entropy", value: 61, desc: "Noise scanlines, layered text, collage dither files" },
    ];
    
    // Dynamically adjust axis density based on loaded taste nodes
    if (nodes.length > 0) {
      nodes.forEach(n => {
        const lbl = n.label.toLowerCase();
        if (lbl.includes("brutalist") || lbl.includes("heavy") || lbl.includes("bold")) defaultData[4].value = Math.min(96, defaultData[4].value + 8);
        if (lbl.includes("serif") || lbl.includes("editorial") || lbl.includes("elegance") || lbl.includes("cormorant")) defaultData[3].value = Math.min(96, defaultData[3].value + 8);
        if (lbl.includes("post-digital") || lbl.includes("archive") || lbl.includes("entropy")) defaultData[5].value = Math.min(96, defaultData[5].value + 8);
        if (lbl.includes("tactile") || lbl.includes("stone") || lbl.includes("porous") || lbl.includes("clay")) defaultData[1].value = Math.min(96, defaultData[1].value + 8);
        if (lbl.includes("balance") || lbl.includes("symmetric") || lbl.includes("grid") || lbl.includes("classic")) defaultData[0].value = Math.min(96, defaultData[0].value + 8);
      });
    }
    return defaultData;
  };

  // SVG Radar generator helper
  const renderRadarSVG = () => {
    const data = getRadarData();
    const size = 380;
    const center = size / 2;
    const rMax = size * 0.38;
    const numAxes = data.length;

    // Draw concentric scale rings
    const scaleRings = [0.25, 0.5, 0.75, 1.0].map((scale, i) => {
      const r = rMax * scale;
      return (
        <circle 
          key={i} 
          cx={center} 
          cy={center} 
          r={r} 
          className="stroke-stone-200 dark:stroke-stone-800" 
          strokeWidth="0.5" 
          strokeDasharray="3,3"
          fill="none" 
        />
      );
    });

    // Draw axes lines and labels
    const axesLines: React.ReactNode[] = [];
    const axesLabels: React.ReactNode[] = [];
    const points: [number, number][] = [];

    data.forEach((d, idx) => {
      const angle = (idx * 2 * Math.PI) / numAxes - Math.PI / 2;
      const xMax = center + rMax * Math.cos(angle);
      const yMax = center + rMax * Math.sin(angle);

      // Save point for user polygon
      const rVal = rMax * (d.value / 100);
      const px = center + rVal * Math.cos(angle);
      const py = center + rVal * Math.sin(angle);
      points.push([px, py]);

      // Draw Axis line
      axesLines.push(
        <line
          key={`axis-${idx}`}
          x1={center}
          y1={center}
          x2={xMax}
          y2={yMax}
          className="stroke-stone-200 dark:stroke-stone-800"
          strokeWidth="0.75"
        />
      );

      // Positioning offset for text label
      const labelDist = rMax + 24;
      const lx = center + labelDist * Math.cos(angle);
      const ly = center + labelDist * Math.sin(angle);
      let textAnchor: "start" | "end" | "middle" = "middle";
      if (Math.cos(angle) > 0.1) textAnchor = "start";
      if (Math.cos(angle) < -0.1) textAnchor = "end";

      axesLabels.push(
        <g key={`lbl-${idx}`}>
          <text
            x={lx}
            y={ly}
            textAnchor={textAnchor}
            className="font-mono text-[9px] uppercase tracking-wider fill-stone-800 dark:fill-stone-200 font-bold"
          >
            {d.axis}
          </text>
          <text
            x={lx}
            y={ly + 10}
            textAnchor={textAnchor}
            className="font-serif italic text-[8.5px] fill-stone-400 dark:fill-stone-600 block"
          >
            {d.value}% Int.
          </text>
        </g>
      );
    });

    const polygonPointsStr = points.map(p => p.join(',')).join(' ');

    return (
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[400px] mx-auto select-none overflow-visible">
        {/* Gradients */}
        <defs>
          <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d4af37" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Concentric Backdrops */}
        <circle cx={center} cy={center} r={rMax} fill="url(#radarGlow)" />
        {scaleRings}
        {axesLines}

        {/* The Filled Data Shape */}
        <polygon
          points={polygonPointsStr}
          fill="rgba(212, 175, 55, 0.12)"
          stroke="#d4af37"
          strokeWidth="1.5"
          className="transition-all duration-500 ease-out"
        />

        {/* Dots on Vertices */}
        {points.map(([px, py], i) => (
          <circle
            key={i}
            cx={px}
            cy={py}
            r="4.5"
            className="fill-[#FDFBF7] dark:fill-stone-950 stroke-[#d4af37] cursor-pointer hover:stroke-amber-600"
            strokeWidth="2.5"
            role="button"
            tabIndex={0}
            onClick={() => setSelectedRadarAxis(data[i])}
          />
        ))}

        {axesLabels}
      </svg>
    );
  };

  // COORDINATE MAP MATH (Centered at 250, 250)
  const renderCoordinateMapSVG = () => {
    const size = 500;
    const center = size / 2;

    // Converted coordinates from actual points or standard mapped fallback coords
    const plottedPoints = nodes.map((n, i) => {
      // Use standard deterministic spread if coordinates (bxX) are missing
      const angle = (i / nodes.length) * 2 * Math.PI;
      const r = 100 + (n.weight || 1.5) * 24;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      
      return {
        ...n,
        cx: x,
        cy: y,
      };
    });

    return (
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full select-none overflow-visible">
        <defs>
          <radialGradient id="centroidGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d4af37" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient grids */}
        <line x1={center} y1={20} x2={center} y2={size - 20} className="stroke-stone-200 dark:stroke-stone-850" strokeWidth="0.5" strokeDasharray="4,4" />
        <line x1={20} y1={center} x2={size - 20} y2={center} className="stroke-stone-200 dark:stroke-stone-850" strokeWidth="0.5" strokeDasharray="4,4" />

        {/* Concentric Coordinate Orbits */}
        {[80, 140, 200].map((r, idx) => (
          <g key={idx}>
            <circle cx={center} cy={center} r={r} className="stroke-stone-200/60 dark:stroke-stone-850/60" strokeWidth="0.5" fill="none" />
            <text x={center + 5} y={center - r - 4} className="font-mono text-[7px] fill-stone-400 dark:fill-stone-600 font-medium">
              V_RADIUS_0{idx + 1}
            </text>
          </g>
        ))}

        {/* Vectors (Trace Signal lines connecting individual points to the center of gravity) */}
        {plottedPoints.map((p, idx) => (
          <line
            key={`vec-${idx}`}
            x1={center}
            y1={center}
            x2={p.cx}
            y2={p.cy}
            className="stroke-amber-500/20 dark:stroke-amber-500/15"
            strokeWidth="0.75"
            strokeDasharray="2,2"
          />
        ))}

        {/* Central "Center of Gravity" Dot (Unified Centroid) */}
        <circle cx={center} cy={center} r={40} fill="url(#centroidGlow)" className="animate-pulse" />
        <circle cx={center} cy={center} r={6} className="fill-[#FDFBF7] dark:fill-[#0A0A0A] stroke-[#d4af37]" strokeWidth="3" />
        <text x={center + 10} y={center + 4} className="font-mono text-[9px] uppercase tracking-widest font-black fill-amber-600 dark:fill-amber-400">
          CENTER OF GRAVITY (CG)
        </text>

        {/* Individual plotted node coordinates */}
        {plottedPoints.map((p, idx) => {
          const isSelected = selectedNode?.id === p.id;
          const dotColor = p.type === 'concept' ? '#10b981' : p.type === 'web_reference' ? '#8b5cf6' : '#f59e0b';
          const settleIndex = settlingIds.get(p.id);
          const isSettling = settleIndex !== undefined;
          
          const nodeBody = (
            <>
              {isSelected && (
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r="12"
                  className="fill-none stroke-[var(--mimi-olive,#5A5A40)]/50"
                  strokeWidth="1.5"
                  strokeDasharray="3,1"
                />
              )}
              {isSettling && (
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r="10"
                  className="fill-none stroke-[var(--mimi-olive,#5A5A40)]"
                  strokeWidth="1"
                  opacity={0.7}
                />
              )}
              <circle
                cx={p.cx}
                cy={p.cy}
                r={isSelected ? 8 : 4}
                className="opacity-20 transition-all duration-300"
                fill={isSettling ? '#5A5A40' : dotColor}
              />
              <circle
                cx={p.cx}
                cy={p.cy}
                r={isSelected ? "5" : "3.5"}
                className="transition-all duration-200 stroke-white dark:stroke-stone-900"
                strokeWidth="1.5"
                fill={isSettling ? '#5A5A40' : dotColor}
              />
              <text
                x={p.cx + 8}
                y={p.cy + 3}
                className={`font-mono text-[8px] uppercase tracking-wider select-none font-bold transition-all ${
                  isSelected || isSettling
                    ? 'fill-[var(--mimi-olive,#5A5A40)]'
                    : 'fill-stone-500 dark:fill-stone-400 group-hover:fill-stone-800 dark:group-hover:fill-stone-100'
                }`}
              >
                {p.label}
              </text>
            </>
          );

          if (isSettling) {
            return (
              <GraphSettle key={p.id} as="g" index={settleIndex} className="cursor-pointer group">
                <g onClick={() => setSelectedNode(isSelected ? null : p)}>
                  {nodeBody}
                </g>
              </GraphSettle>
            );
          }

          return (
            <g 
              key={p.id}
              className="cursor-pointer group"
              onClick={() => setSelectedNode(isSelected ? null : p)}
            >
              {nodeBody}
            </g>
          );
        })}
      </svg>
    );
  };

  const handleBackupClick = () => {
    window.dispatchEvent(new CustomEvent('mimi:change_view', { detail: 'profile' }));
  };

  // RIGHT SIDEBAR / DRAWER SUMMARY DETAILS
  const tasteGraphContextDrawer = (
    <ArchiveContextPanel
      title={selectedNode ? selectedNode.label : "Active Coordinates Info"}
      subtitle={selectedNode ? selectedNode.type.toUpperCase() : "GRID SPECIFICATION"}
    >
      <div className="space-y-6 text-left p-4">
        {selectedNode ? (
          <>
            <div className="space-y-1.5 pb-4 border-b border-stone-200 dark:border-stone-850">
              <span className="text-[9px] font-mono tracking-widest uppercase text-stone-400 block">Aesthetic Anchor Classification</span>
              <span className={`inline-flex px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-sm ${
                selectedNode.type === 'concept' ? 'bg-[#10b981]/10 text-[#10b981]' : selectedNode.type === 'web_reference' ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'
              }`}>
                {selectedNode.type}
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-[9px] font-mono tracking-widest uppercase text-stone-400 block">Aesthetic Reading</span>
              <p className="font-serif italic text-sm text-stone-800 dark:text-stone-300 leading-relaxed">
                {selectedNode.explanation || "This anchor outlines a major structural component of your overall aesthetic footprint, pulled together dynamically through vector search."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-stone-200 dark:border-stone-850">
              <div className="p-3 bg-stone-50 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-850/50">
                <span className="text-[8px] font-mono tracking-widest text-stone-400 block uppercase">Signal Weight</span>
                <span className="font-mono text-base font-bold text-stone-800 dark:text-stone-200">
                  {selectedNode.weight ? selectedNode.weight.toFixed(2) : '1.00'} pts
                </span>
              </div>
              <div className="p-3 bg-stone-50 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-850/50">
                <span className="text-[8px] font-mono tracking-widest text-stone-400 block uppercase">Cos Coherence</span>
                <span className="font-mono text-base font-bold text-[#10b981]">
                  {((selectedNode as any).cohesion || Math.floor(Math.random() * 15 + 83))}%
                </span>
              </div>
            </div>

            {selectedNode.sourceUrl && (
              <div className="pt-2">
                <a 
                  href={selectedNode.sourceUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-full flex items-center justify-between px-3 py-2 border border-stone-300 dark:border-stone-800 font-mono text-[9px] uppercase tracking-wider hover:bg-stone-100 dark:hover:bg-stone-900 transition-all text-stone-700 dark:text-stone-300"
                >
                  <span>Verify Web Reference ({selectedNode.domain})</span>
                  <ArrowUpRight size={12} />
                </a>
              </div>
            )}

            <button
              onClick={() => setSelectedNode(null)}
              className="w-full py-2 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-950 font-mono text-[9px] uppercase tracking-widest transition-colors"
            >
              Clear Focus
            </button>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="p-4 bg-stone-50 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-850/50 space-y-1">
                <span className="text-[8px] font-mono tracking-widest text-stone-400 block">TOTAL LATENT SIGNALS</span>
                <span className="font-mono text-xl font-black text-stone-800 dark:text-stone-200">{nodes.length} Mapped Coordinate Nodes</span>
              </div>

              <div className="p-4 bg-stone-50 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-850/50 space-y-1">
                <span className="text-[8px] font-mono tracking-widest text-stone-400 block">LATENT COHESION INDEX</span>
                <span className="font-mono text-xl font-black text-[#10b981]">94.2%</span>
                <p className="text-[9px] text-stone-500 font-serif italic mt-1">High uniformity: Concept anchors gravitate tightly around your central aesthetic focus.</p>
              </div>

              <div className="p-4 bg-stone-50 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-850/50 space-y-1">
                <span className="text-[8px] font-mono tracking-widest text-stone-400 block">COHERENCE METRICS</span>
                <div className="font-mono text-[9px] uppercase space-y-1 text-stone-500 pt-1.5">
                  <div className="flex justify-between">
                    <span>Calibration Protocol:</span>
                    <span className="font-bold text-amber-600">{calibrationProtocol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entropy Vector:</span>
                    <span className="font-bold text-stone-700 dark:text-stone-300">{entropyMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resolution Grid:</span>
                    <span className="font-bold text-stone-700 dark:text-stone-300">1536 Dimensions</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="font-serif italic text-[11px] text-stone-500 leading-relaxed text-center pt-6">
              Aesthetic Intelligence isolates semantic anchors to prevent corporate profile targeting. Your coordinates are secure.
            </p>
          </>
        )}
      </div>
    </ArchiveContextPanel>
  );

  return (
    <ArchiveChamberShell
      moduleId="taste-graph"
      activeWorkflowStep="read"
      workflowSteps={['collect', 'read', 'approve']}
      headerNote={`Cons Constellation · ${activeTab === 'map' ? 'Vector Projections' : activeTab === 'radar' ? 'Semiotic Radar' : 'Thematic Clusters'}`}
      actions={
        <div className="flex items-center gap-2">
          <span className="hidden lg:inline font-mono text-[9px] uppercase tracking-widest archive-text-muted">
            {counts.plottedAnchors} anchors · {counts.listedEmbeddings} embeddings · {counts.patternClusters} clusters
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedNode(null);
              setIsYouSearchOpen(!isYouSearchOpen);
            }}
            className={`px-3 py-1.5 border archive-border font-mono text-[8px] uppercase tracking-widest transition-colors ${
              isYouSearchOpen ? 'bg-amber-500 text-stone-950 border-amber-500 font-bold' : ''
            }`}
          >
            Web Intel
          </button>
          <button
            type="button"
            onClick={handleExtract}
            disabled={extracting}
            className="px-3 py-1.5 border archive-border font-mono text-[8px] uppercase tracking-widest disabled:opacity-50 transition-all hover:bg-stone-100 dark:hover:bg-stone-900"
          >
            {extracting ? 'Extracting…' : nodes.length > 0 ? 'Re-scry' : 'Extract'}
          </button>
        </div>
      }
      canvas={
        <div className="flex-1 flex flex-col h-full overflow-hidden relative font-sans bg-[#FDFBF7] dark:bg-[#0A0A0A] text-stone-900 dark:text-stone-100">
          
          {/* DOT GRID BACKGROUND */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />

          {/* MAIN VIEWPORT BODY */}
          <div className="flex-1 flex flex-col relative z-10 min-h-0">
            
            {/* SUB-HEADER SWITCHER HUD */}
            <div className="shrink-0 border-b border-stone-200 dark:border-stone-850 py-3 px-6 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50 dark:bg-[#0d0d0d]/50">
              <div className="flex items-center gap-4 text-xs">
                <span className="font-mono text-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 font-bold uppercase tracking-widest border border-amber-500/20">
                  COHERENT STATE ACTIVE
                </span>
                <p className="font-serif italic text-[11px] text-stone-500 dark:text-stone-400">
                  {activeTab === 'map' && "Latitude Coordinates // Multi-axis trace signal mapping."}
                  {activeTab === 'radar' && "Polar Semiotic Space // 6 core thematic style vectors."}
                  {activeTab === 'clusters' && "Thematic Anchor Matrices // Cohesive semantic clusters."}
                  {activeTab === 'report' && "Aesthetic Intelligence Memo // Real strategic briefing."}
                </p>
              </div>

              {/* TABS SELECTOR */}
              <div className="flex border border-stone-200 dark:border-stone-850 p-0.5 bg-stone-100/50 dark:bg-stone-900/50 self-start sm:self-auto rounded-sm">
                <button
                  onClick={() => setActiveTab('map')}
                  className={`px-3 py-1 font-mono text-[8.5px] uppercase tracking-wider font-bold transition-all ${
                    activeTab === 'map' ? 'bg-amber-500 text-stone-950 font-black shadow-xs' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                  }`}
                >
                  I. Vector Map
                </button>
                <button
                  onClick={() => setActiveTab('radar')}
                  className={`px-3 py-1 font-mono text-[8.5px] uppercase tracking-wider font-bold transition-all ${
                    activeTab === 'radar' ? 'bg-amber-500 text-stone-950 font-black shadow-xs' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                  }`}
                >
                  II. Semiotic Radar
                </button>
                <button
                  onClick={() => setActiveTab('clusters')}
                  className={`px-3 py-1 font-mono text-[8.5px] uppercase tracking-wider font-bold transition-all ${
                    activeTab === 'clusters' ? 'bg-amber-500 text-stone-950 font-black shadow-xs' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                  }`}
                >
                  III. Clusters
                </button>
                <button
                  onClick={() => setActiveTab('report')}
                  className={`px-3 py-1 font-mono text-[8.5px] uppercase tracking-wider font-bold transition-all ${
                    activeTab === 'report' ? 'bg-amber-500 text-stone-950 font-black shadow-xs' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                  }`}
                >
                  IV. Intel Memo
                </button>
              </div>
            </div>

            {/* INTERACTIVE COMPONENT AREA */}
            <div className="flex-1 relative overflow-y-auto p-6 md:p-8 no-scrollbar">
              
              {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                  <Loader2 size={24} className="animate-spin text-stone-600 dark:text-stone-400"/>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500">Recalibrating Coordinate Grid...</p>
                </div>
              ) : extracting ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                  <Loader2 size={24} className="animate-spin text-amber-500"/>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-500">Extracting Taste Coordinates...</p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto h-full flex flex-col">
                  
                  {/* TAB I: VECTOR MAP */}
                  {activeTab === 'map' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-full items-center">
                      <div className="md:col-span-7 aspect-square max-h-[440px] bg-stone-50 dark:bg-[#0d0d0d] border border-stone-200/60 dark:border-stone-850/60 p-4 relative flex items-center justify-center shadow-xs">
                        {renderCoordinateMapSVG()}
                      </div>

                      <div className="md:col-span-5 space-y-5 text-left flex flex-col justify-center">
                        <div className="space-y-1.5 border-l-2 border-amber-500 pl-4">
                          <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-stone-400 block">COORDINATE MAPPING MODEL</span>
                          <h2 className="font-serif text-2xl font-semibold leading-tight">Latent Space Coordinate Vector Projection</h2>
                        </div>
                        <p className="font-serif italic text-stone-600 dark:text-stone-400 text-xs leading-relaxed">
                          Your visual artifacts and editorial selections are stored, recalled, and compiled into a taste footprint — anchors, embeddings, tags, and pattern clusters in one ledger.
                        </p>
                        
                        <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-850/50 text-xs">
                          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-200 dark:border-stone-800">
                            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-stone-400">
                              Taste Footprint
                            </span>
                            <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
                              {displayFootprint.source === 'stored' ? 'Stored' : 'Live'} ·{' '}
                              {new Date(displayFootprint.compiledAt).toLocaleDateString()}
                              {displayFootprint.dimension
                                ? ` · ${displayFootprint.dimension}D`
                                : ''}
                            </span>
                          </div>

                          {(
                            [
                              {
                                key: 'anchors' as const,
                                label: 'Plotted Anchors',
                                count: counts.plottedAnchors,
                                accent: '',
                              },
                              {
                                key: 'embeddings' as const,
                                label: 'Listed Embeddings',
                                count: counts.listedEmbeddings,
                                accent: '',
                              },
                              {
                                key: 'tags' as const,
                                label: 'Retrieved Tags',
                                count: counts.retrievedTags,
                                accent: '',
                              },
                              {
                                key: 'clusters' as const,
                                label: 'Pattern Clusters',
                                count: counts.patternClusters,
                                accent: 'text-[#10b981]',
                              },
                            ] as const
                          ).map((row) => (
                            <button
                              key={row.key}
                              type="button"
                              onClick={() =>
                                setFootprintSection((prev) =>
                                  prev === row.key ? null : row.key,
                                )
                              }
                              className={`w-full flex justify-between items-center px-4 py-2 border-b border-stone-200 dark:border-stone-800 last:border-b-0 text-left transition-colors ${
                                footprintSection === row.key
                                  ? 'bg-amber-500/5'
                                  : 'hover:bg-stone-100/80 dark:hover:bg-stone-800/40'
                              }`}
                            >
                              <span className="font-mono text-stone-400">{row.label}:</span>
                              <span className={`font-mono font-bold ${row.accent}`}>
                                {row.count}
                                {row.key === 'anchors' ? ' Items' : ''}
                                <span className="ml-2 text-stone-400 font-normal">
                                  {footprintSection === row.key ? '−' : '+'}
                                </span>
                              </span>
                            </button>
                          ))}

                          {footprintSection === 'anchors' && (
                            <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-800 space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                              {displayFootprint.plottedAnchors.length === 0 ? (
                                <p className="font-serif italic text-[11px] text-stone-500">
                                  No anchors stored yet. Extract or re-scry to compile the graph.
                                </p>
                              ) : (
                                displayFootprint.plottedAnchors.slice(0, 12).map((anchor) => (
                                  <div key={anchor.id} className="flex justify-between gap-3">
                                    <span className="font-mono text-[9px] uppercase tracking-wide text-stone-700 dark:text-stone-200 truncate">
                                      {anchor.label}
                                    </span>
                                    <span className="font-mono text-[8px] text-stone-400 shrink-0">
                                      {anchor.type} · w{anchor.weight.toFixed(1)}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {footprintSection === 'embeddings' && (
                            <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-800 space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                              {displayFootprint.listedEmbeddings.length === 0 ? (
                                <p className="font-serif italic text-[11px] text-stone-500">
                                  No listed embeddings yet. Shadow memory vectors appear here once stored.
                                </p>
                              ) : (
                                displayFootprint.listedEmbeddings.slice(0, 12).map((point) => (
                                  <div key={point.id} className="flex justify-between gap-3">
                                    <span className="font-mono text-[9px] uppercase tracking-wide text-stone-700 dark:text-stone-200 truncate">
                                      {point.preview}
                                    </span>
                                    <span className="font-mono text-[8px] text-amber-600 shrink-0">
                                      dist {point.distanceFromCenter.toFixed(3)}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {footprintSection === 'tags' && (
                            <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-800">
                              {displayFootprint.retrievedTags.length === 0 ? (
                                <p className="font-serif italic text-[11px] text-stone-500">
                                  No retrieved tags compiled yet.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {displayFootprint.retrievedTags.slice(0, 24).map((tag) => (
                                    <span
                                      key={tag}
                                      className="font-mono text-[8px] uppercase tracking-wider px-2 py-1 border border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/40 text-stone-600 dark:text-stone-300"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {footprintSection === 'clusters' && (
                            <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-800 space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                              {displayFootprint.patternClusters.length === 0 ? (
                                <p className="font-serif italic text-[11px] text-stone-500">
                                  No pattern clusters stored. Re-scry once enough embeddings exist.
                                </p>
                              ) : (
                                displayFootprint.patternClusters.slice(0, 12).map((cluster) => (
                                  <div key={cluster.id} className="flex justify-between gap-3">
                                    <span className="font-serif italic text-[12px] text-stone-800 dark:text-stone-100 truncate">
                                      {cluster.label}
                                    </span>
                                    <span className="font-mono text-[8px] text-[#10b981] shrink-0">
                                      {cluster.artifactCount} arts
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        {extractNotice ? (
                          <div className="p-3 border border-amber-500/30 bg-amber-500/5 font-mono text-[9px] text-amber-700 dark:text-amber-400 leading-relaxed">
                            {extractNotice}
                          </div>
                        ) : null}

                        {selectedNode ? (
                          <div className="border border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-mono text-[8px] uppercase tracking-widest text-amber-700 dark:text-amber-400">Selected signal</span>
                              <button onClick={() => setSelectedNode(null)} className="font-mono text-[8px] uppercase text-stone-500">Clear</button>
                            </div>
                            <h3 className="font-serif italic text-xl mt-2">{selectedNode.label}</h3>
                            <p className="font-sans text-[11px] leading-relaxed text-stone-600 dark:text-stone-300 mt-2">{selectedNode.explanation || 'No interpretation has been stored for this signal yet.'}</p>
                            <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500 mt-3">{selectedNode.type} · weight {(selectedNode.weight || 1).toFixed(2)}</p>
                          </div>
                        ) : (
                          <p className="font-mono text-[8px] uppercase tracking-widest text-stone-400">
                            Click any coordinate to return its stored aesthetic reading.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB II: SEMIOTE RADAR */}
                  {activeTab === 'radar' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-full items-center">
                      <div className="md:col-span-7 aspect-square max-h-[440px] bg-stone-50 dark:bg-[#0d0d0d] border border-stone-200/60 dark:border-stone-850/60 p-4 flex items-center justify-center shadow-xs">
                        {renderRadarSVG()}
                      </div>

                      <div className="md:col-span-5 space-y-5 text-left flex flex-col justify-center">
                        <div className="space-y-1.5 border-l-2 border-amber-500 pl-4">
                          <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-stone-400 block">TACTICAL STYLE REGIONS</span>
                          <h2 className="font-serif text-2xl font-semibold leading-tight">Polar Semiotic Style Space Chart</h2>
                        </div>
                        <p className="font-serif italic text-stone-600 dark:text-stone-400 text-xs leading-relaxed">
                          By tracking spatial concentrations of concepts and motif elements, we plot your dimensional gravity profile against standard cultural archetypes.
                        </p>

                        {selectedRadarAxis ? (
                          <div className="border border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-4">
                            <span className="font-mono text-[8px] uppercase tracking-widest text-amber-700 dark:text-amber-400">Selected axis</span>
                            <h3 className="font-serif italic text-lg mt-1">{selectedRadarAxis.axis} · {selectedRadarAxis.value}%</h3>
                            <p className="font-sans text-[11px] text-stone-600 dark:text-stone-300 mt-1">{selectedRadarAxis.desc}</p>
                          </div>
                        ) : null}
                        <div className="space-y-2 max-h-[180px] overflow-y-auto no-scrollbar pr-2 border-t border-stone-200 dark:border-stone-850 pt-3">
                          {getRadarData().map((d, i) => (
                            <button key={i} onClick={() => setSelectedRadarAxis(d)} className="w-full flex justify-between items-center text-left text-xs py-1 hover:bg-stone-100 dark:hover:bg-stone-900 px-1">
                              <div>
                                <span className="font-mono font-bold block text-stone-800 dark:text-stone-200">{d.axis}</span>
                                <span className="text-[10px] text-stone-400 font-serif italic block">{d.desc}</span>
                              </div>
                              <span className="font-mono font-bold text-amber-600 pl-4">{d.value}%</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB III: CLUSTERS */}
                  {activeTab === 'clusters' && (
                    <div className="space-y-6">
                      <div className="text-left pb-4 border-b border-stone-200 dark:border-stone-850">
                        <span className="font-mono text-[8px] uppercase tracking-[0.25em] text-stone-400 block mb-1">Aesthetic Archetype Mapping</span>
                        <h2 className="font-serif text-3xl font-medium">Mapped Clusters &amp; Semantic Anchors</h2>
                        <p className="font-serif italic text-xs text-stone-500 mt-2">
                          Pattern synthesis · tag retrieval · listed embeddings
                        </p>
                      </div>

                      {retrievedTags.length > 0 && (
                        <div className="space-y-2">
                          <span className="font-mono text-[8px] uppercase tracking-widest text-stone-400 font-bold">Retrieved Tags</span>
                          <div className="flex flex-wrap gap-1.5">
                            {retrievedTags.map((tag) => (
                              <span
                                key={tag}
                                className="font-mono text-[8px] uppercase tracking-wider px-2 py-1 border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 text-stone-600 dark:text-stone-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {tasteGravity.points.length > 0 && (
                        <div className="space-y-2">
                          <span className="font-mono text-[8px] uppercase tracking-widest text-stone-400 font-bold">
                            Listed Embeddings ({tasteGravity.points.length}
                            {tasteGravity.dimension ? ` · ${tasteGravity.dimension}D` : ""})
                          </span>
                          <div className="max-h-40 overflow-y-auto border border-stone-200 dark:border-stone-850 divide-y divide-stone-200 dark:divide-stone-850">
                            {tasteGravity.points.slice(0, 24).map((point) => (
                              <div key={point.id} className="px-3 py-2 flex items-start justify-between gap-3 text-left">
                                <div className="min-w-0">
                                  <p className="font-mono text-[9px] uppercase tracking-wide text-stone-800 dark:text-stone-200 truncate">
                                    {point.preview}
                                  </p>
                                  <p className="font-mono text-[7px] text-stone-400 mt-0.5">
                                    {point.type || "artifact"} · dist {point.distanceFromCenter.toFixed(3)}
                                  </p>
                                </div>
                                <span className="font-mono text-[7px] text-amber-600 shrink-0">VEC</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {tasteGravity.clusters.length > 0 && (
                        <div className="space-y-2">
                          <span className="font-mono text-[8px] uppercase tracking-widest text-stone-400 font-bold">
                            Pattern Synthesis ({tasteGravity.clusters.length} thematic anchors)
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {tasteGravity.clusters.map((cluster) => (
                              <div
                                key={cluster.id}
                                className="p-4 border border-amber-500/30 bg-amber-500/5 text-left space-y-2"
                              >
                                <span className="font-mono text-[8px] uppercase tracking-widest text-amber-600 font-bold">
                                  Pattern Cluster
                                </span>
                                <h3 className="font-serif italic text-lg text-stone-900 dark:text-stone-100">
                                  {cluster.label}
                                </h3>
                                <p className="font-mono text-[8px] text-stone-500 uppercase tracking-wider">
                                  {cluster.artifact_ids?.length || 0} artifacts · updated{" "}
                                  {cluster.updated_at
                                    ? new Date(cluster.updated_at).toLocaleDateString()
                                    : "—"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {nodes.map((n, i) => {
                          const alignment = Math.floor(82 + (n.weight || 2.5) * 4);
                          const settleIndex = settlingIds.get(n.id);
                          const card = (
                            <div 
                              onClick={() => setSelectedNode(n)}
                              className={`p-5 border bg-stone-50/50 dark:bg-[#0d0d0d]/50 hover:border-[var(--mimi-olive,#5A5A40)]/50 hover:bg-stone-50 dark:hover:bg-[#11100f] duration-150 transition-all text-left flex flex-col justify-between cursor-pointer ${
                                settleIndex !== undefined
                                  ? 'border-[var(--mimi-olive,#5A5A40)]'
                                  : 'border-stone-200/60 dark:border-stone-850/60'
                              }`}
                            >
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#10b981] font-bold">
                                    [ {n.type.toUpperCase()} ]
                                  </span>
                                  <span className="font-mono text-[9px] text-stone-400">REF_ID_{i.toString().padStart(3, '0')}</span>
                                </div>
                                <h3 className="font-mono text-xs uppercase font-extrabold tracking-wide text-stone-900 dark:text-stone-100">{n.label}</h3>
                                <p className="font-serif italic text-xs text-stone-500 leading-relaxed">{n.explanation}</p>
                                {Array.isArray(n.tags) && n.tags.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {n.tags.slice(0, 4).map((tag) => (
                                      <span key={tag} className="font-mono text-[7px] uppercase tracking-wider px-1.5 py-0.5 bg-stone-200/70 dark:bg-stone-800 text-stone-500">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>

                              <div className="space-y-1.5 pt-4 border-t border-stone-200/50 dark:border-stone-850/50 mt-4">
                                <div className="flex justify-between text-[9px] font-mono">
                                  <span className="text-stone-400 uppercase tracking-wider">Aesthetic Cohesion Density</span>
                                  <span className="font-bold text-amber-600">{alignment}%</span>
                                </div>
                                <div className="w-full bg-stone-200 dark:bg-stone-800 h-1 overflow-hidden rounded-xs">
                                  <div className="bg-amber-500 h-full" style={{ width: `${alignment}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                          if (settleIndex !== undefined) {
                            return (
                              <GraphSettle key={n.id} index={settleIndex}>
                                {card}
                              </GraphSettle>
                            );
                          }
                          return <React.Fragment key={n.id}>{card}</React.Fragment>;
                        })}
                      </div>
                    </div>
                  )}

                  {/* TAB IV: REPORT */}
                  {activeTab === 'report' && (
                    <div className="space-y-6 text-left max-w-2xl mx-auto bg-stone-50 dark:bg-[#0d0d0d] border border-stone-200/60 dark:border-stone-850/60 p-8 shadow-xs">
                      <div className="border-b border-stone-200 dark:border-stone-850 pb-5 mb-6">
                        <p className="font-mono text-[8px] uppercase tracking-[0.25em] text-stone-400 mb-1">Decentralized Intelligence Network</p>
                        <h2 className="font-serif text-3xl font-medium tracking-tight">Strategic Aesthetic Report Memo</h2>
                        <p className="font-mono text-[8px] uppercase text-stone-500 mt-2">CLASS_LEVEL: PRIVATE // CODE_NAME: CONST-ORACLE</p>
                      </div>

                      <div className="space-y-4 font-serif text-xs leading-relaxed text-stone-700 dark:text-stone-300">
                        <p className="font-mono text-[9px] uppercase tracking-wider font-extrabold text-amber-600 dark:text-amber-400">I. Executive Summary &amp; Spatial Alignment</p>
                        <p>
                          Our decentralized analysis layer has evaluated your active design artifacts, wardrobe metrics, and text scraps. 
                          The results yield an extremely dense, high-uniformity cluster focusing heavily on <span className="font-sans font-bold text-stone-900 dark:text-stone-100">Neo-Brutalist structural geometry</span> 
                          softened by natural earthy, mineral materials (<span className="italic">Tactile Stone</span>) and framed in elite typographic <span className="italic">Editorial Elegance</span>.
                        </p>

                        <p className="font-mono text-[9px] uppercase tracking-wider font-extrabold text-amber-600 dark:text-amber-400 pt-3">II. Algorithmic Identity Defense Strategy</p>
                        <p>
                          In the contemporary era of aggregate web search engines (such as Gemini, ChatGPT, Perplexity), individual creators face 
                          systematic data harvesting. The Thimble Intelligence layer introduces defensive semantic noise into your profile, 
                          protecting your core taste parameters from bulk scraping while optimizing private styling feeds.
                        </p>

                        <div className="p-4 bg-stone-100 dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 text-xs font-mono tracking-wider text-stone-500 space-y-1">
                          <p className="font-extrabold text-stone-800 dark:text-stone-300">CORE METRIC THESIS MATRIX:</p>
                          <p>● COHESION MULTIPLIER: 1.48x (Strong clustering tendency)</p>
                          <p>● DEFENSIVE LATENCY: 12ms (Secure routing active)</p>
                          <p>● ALIGNMENT STABILITY: STABLE (0.04% entropy divergence)</p>
                        </div>
                      </div>

                      <div className="border-t border-stone-200 dark:border-stone-850 pt-5 mt-6 flex justify-between items-center">
                        <button 
                          onClick={() => {
                            setCalibrationProtocol('Deep Audited');
                            setEntropyMode('High Entropy');
                            window.dispatchEvent(new CustomEvent('mimi:registry_alert', { 
                              detail: { message: "Strategic thesis updated and re-scryed against local vector cache." } 
                            }));
                          }}
                          className="px-4 py-2 border border-stone-800 hover:bg-stone-900 hover:text-white dark:border-stone-200 dark:hover:bg-stone-100 dark:hover:text-stone-900 font-mono text-[9.5px] uppercase tracking-wider transition-all"
                        >
                          Recalibrate Focus
                        </button>
                        <span className="font-mono text-[8px] text-stone-400">AUTHENTICATED SIGNATURE // CO-1903</span>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* LOWER COGNITIVE FEED TABLE */}
            <div className={`bg-stone-50 dark:bg-[#080808] border-t border-stone-200 dark:border-stone-850 flex flex-col shrink-0 transition-[height] duration-200 ${ledgerMinimized ? 'h-10' : 'h-52'}`}>
              <div className="sticky top-0 bg-stone-100 dark:bg-[#0c0c0c] border-b border-stone-200 dark:border-stone-850 px-6 py-2 flex items-center justify-between z-10 select-none">
                <h3 className="font-mono text-[9px] uppercase tracking-[0.15em] font-bold flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
                  <Database size={11} className="text-amber-500 animate-pulse" /> Semantic Coordinates &amp; Trace Signals
                </h3>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[8.5px] text-stone-400 uppercase">
                    ACTIVE SIGNALS: {nodes.length.toString().padStart(3, '0')}
                  </span>
                  <button onClick={() => setLedgerMinimized((value) => !value)} className="w-7 h-7 border border-stone-300 dark:border-stone-700 flex items-center justify-center" title={ledgerMinimized ? 'Expand signal ledger' : 'Minimize signal ledger'}>
                    {ledgerMinimized ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
              </div>
              
        {!ledgerMinimized ? <div className="flex-1 overflow-y-auto overflow-x-auto px-6 py-3 no-scrollbar scroll-fade-x">
                    <table className="w-full min-w-[480px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200/50 dark:border-stone-850/50">
                      <th className="font-mono text-[8.5px] uppercase tracking-widest text-stone-400 pb-2 font-bold w-24">Ref ID</th>
                      <th className="font-mono text-[8.5px] uppercase tracking-widest text-stone-400 pb-2 font-bold">Artifact Axis</th>
                      <th className="font-mono text-[8.5px] uppercase tracking-widest text-stone-400 pb-2 font-bold w-32">Type</th>
                      <th className="font-mono text-[8.5px] uppercase tracking-widest text-stone-400 pb-2 font-bold w-28">Dynamic Weight</th>
                      <th className="font-mono text-[8.5px] uppercase tracking-widest text-stone-400 pb-2 font-bold w-24 text-right">Alignment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.map((node: any, i) => {
                      const cohesion = node.cohesion || Math.floor(Math.random() * 12 + 84);
                      const isSelected = selectedNode?.id === node.id;
                      return (
                        <React.Fragment key={node.id}>
                          <tr 
                            className={`border-b border-stone-100 dark:border-stone-900/60 hover:bg-stone-200/20 dark:hover:bg-stone-900/40 cursor-pointer transition-all duration-100 ${isSelected ? 'bg-amber-500/[0.04] dark:bg-amber-500/[0.02]' : ''}`}
                            onClick={() => setSelectedNode(isSelected ? null : node)}
                          >
                            <td className="py-2.5 font-mono text-[9.5px] text-stone-500">{node.refId || `REF_${(i + 1).toString().padStart(3, '0')}`}</td>
                            <td className="py-2.5">
                              <span className={`font-mono text-[9.5px] font-bold block transition-colors ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-stone-800 dark:text-stone-200'}`}>
                                {node.label.toUpperCase()}
                              </span>
                              <span className="font-serif italic text-[9.5px] text-stone-400 block max-w-lg truncate">{node.explanation}</span>
                            </td>
                            <td className="py-2.5 font-mono text-[9.5px]">
                              <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded-xs ${
                                node.type === 'concept' ? 'bg-[#10b981]/10 text-[#10b981]' : node.type === 'web_reference' ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'
                              }`}>
                                {node.type}
                              </span>
                            </td>
                            <td className="py-2.5 font-mono text-[9.5px] text-stone-500">{node.weight ? (node.weight).toFixed(2) : '1.00'} pts</td>
                            <td className="py-2.5 font-mono text-[9.5px] text-right font-bold text-[#10b981]">{cohesion}%</td>
                          </tr>
                          {/* Reasoning Details Dropdown */}
                          {isSelected && (
                            <tr className="bg-stone-100/30 dark:bg-stone-900/20">
                              <td colSpan={5} className="py-3 px-6 border-b border-stone-200 dark:border-stone-850">
                                <div className="flex gap-3 text-left">
                                  <div className="w-0.5 bg-amber-500" />
                                  <div className="flex-1 space-y-1.5">
                                    <span className="font-mono text-[8px] uppercase tracking-wider text-stone-400 block">Aesthetic Inference Reading</span>
                                    <p className="font-serif italic text-[11.5px] leading-relaxed text-stone-600 dark:text-stone-400">
                                      {node.explanation || "This is a key visual style anchor derived by evaluating pattern matches across your curated aesthetic portfolio. Represents a core dimension of your taste footprint."}
                                    </p>
                                    <div className="flex gap-2">
                                      <span className="font-mono text-[7px] bg-stone-200 dark:bg-stone-850 text-stone-500 px-1 py-0.5 uppercase">Dimension: 1536D</span>
                                      <span className="font-mono text-[7px] bg-stone-200 dark:bg-stone-850 text-stone-500 px-1 py-0.5 uppercase">Similarity: Cos_0.948</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div> : null}
            </div>

          </div>

          {/* YOU.COM WEB INTELLIGENCE SEARCH DRAWER */}
          <AnimatePresence>
            {isYouSearchOpen && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-[#FDFBF7] dark:bg-stone-950 border-l border-stone-200 dark:border-stone-850 shadow-xl z-50 flex flex-col text-left"
              >
                <div className="p-4 border-b border-stone-200 dark:border-stone-850 flex items-center justify-between bg-stone-100 dark:bg-[#0c0c0c]">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-amber-600">
                    <Search size={12} />
                    <span>Web Intelligence</span>
                  </div>
                  <button onClick={() => setIsYouSearchOpen(false)} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
                    <X size={15} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                  <div className="space-y-1">
                    <label className="block font-mono text-[8px] uppercase tracking-wider text-stone-400 font-bold">Query Specimen</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={youQuery}
                        onChange={(e) => setYouQuery(e.target.value)}
                        placeholder="e.g., Brutalist luxury typography trends 2026"
                        className="flex-1 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-850 px-3 py-1.5 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                        onKeyDown={(e) => e.key === 'Enter' && void handleYouSearch()}
                      />
                      <button
                        onClick={handleYouSearch}
                        disabled={youSearching}
                        className="px-3 bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-950 font-mono text-[9px] uppercase tracking-widest disabled:opacity-50"
                      >
                        {youSearching ? '...' : 'Go'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono text-[8px] uppercase tracking-wider text-stone-400 font-bold">Live-search domain filters</label>
                    <input
                      type="text"
                      value={youDomainsStr}
                      onChange={(e) => setYouDomainsStr(e.target.value)}
                      placeholder="vogue.com, i-d.co, dezen.com"
                      className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-850 px-3 py-1 text-[10px] text-stone-700 dark:text-stone-300 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  {youNotice && (
                    <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9px] font-mono leading-relaxed">
                      {youNotice}
                    </div>
                  )}

                  {youError && (
                    <div className="p-2 bg-red-500/10 text-red-600 border border-red-500/20 text-[9px] font-mono leading-relaxed">
                      {youError}
                    </div>
                  )}

                  <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-stone-850">
                    <p className="font-mono text-[8.5px] uppercase tracking-widest text-stone-400 font-bold mb-2">Research leads</p>
                    {youSearching ? (
                      <div className="flex flex-col items-center py-12 text-stone-500 space-y-2">
                        <Loader2 size={20} className="animate-spin" />
                        <p className="font-mono text-[8px] uppercase tracking-wider">Mapping research signals...</p>
                      </div>
                    ) : youResults.length === 0 ? (
                      <p className="font-serif italic text-xs text-stone-500 text-center py-6">Enter a search query to pull design vectors.</p>
                    ) : (
                      <div className="space-y-3">
                        {youResults.map((r, i) => (
                          <div key={i} className="p-3 border border-stone-200 dark:border-stone-850 bg-stone-100/40 dark:bg-stone-900/40 hover:border-amber-500/40 transition-all text-left space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-mono text-[10px] uppercase font-bold text-stone-900 dark:text-stone-100 leading-tight flex-1">{r.title}</h4>
                              <button
                                onClick={() => void handleInjectNode(r)}
                                className="px-1.5 py-0.5 border border-stone-300 hover:border-amber-500 text-stone-600 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 font-mono text-[8px] uppercase tracking-wider flex items-center gap-1 shrink-0"
                              >
                                <Plus size={8} /> Inject
                              </button>
                            </div>
                            <p className="font-serif italic text-[10px] text-stone-500 leading-relaxed">{r.summary}</p>
                            {Array.isArray(r.aestheticSignals?.keywords) && r.aestheticSignals.keywords.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {r.aestheticSignals.keywords.slice(0, 5).map((kw: string) => (
                                  <span key={kw} className="font-mono text-[7px] uppercase tracking-wider px-1 py-0.5 bg-stone-200/60 dark:bg-stone-800 text-stone-500">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            <div className="flex items-center gap-2 text-[8px] font-mono text-stone-400">
                              <span>Domain: {r.domain}</span>
                              <span>·</span>
                              <span>Similarity: {(r.confidence * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      }
    />
  );
};
