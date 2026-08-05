import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Sparkles, Activity, ArrowRight, Search, Play, FileText, 
  LayoutTemplate, MessageSquare, Loader2, History, Database, 
  ArrowUpRight, Layers, Cpu, HardDrive, Compass, Shield, HelpCircle,
  X, Eye, ChevronDown, ChevronUp, CheckCircle, Info, Landmark
} from 'lucide-react';
import { askCodex } from '../services/geminiService';
import { useTheme, AestheticEra } from '../contexts/ThemeContext';
import { mobileCanvasClass, mobileHairlineFieldClass } from '../lib/mobileShell';

type CodexTab = 'read' | 'use' | 'cases';
type CodexRootTab = 'manual' | 'modules' | 'ask';

interface CodexPrinciple {
  id: string;
  title: string;
  thesis: string;
  operationalMeaning: string;
  readContent: string;
  diagnostics: {
    healthy: string;
    overdone: string;
    currentRead: string;
  };
  actions: {
    label: string;
    icon: React.ReactNode;
  }[];
  cases: {
    title: string;
    description: string;
  }[];
}

export interface MimiModule {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  whyText: string;
  howText: string;
  forWhatText: string;
  useCaseTitle: string;
  useCaseDescription: string;
  diagnostics: {
    input: string;
    engine: string;
    output: string;
    moat: string;
  };
}

const codexPrinciples: CodexPrinciple[] = [
  {
    id: 'sovereign-curation',
    title: 'Sovereign Curation',
    thesis: 'A structured environment for gathering, interpreting, refining, and extending aesthetic intelligence.',
    operationalMeaning: 'The machine does not replace taste. It helps structure the user’s relationship to it.',
    readContent: 'Mimi is not a generic content tool. It is a system for sovereign curation: a structured environment for gathering, interpreting, refining, and extending aesthetic intelligence. Most software organizes itself by feature. Mimi does not. Mimi is organized by cognitive sequence: the order in which a person naturally moves when turning instinct into form.\n\nIn this sense, Mimi is both a tool and a method. It supports personal curation, visual authorship, aesthetic memory, strategic procurement, and cultural positioning. The machine does not replace taste. It helps structure the user’s relationship to it.',
    diagnostics: {
      healthy: 'Clear motifs, strong exclusions, coherent tension.',
      overdone: 'Trend-chasing, overcollection, aesthetic flattening.',
      currentRead: 'High signal, low hierarchy; visually rich but under-edited.'
    },
    actions: [
      { label: 'Apply to current artifact', icon: <Play size={14} /> },
      { label: 'Test against Tailor Logic', icon: <Activity size={14} /> },
      { label: 'Turn into editorial rule', icon: <FileText size={14} /> }
    ],
    cases: [
      { title: 'Archive Example 01', description: 'A moodboard that successfully balances tension and motif.' }
    ]
  },
  {
    id: 'cognitive-sequence',
    title: 'The Cognitive Sequence',
    thesis: 'Collect → Organize → Edit → Create → Publish',
    operationalMeaning: 'Gather before you structure; structure before you publish. Menu sections match this loop — not six invented chamber names.',
    readContent: 'The live menu is organized by phase: Collect, Organize, Edit, Create, Publish, then All Chambers for identity and house tools.\n\nUsers do not think in feature lists. They move through phases: bring material in (Scry, Scribe, Darkroom), catalog it (Pocket, Wardrobe), shape the editorial angle (The Edit), fabricate (Worktable, Mood Board, Tailor), then export and surface (The Press, Front Page, The Stand).\n\nDo not treat route aliases or chamber wings as extra chambers. Threads lives inside Scribe. Correspondents and Cliques are Proscenium wings. Listing them again in the menu or this manual creates false product surface area.\n\nThe loop prevents two failures: premature strategy (optimizing before enough material) and endless reflection (interpreting without converting insight into publishable form).',
    diagnostics: {
      healthy: 'Fluid movement Collect → Organize → Edit → Create → Publish.',
      overdone: 'Premature strategy, or gathering forever without an Edit/Press handoff.',
      currentRead: 'You are early in Collect/Organize — gather before refining.'
    },
    actions: [
      { label: 'Analyze this board', icon: <Search size={14} /> },
      { label: 'Generate a critique', icon: <MessageSquare size={14} /> }
    ],
    cases: [
      { title: 'Case Study: The Shift', description: 'Moving from endless gathering to decisive Edit → Press.' }
    ]
  },
  {
    id: 'refine',
    title: 'Edit & Publish',
    thesis: 'Interpretation becomes direction in The Edit; packaging happens in The Press.',
    operationalMeaning: 'Taste becomes useful when it can move into a compile, then an export — not when it stays in notes.',
    readContent: 'The Edit is where fragments become thesis and layout. The Press is where that compile becomes an export pack or publishable artifact. These are adjacent phases, not synonyms — do not collapse Press into Edit, and do not re-list Threads or Lens as if they were separate top-level chambers.\n\nAlign outputs with Tailor identity, organize strategic action in Intel Hub when needed, and keep GEO packaging under the GEO Engine chamber rather than repeating it as a free-floating principle everywhere.',
    diagnostics: {
      healthy: 'Precise, structured, editorial, strategic.',
      overdone: 'Rigid polish that erases the original raw instinct.',
      currentRead: 'Materials exist; editorial direction and export path are still open.'
    },
    actions: [
      { label: 'Analyze this board', icon: <Search size={14} /> },
      { label: 'Find weak signals', icon: <Activity size={14} /> },
      { label: 'Suggest stronger composition', icon: <LayoutTemplate size={14} /> },
      { label: 'Rewrite as editorial thesis', icon: <FileText size={14} /> }
    ],
    cases: [
      { title: 'Editorial Edit', description: 'Applying compile discipline to a chaotic moodboard, then handing off to The Press.' }
    ]
  },
  {
    id: 'geo',
    title: 'GEO Engine (AI Visibility)',
    thesis: 'Making the brand legible to machine intelligence.',
    operationalMeaning: 'Structure aesthetic language so models cite you accurately — owned by the GEO Engine chamber, not duplicated as Archive/Signals siblings.',
    readContent: 'Generative Engine Optimization packs visual and textual identity into machine-readable structures. Models do not “view” UI; they read data. Export a GEO manifest (JSON-LD, retrieval tokens, headers) from the GEO Engine chamber so external AI search cites the brand correctly.\n\nThis principle describes that chamber’s job. It is not a second menu item named Signals, Archive Lens, or Brand OS.',
    diagnostics: {
      healthy: 'Brand identity is accurately cited in AI search outputs.',
      overdone: 'Metadata stuffing that hallucinates context.',
      currentRead: 'Internal taste is strong; external machine markers may still be thin.'
    },
    actions: [
      { label: 'Generate GEO Schema', icon: <Database size={14} /> },
      { label: 'Export to Web Header', icon: <ArrowUpRight size={14} /> }
    ],
    cases: [
      { title: 'Shopify JSON-LD', description: 'Injecting product schema so models understand aesthetic keywords.' }
    ]
  },
  {
    id: 'vector-embeddings',
    title: 'Vector Embeddings & Spatial Taste',
    thesis: 'Aesthetic identity is plotted, not bucketed.',
    operationalMeaning: 'Taste Graph and Scry use embeddings; do not invent a separate Archive chamber for the same map.',
    readContent: 'Saved artifacts become high-dimensional vectors. Taste Graph shows clusters; Scry searches across tags, embeddings, and the web. Together they replace lifestyle buckets (“Dark Academia”) with coordinate space.\n\nPocket holds the registry; Darkroom holds raw media; Scribe holds atoms. Those are distinct Collect/Organize chambers — not three names for one Archive module.',
    diagnostics: {
      healthy: 'A dense cluster with a clear center of gravity.',
      overdone: 'Fragmented signals diluting the map into noise.',
      currentRead: 'The spatial map is forming; baseline coordinates are establishing.'
    },
    actions: [
      { label: 'Calculate Center of Gravity', icon: <Activity size={14} /> },
      { label: 'View Latent Distance', icon: <Search size={14} /> }
    ],
    cases: [
      { title: 'The Latent Map', description: 'Distance between a brutalist specimen and a romantic poet in Taste Graph space.' }
    ]
  }
];

const mimiModules: MimiModule[] = [
  {
    id: 'studio',
    name: 'Worktable (Create)',
    badge: 'Zine Fabrication',
    tagline: 'Turn references and prompts into publication-grade zine spreads — menu label Worktable, not a second Studio chamber.',
    whyText: 'Generic page generators favor volume over visual integrity. Worktable treats spreads as atmospheric objects so fabrication stays editorial, not template-driven.',
    howText: 'Load cues, references, and Tailor context on the Worktable. Brief Calibration presets and Quiet Studio are variants of this surface — not separate Create products. Input Studio tools live here for intake and grounding.',
    forWhatText: 'Zine blueprints, cover structures, prompt packets, and handoffs into The Edit / The Press.',
    useCaseTitle: 'The Ceramic Shard Release',
    useCaseDescription: 'A sculptor drops three studio snapshots and prompts "brutalist asymmetry." Worktable fabricates a five-spread zine and stages a checkout path via Drop when commerce is in scope.',
    diagnostics: {
      input: 'Style cues, references, Tailor constraints, Pocket/Darkroom fragments.',
      engine: 'Provider-routed synthesis + layout engines.',
      output: 'Zines, briefs, image prompts, instruction packets.',
      moat: 'Spatial margins and Tailor-aware context over template clutter.'
    }
  },
  {
    id: 'tailor',
    name: 'Tailor (Create)',
    badge: 'Taste Profile',
    tagline: 'The register of coordinates, taxonomies, and negative space that keeps generation on-brand.',
    whyText: 'Without locked aesthetic constraints, generative tools collapse into trend noise. Tailor is the Create-phase constraint engine — not a synonym for Signature or Taste Graph.',
    howText: 'Reads evidence and Pocket/Darkroom material, plots center of gravity, locks traits and exclusions. Art Style Scryer / diagnostics fold into Tailor rather than appearing as sibling menu chambers.',
    forWhatText: 'A living taste profile reused by Worktable, Edit, GEO, and identity surfaces.',
    useCaseTitle: 'Anchoring "incense oxide steel"',
    useCaseDescription: 'A fragrance house imports ten metal mood photos. Tailor anchors "incense cold smoke & raw steel" and warns when copy drifts sweet.',
    diagnostics: {
      input: 'Evidence files, locked traits, negative keywords.',
      engine: 'Centroid + exclusion taxonomies.',
      output: 'Taste profiles, prompt guidance variables.',
      moat: 'Hard brand-safety thresholds against aesthetic compromise.'
    }
  },
  {
    id: 'collect',
    name: 'Collect (Scry · Scribe · Darkroom)',
    badge: 'Intake',
    tagline: 'Three Collect chambers with distinct jobs — not one fictional Archive.',
    whyText: 'Inspiration dies in unindexed folders. Splitting search (Scry), memory atoms (Scribe), and raw media (Darkroom) keeps intake honest instead of inventing an Archive/Lens mega-chamber.',
    howText: 'Scry queries tags, embeddings, and the web. Scribe captures atoms and hosts Threads as a tab (route aliases /threads → Scribe). Darkroom stages uploads before they graduate to Pocket or Worktable.',
    forWhatText: 'Search hits, memory atoms, and unprocessed media ready for Organize/Create.',
    useCaseTitle: 'Board → Atoms → Worktable',
    useCaseDescription: 'A curator Scrys a facade motif, saves citations in Scribe, parks raw shots in Darkroom, then pulls approved atoms into Worktable Used Context.',
    diagnostics: {
      input: 'Queries, notes, uploads, URLs.',
      engine: 'Search/grounding + memoryService + media staging.',
      output: 'Atoms, tagged media, specimen hits.',
      moat: 'Clear Collect ownership — no duplicate Archive listing.'
    }
  },
  {
    id: 'taste-graph',
    name: 'Taste Graph (Identity)',
    badge: 'Spatial Clusters',
    tagline: 'Cluster map of saved taste — distinct from Scribe Threads and from GEO packaging.',
    whyText: 'Folders hide intersections. Taste Graph shows relational distance so creators see durable clusters without re-listing Threads as its own All Chambers entry.',
    howText: 'Vectors from saved material project onto a cluster map. Narrative Threads remain a Scribe tab; this chamber is the taste map, not a second semantic portal.',
    forWhatText: 'Cluster views, adjacency reads, trajectory cues into Tailor/Signature.',
    useCaseTitle: 'Late-Stage Analogue',
    useCaseDescription: 'Concrete interiors and analogue synth loops sit in one cluster; the creator opens Worktable with that constellation as Used Context.',
    diagnostics: {
      input: 'Saved vectors and pocketed references.',
      engine: 'Proximity / cluster projection.',
      output: 'Taste constellations and cluster labels.',
      moat: 'Relational mapping without menu duplication.'
    }
  },
  {
    id: 'signals',
    name: 'GEO Engine (House)',
    badge: 'AI Visibility',
    tagline: 'Package Tailor identity for machine citation — one chamber, one menu row.',
    whyText: 'Conversational search crawls metadata, not layouts. Brands need a single packaging surface, not parallel "Signals" and "GEO" names.',
    howText: 'Compress Taste Profile into JSON-LD, retrieval tokens, and header-ready manifests from GEO Engine.',
    forWhatText: 'Copyable schemas, AI-readable heads, citation checks.',
    useCaseTitle: 'Intercepting Generative Recommendations',
    useCaseDescription: 'A denim label ships GEO headers; a buyer asking an AI for brutalist Japanese denim gets a structured citation.',
    diagnostics: {
      input: 'Taste Profile, category targets, motifs.',
      engine: 'JSON-LD / retrieval token compilers.',
      output: 'Indexing structures and citation matrices.',
      moat: 'Aesthetic → machine-token translation in one place.'
    }
  },
  {
    id: 'altar',
    name: 'Drop (House)',
    badge: 'Commerce',
    tagline: 'Product/checkout surface — menu label Drop; Atelier holds taste-signal pins, not checkout.',
    whyText: 'High-concept releases need ritual checkout without confusing Drop with Atelier pins or Memberships plan tiers.',
    howText: 'Configure allocation, sensory framing, and checkout. Desire pins from zines live in Atelier; plan access lives under Memberships.',
    forWhatText: 'Editorial checkouts and drop configurations.',
    useCaseTitle: 'Waxed Linen Dust Coat',
    useCaseDescription: 'A designer mounts a limited coat drop with friction and atmosphere; the buyer’s receipt can mirror into Pocket without renaming Drop as Altar in the menu.',
    diagnostics: {
      input: 'Drop parameters, allocation, commerce config.',
      engine: 'Checkout + presentation controllers.',
      output: 'Transactional drop surfaces.',
      moat: 'Commerce separated from Atelier pins and memberships.'
    }
  }
];

const PrincipleCard = ({ principle }: { principle: CodexPrinciple }) => {
  const [activeTab, setActiveTab] = useState<CodexTab>('read');

  return (
    <div className="border border-nous-border bg-nous-base/50 p-6 mb-8 rounded-none">
      <div className="mb-6 mr-10">
        <h2 className="font-serif italic text-2xl text-nous-text mb-2">{principle.title}</h2>
        <p className="font-sans text-sm text-nous-text font-medium mb-1">"{principle.thesis}"</p>
        <p className="font-sans text-xs text-nous-subtle uppercase tracking-widest">{principle.operationalMeaning}</p>
      </div>

      <div className="flex border-b border-nous-border mb-6">
        {(['read', 'use', 'cases'] as CodexTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
              activeTab === tab 
                ? 'text-nous-text border-b border-nous-text' 
                : 'text-nous-subtle hover:text-nous-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'read' && (
            <div className="prose prose-invert prose-p:font-serif prose-p:text-sm prose-p:leading-relaxed prose-p:text-nous-subtle max-w-none">
              {principle.readContent.split('\n\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          )}

          {activeTab === 'use' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-nous-text mb-3 flex items-center gap-2">
                  <Activity size={12} /> Diagnostics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-nous-surface p-3 border border-nous-border/50">
                    <span className="block font-mono text-[9px] uppercase tracking-widest text-green-500/80 mb-1">Healthy</span>
                    <p className="font-serif text-xs text-nous-subtle">{principle.diagnostics.healthy}</p>
                  </div>
                  <div className="bg-nous-surface p-3 border border-nous-border/50">
                    <span className="block font-mono text-[9px] uppercase tracking-widest text-red-500/80 mb-1">Overdone</span>
                    <p className="font-serif text-xs text-[#b88]">{principle.diagnostics.overdone}</p>
                  </div>
                  <div className="bg-nous-surface p-3 border border-nous-text/20">
                    <span className="block font-mono text-[9px] uppercase tracking-widest text-nous-text mb-1">Current Read</span>
                    <p className="font-serif text-xs text-nous-text">{principle.diagnostics.currentRead}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-nous-text mb-3 flex items-center gap-2">
                  <Play size={12} /> Actions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {principle.actions.map((action, i) => (
                    <button 
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 bg-nous-surface border border-nous-border hover:border-nous-text transition-colors font-sans text-xs text-nous-text"
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cases' && (
            <div className="space-y-4">
              {principle.cases.map((c, i) => (
                <div key={i} className="border border-nous-border p-4 hover:bg-nous-surface transition-colors cursor-pointer group">
                  <h4 className="font-sans text-sm text-nous-text mb-1 group-hover:underline">{c.title}</h4>
                  <p className="font-serif text-xs text-nous-subtle">{c.description}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const ModuleCard = ({ m, index }: { m: MimiModule; index: number }) => {
  const [isOpen, setIsOpen] = useState(index === 0);

  // Helper map for icons
  const getIcon = (id: string) => {
    switch (id) {
      case 'studio': return <Layers size={16} className="text-nous-text" />;
      case 'tailor': return <Cpu size={16} className="text-nous-text" />;
      case 'collect': return <HardDrive size={16} className="text-nous-text" />;
      case 'taste-graph': return <Compass size={16} className="text-nous-text" />;
      case 'signals': return <Shield size={16} className="text-nous-text" />;
      case 'altar': return <Landmark size={16} className="text-nous-text" />;
      default: return <BookOpen size={16} className="text-nous-text" />;
    }
  };

  return (
    <div className="border border-nous-border bg-nous-base/40 mb-6 transition-all duration-300">
      {/* Header and Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-5 flex items-center justify-between hover:bg-nous-surface/30 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-none border border-nous-border bg-nous-surface">
            {getIcon(m.id)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-[9px] text-nous-subtle uppercase tracking-wider">No. 0{index + 1}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-nous-text/20" />
              <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 bg-nous-text/5 border border-nous-border/50 text-nous-text">
                {m.badge}
              </span>
            </div>
            <h3 className="font-serif italic text-lg text-nous-text font-bold leading-tight">{m.name}</h3>
          </div>
        </div>
        <div className="text-nous-subtle hover:text-nous-text">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-nous-border"
          >
            <div className="p-6 space-y-6">
              {/* Tagline sentence */}
              <p className="font-sans text-sm font-medium text-nous-text border-l-2 border-nous-text pl-4 py-1 italic bg-nous-surface/10">
                "{m.tagline}"
              </p>

              {/* Grid Section for WHY / HOW / FOR WHAT / USE CASE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Column 1: Philosophy (Why / How) */}
                <div className="space-y-5">
                  <div>
                    <h4 className="font-mono text-[9px] uppercase tracking-widest text-[#777] font-black mb-1.5 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-800" /> WHY (The Philosophical Tension)
                    </h4>
                    <p className="font-serif text-xs text-nous-subtle leading-relaxed text-justify">
                      {m.whyText}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-mono text-[9px] uppercase tracking-widest text-[#777] font-black mb-1.5 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-800" /> HOW (The Tactical Interaction)
                    </h4>
                    <p className="font-serif text-xs text-nous-subtle leading-relaxed text-justify">
                      {m.howText}
                    </p>
                  </div>
                </div>

                {/* Column 2: Outcomes (For What / Use Case) */}
                <div className="space-y-5 bg-nous-surface/20 p-4 border border-nous-border/40">
                  <div>
                    <h4 className="font-mono text-[9px] uppercase tracking-widest text-nous-text font-black mb-1.5 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-800" /> FOR WHAT (The Generated Artifact)
                    </h4>
                    <p className="font-sans text-xs text-nous-subtle leading-relaxed">
                      {m.forWhatText}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-mono text-[9px] uppercase tracking-widest text-nous-text font-black mb-1.5 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-yellow-600 animate-pulse" /> USE CASE EXAMPLE
                    </h4>
                    <div className="font-serif border border-dashed border-nous-border/60 p-3 bg-nous-base/60">
                      <p className="font-serif text-xs font-semibold text-nous-text mb-1 italic">
                        {m.useCaseTitle}
                      </p>
                      <p className="font-serif text-[11px] text-[#888] leading-relaxed">
                        {m.useCaseDescription}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Under-the-hood Metadata Grid (Anti-Larp Technical Spec) */}
              <div className="border-t border-nous-border border-dashed pt-4">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Info size={11} className="text-[#888]" />
                  <span className="font-mono text-[8px] uppercase tracking-widest text-[#888] font-semibold">Technical Ingestion Flow</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-nous-surface/30 p-4 border border-nous-border">
                  <div className="space-y-1">
                    <span className="block font-mono text-[7px] uppercase tracking-widest text-[#888]">Primary Input</span>
                    <span className="block font-mono text-[10px] text-nous-text leading-tight">{m.diagnostics.input}</span>
                  </div>
                  <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-nous-border pt-2 sm:pt-0 sm:pl-4">
                    <span className="block font-mono text-[7px] uppercase tracking-widest text-[#888]">Engine Processor</span>
                    <span className="block font-mono text-[10px] text-nous-text leading-tight">{m.diagnostics.engine}</span>
                  </div>
                  <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-nous-border pt-2 sm:pt-0 sm:pl-4">
                    <span className="block font-mono text-[7px] uppercase tracking-widest text-[#888]">Core Deliverable</span>
                    <span className="block font-mono text-[10px] text-nous-text leading-tight">{m.diagnostics.output}</span>
                  </div>
                  <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-nous-border pt-2 sm:pt-0 sm:pl-4">
                    <span className="block font-mono text-[7px] uppercase tracking-widest text-[#888]">Aesthetic Moat</span>
                    <span className="block font-mono text-[10px] text-nous-text leading-tight">{m.diagnostics.moat}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SystemLineage = () => {
  const { currentEra, setEra } = useTheme();

  const eras: { id: AestheticEra; name: string; description: string }[] = [
    {
      id: 'genesis',
      name: 'Genesis (v1)',
      description: 'Raw, brutalist, high-contrast. Monospace typography and zero textures. The system in its most unrefined, computational state.'
    },
    {
      id: 'editorial',
      name: 'Editorial (v2)',
      description: 'Clean, structured, and typographic. Public Sans and Cormorant Garamond. Focus on legibility and editorial layout without atmospheric interference.'
    },
    {
      id: 'ethereal',
      name: 'Ethereal (v3)',
      description: 'The current manifestation. Luminescent text, paper textures, and Geist Variable. A blend of the digital and the physical.'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mb-12 bg-nous-surface border border-nous-border p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <History size={16} className="text-nous-text" />
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-nous-text">System Lineage</h2>
      </div>
      <p className="font-serif text-sm text-nous-subtle mb-6">
        Mimi is a living artifact. The interface itself is a case study in aesthetic evolution. Select an era to resurrect its structural DNA across the entire application.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {eras.map(era => (
          <button
            key={era.id}
            onClick={() => setEra(era.id)}
            className={`text-left p-4 border transition-all ${
              currentEra === era.id 
                ? 'border-nous-text bg-nous-text/5' 
                : 'border-nous-border hover:border-nous-text/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-sans text-sm font-medium text-nous-text">{era.name}</h3>
              {currentEra === era.id && <span className="w-2 h-2 rounded-full bg-nous-text" />}
            </div>
            <p className="font-serif text-xs text-nous-subtle leading-relaxed">
              {era.description}
            </p>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export const CodexView: React.FC = () => {
  const [activeRootTab, setActiveRootTab] = useState<CodexRootTab>('modules');
  const [askQuery, setAskQuery] = useState('');
  const [askResponse, setAskResponse] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuery.trim()) return;
    
    setIsAsking(true);
    try {
      const response = await askCodex(askQuery, { currentStage: 'Refine' });
      setAskResponse(response);
    } catch (error) {
      console.error("Error asking Codex:", error);
      setAskResponse("The Codex is currently silent. Please try again.");
    } finally {
      setIsAsking(false);
    }
  };

  const suggestedQueries = [
    "What is weak about this?",
    "What principle am I violating?",
    "Which part of the sequence am I skipping?",
    "How would Mimi interpret this board?"
  ];

  const filteredModules = mimiModules.filter(m => 
    m.name.toLowerCase().includes(moduleSearch.toLowerCase()) ||
    m.badge.toLowerCase().includes(moduleSearch.toLowerCase()) ||
    m.tagline.toLowerCase().includes(moduleSearch.toLowerCase()) ||
    m.whyText.toLowerCase().includes(moduleSearch.toLowerCase())
  );

  return (
    <div className={`${mobileCanvasClass} overflow-y-auto bg-[var(--mimi-field,#ffffff)] text-[var(--mimi-ink,#0a0a0a)] px-4 py-4 md:p-16`}>
      <div className="max-w-4xl mx-auto w-full">
        
        {/* Header — compact on mobile (app chrome already names Codex) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-8 border-b border-[var(--mimi-hairline,#d4d4d4)] pb-4 md:pb-8"
        >
          <div className="hidden md:flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <BookOpen size={24} className="text-nous-text" />
              <div>
                <h1 className="font-serif italic text-3xl text-nous-text">The Codex</h1>
                <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-nous-subtle mt-1">
                  The interpretive engine & manual of Mimi
                </p>
              </div>
            </div>
            
            {/* Progression / State */}
            <div className="text-right border-l border-nous-border pl-6 hidden md:block">
              <span className="block font-mono text-[9px] uppercase tracking-widest text-nous-subtle mb-1">Current Stage</span>
              <span className="font-serif italic text-lg text-nous-text">Refine</span>
              <p className="font-sans text-xs text-nous-subtle mt-1">Grounded calibration and taste structure.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6 overflow-x-auto scrollbar-none -mx-1 px-1">
            <button
              onClick={() => setActiveRootTab('modules')}
              className={`shrink-0 font-mono text-[10px] uppercase tracking-widest transition-colors pb-2 border-b-2 whitespace-nowrap ${
                activeRootTab === 'modules' ? 'text-[var(--mimi-ink)] border-[var(--mimi-ink)]' : 'text-[var(--mimi-stone)] border-transparent'
              }`}
            >
              Infrastructure
            </button>
            <button
              onClick={() => setActiveRootTab('manual')}
              className={`shrink-0 font-mono text-[10px] uppercase tracking-widest transition-colors pb-2 border-b-2 whitespace-nowrap ${
                activeRootTab === 'manual' ? 'text-[var(--mimi-ink)] border-[var(--mimi-ink)]' : 'text-[var(--mimi-stone)] border-transparent'
              }`}
            >
              Manual
            </button>
            <button
              onClick={() => setActiveRootTab('ask')}
              className={`shrink-0 font-mono text-[10px] uppercase tracking-widest transition-colors pb-2 border-b-2 whitespace-nowrap ${
                activeRootTab === 'ask' ? 'text-[var(--mimi-ink)] border-[var(--mimi-ink)]' : 'text-[var(--mimi-stone)] border-transparent'
              }`}
            >
              Ask Codex
            </button>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeRootTab === 'modules' && (
            <motion.div
              key="modules"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Manifesto — hairline section on mobile, card on desktop */}
              <div className="border-b md:border border-[var(--mimi-hairline,#d4d4d4)] md:bg-nous-surface/30 py-5 md:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 font-mono text-[60px] leading-none opacity-5 font-bold select-none">MIMI</div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#777] mb-2 font-black flex items-center gap-1.5">
                  <Sparkles size={11} className="text-nous-text" /> Brand Manifesto
                </h3>
                <p className="font-serif italic text-lg text-nous-text leading-relaxed">
                  "Mimi is an aesthetic intelligence studio that turns your references, images, links, and ideas into a living Taste Profile — then uses it to generate zines, creative briefs, visual direction, content language, and GEO / AI-readable brand signals."
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="w-2.5 h-0.5 bg-[#888]" />
                  <span className="font-mono text-[8px] uppercase tracking-widest text-[#888]">Mimi turns taste into infrastructure</span>
                </div>
              </div>

              {/* Module Search */}
              <div className="relative border-b md:border-0 border-[var(--mimi-hairline,#d4d4d4)]">
                <div className="absolute inset-y-0 left-0 md:left-3 flex items-center pointer-events-none text-[var(--mimi-stone)]">
                  <Search size={14} />
                </div>
                <input 
                  type="text"
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  placeholder="Filter modules (Studio, Tailor, signals…)"
                  className={`w-full bg-transparent pl-6 md:pl-10 pr-8 py-3 text-xs font-sans placeholder:text-[var(--mimi-stone)] outline-none md:bg-[#fcfcfc] dark:md:bg-nous-surface/50 md:border md:border-nous-border focus:border-[var(--mimi-ink)] transition-colors ${mobileHairlineFieldClass} md:border md:px-4`}
                />
                {moduleSearch && (
                  <button 
                    onClick={() => setModuleSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#555]"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Module Catalogue */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-mono text-[10px] uppercase tracking-widest text-[#777] font-bold">System Infrastructure Chambers</h2>
                  <span className="font-sans text-[10px] text-[#888]">{filteredModules.length} Modules Indexed</span>
                </div>
                <div className="space-y-4">
                  {filteredModules.map((m, i) => (
                    <ModuleCard key={m.id} m={m} index={i} />
                  ))}
                  {filteredModules.length === 0 && (
                    <div className="border border-dashed p-10 text-center font-serif text-sm text-[#888]">
                      No active system chambers match your search queries.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeRootTab === 'manual' && (
            <motion.div
              key="manual"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              <div className="prose prose-invert prose-p:font-serif prose-p:text-sm prose-p:leading-relaxed prose-p:text-nous-subtle max-w-none mb-12">
                <h2 className="font-serif italic text-2xl text-nous-text mb-4">How to utilize Mimi</h2>
                <p>
                  Mimi is a systemic machine for aesthetic synthesis. It is designed to help you externalize your taste, analyze its DNA, and re-infuse it into structured outputs like Zines, Reports, and Scry readings.
                </p>
                <p>
                  The system operates through distinct sectors that feed into one another: The <strong>Pocket</strong> gathers raw material. <strong>Mimi</strong> organizes it. <strong>Cyrus</strong> distills it into insight. The <strong>Zine Generator</strong> formalizes it.
                </p>
              </div>

              {/* System Lineage */}
              <SystemLineage />

              {/* Principles */}
              <div>
                <h2 className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle mb-6">Active Principles</h2>
                <div className="space-y-8">
                  {codexPrinciples.map(principle => (
                    <PrincipleCard key={principle.id} principle={principle} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeRootTab === 'ask' && (
            <motion.div
              key="ask"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Ask the Codex */}
              <div className="mb-12 bg-nous-surface border border-nous-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles size={16} className="text-nous-text" />
                  <h2 className="font-mono text-[10px] uppercase tracking-widest text-nous-text">Ask the Codex</h2>
                </div>
                
                <form onSubmit={handleAsk} className="relative mb-4">
                  <input 
                    type="text"
                    value={askQuery}
                    onChange={(e) => setAskQuery(e.target.value)}
                    placeholder="e.g., What principle am I violating?"
                    className="w-full bg-transparent border-b border-nous-border focus:border-nous-text py-2 pl-2 pr-10 font-serif text-lg text-nous-text placeholder:text-nous-subtle/50 outline-none transition-colors"
                  />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-nous-subtle hover:text-nous-text transition-colors" disabled={isAsking}>
                    {isAsking ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                  </button>
                </form>

                <div className="flex flex-wrap gap-2 mb-4">
                  {suggestedQueries.map((q, i) => (
                    <button 
                      key={i}
                      onClick={() => setAskQuery(q)}
                      className="font-sans text-[10px] text-nous-subtle hover:text-nous-text bg-nous-base px-2 py-1 border border-nous-border/50 hover:border-nous-border transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {askResponse && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 p-4 border-l-2 border-nous-text bg-nous-base/50">
                        <p className="font-serif text-sm text-nous-text leading-relaxed">
                          {askResponse}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};
