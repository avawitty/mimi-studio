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
    thesis: 'Create → Reflect → Refine',
    operationalMeaning: 'Raw expression should exist before it is judged, interpretation should occur before strategy.',
    readContent: 'The architecture of Mimi is intentionally divided into six chambers: Create, Reflect, Refine, Signature, Observe, System.\n\nThis order is functional. It is based on the idea that users do not think in menus. They think in phases. A person begins by making or collecting something. Then they try to understand what it means. Then they decide what to do with it. That is the primary loop.\n\nThe Mimi loop prevents two common failures: premature strategy (optimizing before having enough material) and endless reflection (getting trapped in interpretation without converting insight into action).',
    diagnostics: {
      healthy: 'Fluid movement between making, interpreting, and deciding.',
      overdone: 'Premature strategy or endless reflection without action.',
      currentRead: 'You are currently in the Create phase. Gathering raw material.'
    },
    actions: [
      { label: 'Analyze this board', icon: <Search size={14} /> },
      { label: 'Generate a critique', icon: <MessageSquare size={14} /> }
    ],
    cases: [
      { title: 'Case Study: The Shift', description: 'Moving from endless gathering to decisive refinement.' }
    ]
  },
  {
    id: 'refine',
    title: 'Refine',
    thesis: 'Interpretation should occur before strategy.',
    operationalMeaning: 'Taste becomes useful when it can move into action.',
    readContent: 'Refine is where interpretation becomes direction. Once signal has been recognized, the user can act with more precision. This chamber is for adjustment, planning, selection, and execution. It is less ceremonial than Reflect and more exacting in tone.\n\nAlign outputs with declared identity, generate direction from observed pattern, organize strategic action, support procurement, sourcing, selection, and curation decisions.',
    diagnostics: {
      healthy: 'Precise, structured, editorial, strategic.',
      overdone: 'Rigid, overly polished, losing the original raw instinct.',
      currentRead: 'Needs more structure. The raw materials are present but lack editorial direction.'
    },
    actions: [
      { label: 'Analyze this board', icon: <Search size={14} /> },
      { label: 'Find weak signals', icon: <Activity size={14} /> },
      { label: 'Suggest stronger composition', icon: <LayoutTemplate size={14} /> },
      { label: 'Rewrite as editorial thesis', icon: <FileText size={14} /> }
    ],
    cases: [
      { title: 'Editorial Edit', description: 'Applying the refine principle to a chaotic moodboard.' }
    ]
  },
  {
    id: 'geo',
    title: 'Generative Engine Optimization (GEO)',
    thesis: 'Making the brand legible to machine intelligence.',
    operationalMeaning: 'Brands must structure their aesthetic language and metadata so LLMs understand who they are.',
    readContent: 'Generative Engine Optimization (GEO) is the practice of packing a brand’s visual and textual identity into machine-readable structures. LLMs and AIs don’t "view" websites; they read data structures. To ensure brand accuracy across AI searches and generative tools, you must inject JSON-LD, specific metadata schemas, and machine-readable context into your digital properties.\n\nBy leveraging the Brand OS, users export a GEO Manifest containing exactly what to append to their website <head>. This controls the AI narrative before generation even begins.',
    diagnostics: {
      healthy: 'Brand identity is accurately cited and reflected in AI search outputs.',
      overdone: 'Metadata stuffing leading to hallucinated context connections.',
      currentRead: 'Aesthetic signals are strong internally but lack structured external markers.'
    },
    actions: [
      { label: 'Generate GEO Schema', icon: <Database size={14} /> },
      { label: 'Export to Web Header', icon: <ArrowUpRight size={14} /> }
    ],
    cases: [
      { title: 'Shopify JSON-LD', description: 'Injecting a product schema so LLMs understand specific aesthetic keywords.' }
    ]
  },
  {
    id: 'vector-embeddings',
    title: 'Vector Embeddings & Spatial Taste',
    thesis: 'Aesthetic identity is not random; it is mathematically calculated through high-dimensional analysis.',
    operationalMeaning: 'Mimi uses vector embeddings to map the exact coordinates of your artifacts, discovering latent connections rather than assigning rigid archetypes.',
    readContent: 'Vector Embeddings form the core neural architecture of Mimi. Each artifact you save—whether image, text, or reference—is parsed into a high-dimensional vector. This mathematical representation captures the texture, mood, and thematic substance of the piece.\n\nRather than forcing you into a predefined lifestyle bucket (e.g., "Dark Academia" or "Minimalist"), Mimi plots your artifacts in spatial relation to one another. By calculating the "Center of Gravity" among these points, the system understands your true aesthetic trajectory. This method prevents arbitrary corralment, allowing the system to recommend adjacencies that are mathematically and emotionally resonant to your specific coordinate space.',
    diagnostics: {
      healthy: 'A dense, distinct cluster of related signals forming a strong center of gravity.',
      overdone: 'Too many fragmented signals diluting the coordinate map into noise.',
      currentRead: 'Your spatial map is forming. The coordinates are establishing your baseline.'
    },
    actions: [
      { label: 'Calculate Center of Gravity', icon: <Activity size={14} /> },
      { label: 'View Latent Distance', icon: <Search size={14} /> }
    ],
    cases: [
      { title: 'The Latent Map', description: 'Visualizing the exact mathematical distance between a brutalist artifact and a romantic poet.' }
    ]
  }
];

const mimiModules: MimiModule[] = [
  {
    id: 'studio',
    name: 'The Studio (Create / Zine Layout / Fabricator)',
    badge: 'Digital & Physical Fabrication',
    tagline: 'Translating scattered visual and textual debris into pristine, publication-grade zine spreads and sensory product releases.',
    whyText: 'Modern digital formats favor volume over visual integrity. Standard page generators yield generic, sterile templates. The Studio is rooted in structural layout layout design: treating digital spreads as atmospheric objects that cultivate a brand’s intellectual aura and convert viewers into owners.',
    howText: 'Creators load basic product elements—like name, allocation limits, and price—or drop raw reference links into the Sovereign Ingest bar. Mimi crawls the source metadata, parses the style indices, and auto-generates luxurious, highly customized taglines, sensory calibrators, and psychographic objection reconciles.',
    forWhatText: 'Bespoke zine blueprints, immersive desktop layout spreads with interactive WebAudio sound escapes, and complete transactional brand Altars.',
    useCaseTitle: 'The Ceramic Shard Release',
    useCaseDescription: 'A custom stoneware sculptor drops three unedited studio snapshots and prompts "brutalist asymmetry." The Studio instantly fabricates a five-spread editorial zine called "Hydrated Silicate Core No. 01," auto-generating high-contrast gallery product illustrations and drafting a checkout button directly into the layout.',
    diagnostics: {
      input: 'Style cues, pricing matrices, physical supply bounds, reference files.',
      engine: 'Gemini 3.5 Synthesis Protocol + Responsive CSS Layout Engines.',
      output: 'Archival Zines, interactive brand altars, sensory copywriting.',
      moat: 'High-concept spatial margins that reject template-driven clutter.'
    }
  },
  {
    id: 'tailor',
    name: 'The Tailor (Taste Profiler)',
    badge: 'Central Identity Moat',
    tagline: 'The mathematical register of your brand’s core coordinates, visual taxonomies, and negative spaces.',
    whyText: 'Predefined demographic boxes fail high-concept brands. Modern relevance is defined entirely by aesthetic accuracy. Without a strict, dynamically calibrated database of your aesthetic constraints, any generative tool will collapse into sterile trend-chasing noise.',
    howText: 'The Tailor continuously reads files saved in your Archive or Pocket, calculating dominant color percentages, design motifs, and tone tags. It plots your center of gravity on an editable graph where you can lock in brand constraints or specify "Negative Spaces" (styles to strictly avoid).',
    forWhatText: 'A living Brand Taste Profile that acts as a secure, reusable metadata guide for all future content, designs, and copy generation.',
    useCaseTitle: 'Anchoring "incense oxide steel"',
    useCaseDescription: 'An independent fragrance house imports ten mood photos of weathered metals. The Tailor anchors their center of gravity around "incense cold smoke & raw steel." From that day, the platform automatically guides all zine copy to stay within an austere, mineral tone, immediately warning the creator of any "saccharine sweet" stylistic drift.',
    diagnostics: {
      input: 'Scraped files, locked traits, negative keywords, brand exclusions.',
      engine: 'High-dimensional centroid calculations & Exclusion taxonomies.',
      output: 'Unified Brand Taste Profiles, prompt guidance variables.',
      moat: 'Rigid brand safety thresholds preventing aesthetic compromise.'
    }
  },
  {
    id: 'archive',
    name: 'The Archive (Memory Library & Lens)',
    badge: 'Computer Vision & Scraping',
    tagline: 'A robust visual repository that crawls raw digital references and analyzes layout details with deep photographic lenses.',
    whyText: 'Creatives spend hours saving scattered inspiration across desktop directories and phone screens, only to lose them in unindexed folders. The Archive establishes an active ecosystem that turns raw files into structured creative data.',
    howText: 'Drag in static mockups or paste debris urls (such as Pinterest board feeds or newsletters). Mimi’s server scrapes the page contents and extracts core images. The Lens then executes custom vision algorithms, detailing precise spatial alignments, photographic grain weight, and lighting cast.',
    forWhatText: 'A searchable reference database. Every item is indexed with taxonomic metadata and immediately mapped to coordinates in your Taste Graph.',
    useCaseTitle: 'Systematic Pinterest Ingestion',
    useCaseDescription: 'A curator links a messy Pinterest board containing architectural facades. The scraper grabs thirty references, and the Lens instantly tags each item with detailed attributes ("35mm tri-x film grain, raw concrete aggregates, heavy shadows"). These items are immediately ready to fuel future layout generations.',
    diagnostics: {
      input: 'Image files, drag-and-drop file inputs, raw Pinterest/Article URLs.',
      engine: 'Page Scraper microservices + photographic metadata lens parser.',
      output: 'Indexed aesthetic references, curated memory nodes.',
      moat: 'Dissection of raw pixel files into technical photographic tags.'
    }
  },
  {
    id: 'threads',
    name: 'Threads (Taste Constellation & Paths)',
    badge: 'Relational Vector Mapping',
    tagline: 'Visualizing relational distances, cognitive sequences, and emerging stylistic clusters.',
    whyText: 'Traditional software visualizes files in rows and folders, hiding the rich, unspoken intersections forming in the user’s subconscious. Threads treat aesthetic assets as relational nodes, visualizing how separate ideas interact.',
    howText: 'By representing archived items as multidimensional vector numbers, Threads projects their exact similarity as relational distances on a 2D biaxial grid. Relational paths light up when items share consistent conceptual space.',
    forWhatText: 'Interactive structural maps, cosine similarity indices, and automatic cluster generators.',
    useCaseTitle: 'The "Unmarked Concrete" Convergence',
    useCaseDescription: 'A curator reviews their graph and notes that several unreleased raw concrete room designs and analogue synth audio loops are placed in a tight cluster. Recognizing this intersection, Mimi’s daemon recommends drafting an impromptu zine called "Late-Stage Analogue," automatically assembling the core ingredients.',
    diagnostics: {
      input: 'Aesthetic raw vectors cached in client-side profile states.',
      engine: 'Interactive spatial canvas compilers & proximity calculations.',
      output: 'Interactive taste constellations, auto-linked project groups.',
      moat: 'Calculative relational pathways mapping abstract feelings into space.'
    }
  },
  {
    id: 'signals',
    name: 'Signals & GEO Engine (AI Visibility)',
    badge: 'Generative Search Optimization',
    tagline: 'Formatting and packaging complex taste profiles so your brand is accurately indexed and recommended by AI crawlers.',
    whyText: 'AI systems and conversational search layers (like Perplexity and Gemini Grounding) do not view visual UI layouts. They crawl metadata. To ensure a brand is accurately categorized and cited when users query AI, its identity must be packaged into machine-readable headers.',
    howText: 'The GEO Engine compresses your living Taste Profile into structured JSON-LD schemas, semantic retrieval tokens, and SEO tags optimized for machine indexation.',
    forWhatText: 'A web-ready metadata head file, copyable JSON-LD structures, and an AI Retrieval Simulator validating model perception.',
    useCaseTitle: 'Intercepting Generative Recommendations',
    useCaseDescription: 'An independent tailor implements a GEO schema on their portal. When a future buyer asks Perplexity, "Recommend limited-run labels focusing on raw Japanese denim with minimal brutalist finishes," the brand is citationally recommended based on its structured web headers.',
    diagnostics: {
      input: 'Taste Profile variables, brand category targets, key visual motifs.',
      engine: 'JSON-LD schema compilers + generative citation simulators.',
      output: 'AI-readable indexing structures, verified citation matrices.',
      moat: 'Mathematical translation of luxury aesthetics into indexing tokens.'
    }
  },
  {
    id: 'altar',
    name: 'The Altar / Mimi Drop (Sovereign Commerce)',
    badge: 'Conversion Psychology Portal',
    tagline: 'Weaving elite transactional psychology and visceral sensory elements onto the zine-editing canvas.',
    whyText: 'Generic e-commerce software is an assembly line that strips products of their mystique. High-concept drops require ritualistic environments that build tension, emphasize limited allocations, and reward customer devotion.',
    howText: 'The Altar mounts physical or digital drops with bespoke sensory controls (e.g., aroma descriptions and 60Hz hum sound switches), tactile stock indicators ("Allocation: 14/50 remaining"), and deliberate delay notices prior to opening a brutalist sliding Checkout drawer.',
    forWhatText: 'Dynamic editorial checkouts, purchase sandbox registers, and local verification key certificates.',
    useCaseTitle: 'The Waxed Linen Dust Coat Drop',
    useCaseDescription: 'A slow-fashion designer configures a custom waxed jacket on the Altar. Rather than buying instantly, visitors are met with atmospheric room-frequency acoustic controls and checkout friction warnings. Upon purchase, a secure cryptographic Token Shard is saved into the buyer\'s private pocket.',
    diagnostics: {
      input: 'Drop parameters, allocation ceilings, WebAudio hum values.',
      engine: 'WebAudio frequency nodes + safe local checkout controllers.',
      output: 'Interactive transaction gates, cryptographically signed keys.',
      moat: 'Atmospheric conversion designs replacing sterile retail structures.'
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
    switch(id) {
      case 'studio': return <Layers size={16} className="text-nous-text" />;
      case 'tailor': return <Cpu size={16} className="text-nous-text" />;
      case 'archive': return <HardDrive size={16} className="text-nous-text" />;
      case 'threads': return <Compass size={16} className="text-nous-text" />;
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
    <div className="flex-1 overflow-y-auto bg-nous-base text-nous-text p-8 md:p-16">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 border-b border-nous-border pb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <BookOpen size={24} className="text-nous-text" />
              <div>
                <h1 className="font-serif italic text-3xl text-nous-text">The Codex</h1>
                <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-nous-subtle mt-1">
                  The interpretive engine & manual of Mimi Zine
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

          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveRootTab('modules')}
              className={`font-mono text-[10px] uppercase tracking-widest transition-colors pb-2 border-b-2 ${
                activeRootTab === 'modules' ? 'text-nous-text border-nous-text' : 'text-nous-subtle border-transparent hover:text-nous-text'
              }`}
            >
              Taste Infrastructure
            </button>
            <button
              onClick={() => setActiveRootTab('manual')}
              className={`font-mono text-[10px] uppercase tracking-widest transition-colors pb-2 border-b-2 ${
                activeRootTab === 'manual' ? 'text-nous-text border-nous-text' : 'text-nous-subtle border-transparent hover:text-nous-text'
              }`}
            >
              Mimi User Manual
            </button>
            <button
              onClick={() => setActiveRootTab('ask')}
              className={`font-mono text-[10px] uppercase tracking-widest transition-colors pb-2 border-b-2 ${
                activeRootTab === 'ask' ? 'text-nous-text border-nous-text' : 'text-nous-subtle border-transparent hover:text-nous-text'
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
              {/* Luxury Positioning Quote Box */}
              <div className="border border-nous-border bg-nous-surface/30 p-6 relative overflow-hidden">
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
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-nous-subtle">
                  <Search size={14} />
                </div>
                <input 
                  type="text"
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  placeholder="Filter Taste Infrastructure modules (e.g. Studio, Tailor, signals...)"
                  className="w-full bg-[#fcfcfc] dark:bg-nous-surface/50 border border-nous-border pl-10 pr-4 py-3 text-xs font-sans placeholder:text-[#ccc] dark:placeholder:text-[#666] outline-none focus:border-nous-text transition-colors"
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
                <h2 className="font-serif italic text-2xl text-nous-text mb-4">How to utilize Mimi Zine</h2>
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
