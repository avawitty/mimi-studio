import type { ChamberIntentDescriptor } from "./chamberIntents";

export type CanonLayer = "chamber" | "engine" | "artifact" | "infrastructure";

export type CanonModuleStatus = "live" | "aliased" | "stub" | "missing";

/** Optional product-maturity signal — distinct from route registration status. */
export type CanonModuleMaturity = "prototype" | "evolving" | "established";

export type StudioFamily =
  | "orientation"
  | "capture"
  | "library"
  | "identity"
  | "production"
  | "intelligence"
  | "publishing"
  | "services";

export type StudioPhase =
  | "collect"
  | "understand"
  | "shape"
  | "compose"
  | "approve"
  | "publish"
  | "preserve";

export type CanonVisibility = "primary" | "contextual" | "registry";

export type ChamberAtmosphere =
  | "paper"
  | "dark-plate"
  | "specimen"
  | "worktable"
  | "registry"
  | "public-face"
  | "signal-dense";

export type VisualPacketId =
  | "desk-index"
  | "codex-index"
  | "worktable-layers"
  | "loose-note"
  | "evidence-lanes"
  | "darkroom-proof"
  | "filing-surface"
  | "wardrobe-sleeves"
  | "object-ledger"
  | "private-envelope"
  | "custody-ledger"
  | "profile-dossier"
  | "signature-specimen"
  | "signal-graph"
  | "diagnostics-sheet"
  | "style-specimen"
  | "celestial-chart"
  | "twilight-mirror"
  | "identity-portrait"
  | "mortuary-file"
  | "editorial-signal"
  | "house-blueprint"
  | "composition-board"
  | "intelligence-ledger"
  | "geographic-plate"
  | "residue-trace"
  | "forecast-plot"
  | "observatory-ledger"
  | "distribution-strip"
  | "proofing-table"
  | "archive-stand"
  | "public-stage"
  | "correspondence-desk"
  | "dispatch-folder";

export interface CanonModule {
  id: string;
  name: string;
  layer: CanonLayer;
  engine: string;
  priority: number;
  status: CanonModuleStatus;
  /** Product maturity when known; omit when unset (no badge on Chamber Map). */
  maturity?: CanonModuleMaturity;
  canonicalRoute: string;
  implementedMode?: string;
  component?: string;
  aliases: string[];
  inputs: string[];
  generations: string[];
  outputs: string[];
  userFlow: string;
  notes?: string;
  family: StudioFamily;
  phase: StudioPhase;
  visibility: CanonVisibility;
  /**
   * Explicit opt-in for public sitemap/SEO indexing. Defaults to false/absent —
   * most Mimi chambers operate on a signed-in or ghost creator's own private
   * taste data, so being unauthenticated-reachable is not the same as being
   * generically public content worth indexing. Only set true on modules whose
   * output is inherently public regardless of who is viewing (e.g. a published
   * community feed), not based on `status` or the `public-face` atmosphere tag
   * (which is a visual-styling token, not a publicity signal).
   */
  seoIndexable?: boolean;
  atmosphere: ChamberAtmosphere[];
  primaryAction: {
    label: string;
    intent: ChamberIntentDescriptor;
  };
  suggestedNext?: {
    mode: string;
    label: string;
    reason: string;
  };
  visualPacket?: VisualPacketId;
}

export const CANON_ROUTE_ALIASES: Record<string, string> = {
  "/": "/studio",
  edit: "the-edit",
  "the-edit": "the-edit",
  press: "the-edit",
  "the-press": "the-press",
  publisher: "the-press",
  pressroom: "the-press",
  export: "the-press",
  "export-chamber": "the-press",
  pocket: "pocket",
  registry: "pocket",
  stand: "stand",
  moodboard: "moodboard",
  "mood-board": "moodboard",
  canvas: "moodboard",
  dossier: "moodboard",
  scribe: "scribe",
  "semantic-portal": "scribe",
  "research-memory": "scribe",
  intelhub: "intel-hub",
  geoengine: "geo_engine",
  geo: "geo_engine",
  "geo-engine": "geo_engine",
  "private-studio": "private-studio",
  "case-study": "private-studio",
  dolls: "mimi-dolls",
  "mimi-dolls": "mimi-dolls",
  "mimi-you": "mimi-dolls",
  rip: "mimi-rip",
  "mimi-rip": "mimi-rip",
  "mimi.rip": "mimi-rip",
  "chamber-map": "chamber-map",
  threads: "scribe",
  "narrative-threads": "scribe",
  "art-style": "tailor",
  scry: "scry",
  "trace-scry": "scry",
  "specimen-search": "scry",
  scryer: "tailor",
  "style-scryer": "tailor",
  "aesthetic-intelligence": "tailor",
  "style-diagnostics": "tailor",
  atelier: "atelier",
  objects: "atelier",
  "taste-objects": "atelier",
  house: "house",
  "the-house": "house",
  floors: "house",
  "editorial-house": "house",
  residue: "residue",
  "residue-engine": "residue",
  "cultural-residue": "residue",
  "emotional-residue": "residue",
  observatory: "observatory",
  "mean-median-mode": "mean-median-mode",
  "observatory-mmm": "mean-median-mode",
  forecast: "forecast",
  "the-forecast": "forecast",
  "aesthetic-meteorology": "forecast",
  "celestial-calibration": "celestial-calibration",
  celestial: "celestial-calibration",
  natal: "celestial-calibration",
  zodiac: "celestial-calibration",
  "mesopic-lens": "mesopic-lens",
  mesopic: "mesopic-lens",
  "twilight-lens": "mesopic-lens",
  // Social surfaces live on The Proscenium (wings via nested path).
  connections: "proscenium",
  correspondents: "proscenium",
  cliques: "proscenium",
  clique: "proscenium",
};

export const canonicalizeMimiRoute = (segment: string): string => {
  return CANON_ROUTE_ALIASES[segment] || segment || "studio";
};

export const CANON_MODULES: CanonModule[] = [
  {
    id: "chamber-map",
    name: "Studio Map",
    layer: "infrastructure",
    engine: "Canon Orientation",
    priority: 0,
    status: "live",
    maturity: "established",
    canonicalRoute: "/chamber-map",
    implementedMode: "chamber-map",
    component: "ChamberMapView",
    aliases: ["Chamber Map", "Architecture Registry"],
    inputs: ["active dossier", "canon metadata", "recent material"],
    generations: ["phase grouping", "next-action resolution", "registry disclosure"],
    outputs: ["studio orientation", "architecture registry"],
    userFlow:
      "Read the active dossier, take the next useful action, or unfold the complete chamber index.",
    family: "orientation",
    phase: "collect",
    visibility: "primary",
    seoIndexable: true,
    atmosphere: ["paper", "registry"],
    primaryAction: {
      label: "Capture a fragment",
      intent: { type: "capture" },
    },
    suggestedNext: {
      mode: "scribe",
      label: "Bring something in",
      reason: "The Loose Desk begins with material, not a destination.",
    },
    visualPacket: "desk-index",
  },
  {
    id: "codex",
    name: "Codex",
    layer: "infrastructure",
    engine: "System Reference",
    priority: 0.5,
    status: "live",
    maturity: "evolving",
    canonicalRoute: "/codex",
    implementedMode: "codex",
    component: "CodexView",
    aliases: ["System"],
    inputs: ["canon metadata", "creator-path contracts"],
    generations: ["system explanations", "workflow orientation"],
    outputs: ["reference guidance", "architecture context"],
    userFlow:
      "Inspect how Mimi's chambers, evidence rules, and creator path fit together.",
    family: "orientation",
    phase: "understand",
    visibility: "registry",
    seoIndexable: true,
    atmosphere: ["paper", "registry"],
    primaryAction: {
      label: "Research the system",
      intent: { type: "research" },
    },
    suggestedNext: {
      mode: "chamber-map",
      label: "Return to the Studio Map",
      reason: "Reference should lead back to the active work.",
    },
    visualPacket: "codex-index",
  },
  {
    id: "studio",
    name: "Studio",
    layer: "chamber",
    engine: "Orchestration Engine",
    priority: 8,
    status: "live",
    canonicalRoute: "/studio",
    implementedMode: "studio",
    component: "InputStudio",
    aliases: ["Orientation", "Intake", "Studio", "Worktable", "Compose"],
    inputs: ["prompt text", "media references", "approved context when present"],
    generations: ["provider routing", "prompt optimization", "Tailor-aware context synthesis", "asset injection"],
    outputs: ["mini zines", "creative roadmaps", "image prompts", "content briefs", "instruction packets"],
    userFlow:
      "Land on the compose console — multimodal intake, cover composer, instrument rail, and full chamber menu. Optional calm orientation at /studio/orientation; experimental archival desk at /studio/worktable-legacy only.",
    notes:
      "Primary /studio mounts InputStudio. Do not mount StudioWorktable at /studio.",
    family: "orientation",
    phase: "compose",
    visibility: "primary",
    // Keep worktable atmosphere so the App main shell stays full-bleed;
    // the archival desk itself is not mounted at /studio.
    atmosphere: ["paper", "worktable"],
    primaryAction: {
      label: "Begin with this",
      intent: { type: "compose" },
    },
    suggestedNext: {
      mode: "the-press",
      label: "Prepare the final proof",
      reason: "Approved compositions move to packaging and release.",
    },
    visualPacket: "worktable-layers",
  },
  {
    id: "scribe",
    name: "Scribe / Semantic Portal",
    layer: "chamber",
    engine: "Semantic Ingestion Engine",
    priority: 1,
    status: "live",
    canonicalRoute: "/scribe",
    implementedMode: "scribe",
    component: "ScribeChamber",
    aliases: ["Research Memory", "Semantic Portal"],
    inputs: ["raw AI conversations", "chat text", "dialogue paste", "link drops", "highlighted selections"],
    generations: ["signal extraction", "memory atom structuring", "context pack creation"],
    outputs: ["Memory Atoms", "Codex context packs", "documented decisions", "Used Context payloads"],
    userFlow: "Save important conversation fragments and turn them into traceable context Mimi can retrieve later.",
    notes: "Legacy route /research-memory aliases here. ResearchMemory runs inside the Atomize tab.",
    family: "capture",
    phase: "collect",
    visibility: "primary",
    atmosphere: ["paper", "specimen"],
    primaryAction: {
      label: "Drop something here",
      intent: { type: "capture" },
    },
    suggestedNext: {
      mode: "the-edit",
      label: "Shape the signal",
      reason: "Traceable material can become an editorial direction.",
    },
    visualPacket: "loose-note",
  },
  {
    id: "scry",
    name: "Scry",
    layer: "chamber",
    engine: "Evidence Retrieval Engine",
    priority: 2,
    status: "live",
    canonicalRoute: "/scry",
    implementedMode: "scry",
    component: "ScryView",
    aliases: ["Trace & Scry", "Specimen Search", "Trend Scryer"],
    inputs: ["natural-language query", "trend keyword", "Tailor profile context", "archive / Pocket excerpts"],
    generations: [
      "personal archive grounding",
      "open-web signal retrieval",
      "Scribe reading synthesis",
      "shadow-memory vector hits",
      "biaxial trend synthesis",
    ],
    outputs: ["ScryRun evidence lanes", "web signals", "editorial readings", "trend maps", "narrative drafts"],
    userFlow:
      "Ask a question or name a drift signal; inspect evidence by lane (archive, web, reading, shadow) before drafting.",
    notes:
      "Lanes stay distinct — no shared result overwrite. Empty ≠ complete; missing personal memory is empty not partial. Synthesis uses AI Gateway when available; Google Search grounding stays on Gemini. Readings weave profile + celestial calibration + web signals. Curiosity questions log for pattern reports. Mobile: one dark surface, query-led first viewport (Architecture Update 20).",
    family: "capture",
    phase: "understand",
    visibility: "primary",
    atmosphere: ["dark-plate", "specimen", "public-face", "signal-dense"],
    primaryAction: {
      label: "Read the evidence lanes",
      intent: { type: "research" },
    },
    suggestedNext: {
      mode: "the-edit",
      label: "Send evidence to The Edit",
      reason: "Interpretation follows distinct evidence, never replaces it.",
    },
    visualPacket: "evidence-lanes",
  },
  {
    id: "tailor",
    name: "Tailor / Profile Logic",
    layer: "chamber",
    engine: "Preference Synthesis Engine",
    priority: 2,
    status: "live",
    canonicalRoute: "/tailor",
    implementedMode: "tailor",
    component: "TailorHub",
    aliases: ["Profile Logic", "mimi.you calibration"],
    inputs: ["taste declarations", "references", "motifs", "color definitions", "constraints"],
    generations: ["profile synthesis", "semantic constraints", "taste tokenization"],
    outputs: ["Tailor Profile", "Mimi Logic Report", "prompt variables", "identity constraints"],
    userFlow: "Calibrate the taste logic that should guide every future generation.",
    family: "identity",
    phase: "approve",
    visibility: "primary",
    atmosphere: ["paper", "specimen"],
    primaryAction: {
      label: "Review profile evidence",
      intent: { type: "approve" },
    },
    suggestedNext: {
      mode: "studio",
      label: "Apply approved signals",
      reason: "Approved profile evidence should travel into composition.",
    },
    visualPacket: "profile-dossier",
  },
  {
    id: "taste-signature",
    name: "Taste Signature",
    layer: "artifact",
    engine: "Signature Report Generator",
    priority: 3,
    status: "live",
    canonicalRoute: "/signature",
    implementedMode: "signature",
    component: "SignatureView",
    aliases: ["Signature Report", "Aesthetic DNA"],
    inputs: ["saved zines", "Tailor profile", "Pocket items", "semantic tokens"],
    generations: ["motif extraction", "lineage synthesis", "signature summary generation"],
    outputs: ["Taste Signature Report", "motif summaries", "aesthetic readings"],
    userFlow: "See the current read of your taste so you can approve or repair Mimi's interpretation.",
    family: "identity",
    phase: "approve",
    visibility: "contextual",
    atmosphere: ["paper", "public-face", "specimen"],
    primaryAction: {
      label: "Approve the signature",
      intent: { type: "approve" },
    },
    suggestedNext: {
      mode: "tailor",
      label: "Repair the interpretation",
      reason: "Identity remains revisable when evidence and inference diverge.",
    },
    visualPacket: "signature-specimen",
  },
  {
    id: "taste-graph",
    name: "Taste Graph / Threads",
    layer: "chamber",
    engine: "Graph-Projection Engine",
    priority: 4,
    status: "live",
    canonicalRoute: "/taste-graph",
    implementedMode: "taste-graph",
    component: "TasteGraph",
    aliases: ["Threads", "Narrative Threads"],
    inputs: ["saved artifacts", "embeddings", "reference tags", "profile data"],
    generations: ["cluster projection", "center-of-gravity calculation", "thread extraction"],
    outputs: ["taste clusters", "narrative threads", "embedding keywords"],
    userFlow: "Inspect how saved references cluster and which taste threads are becoming durable.",
    family: "identity",
    phase: "understand",
    visibility: "contextual",
    atmosphere: ["worktable", "signal-dense"],
    primaryAction: {
      label: "Read the graph",
      intent: { type: "research" },
    },
    suggestedNext: {
      mode: "tailor",
      label: "Review the profile",
      reason: "Graph signals remain evidence until they are interpreted and approved.",
    },
    visualPacket: "signal-graph",
  },
  {
    id: "aesthetic-intelligence",
    name: "Aesthetic Intelligence",
    layer: "chamber",
    engine: "Chromatic Diagnostic Engine",
    priority: 4,
    status: "aliased",
    canonicalRoute: "/aesthetic-intelligence",
    implementedMode: "tailor",
    component: "TailorHub / AestheticIntelligenceChamber",
    aliases: ["Style Diagnostics", "Color Telemetry"],
    inputs: ["saved zines", "palette declarations", "designBrief text"],
    generations: ["dominant tone analysis", "chromatic frequency calculation", "density timelines"],
    outputs: ["style reports", "palette charts", "aesthetic diagnostic insights"],
    userFlow: "Open Tailor Diagnostics to compare your generated portfolio with the active profile and review style drift or chromatic dominance.",
    notes: "Compatibility route opens /tailor/diagnostics. The diagnostic engine remains modular inside Tailor.",
    family: "identity",
    phase: "understand",
    visibility: "registry",
    atmosphere: ["specimen", "signal-dense"],
    primaryAction: {
      label: "Inspect the diagnostics",
      intent: { type: "research" },
    },
    suggestedNext: {
      mode: "tailor",
      label: "Return to Tailor",
      reason: "Diagnostics are a lens on the same profile, not a second identity.",
    },
    visualPacket: "diagnostics-sheet",
  },
  {
    id: "the-edit",
    name: "The Edit",
    layer: "chamber",
    engine: "Artifact Pipeline Engine",
    priority: 5,
    status: "live",
    canonicalRoute: "/the-edit",
    implementedMode: "the-edit",
    component: "TheEditChamber",
    aliases: ["Press", "Campaign/news surface"],
    inputs: ["Studio outputs", "fragments", "reports", "card decks"],
    generations: ["editorial compilation", "diagnostic framing", "strategy synthesis"],
    outputs: [
      "strategy reports",
      "Aesthetic Census",
      "editorial briefings",
      "hi-fi plate assets",
      "spread composition metadata",
    ],
    userFlow:
      "Turn scattered material into an editorial read, bake hi-fi plates, compose issue spreads, then publish or export.",
    notes:
      "Legacy /press aliases here. Distinct from The Press export chamber. Architecture Update 21: one chamber with Signal / Issue / Forecast panels (default Signal). ?panel=signal|issue|forecast supported.",
    family: "production",
    phase: "shape",
    visibility: "primary",
    atmosphere: ["paper", "worktable"],
    primaryAction: {
      label: "Shape the direction",
      intent: { type: "shape-direction" },
    },
    suggestedNext: {
      mode: "studio",
      label: "Compose the approved direction",
      reason: "A clear signal can move into the active dossier without re-entry.",
    },
    visualPacket: "editorial-signal",
  },
  {
    id: "the-press",
    name: "The Press / Export Chamber",
    layer: "chamber",
    engine: "Export Manifest Handler",
    priority: 6,
    status: "live",
    canonicalRoute: "/the-press",
    implementedMode: "the-press",
    component: "ThePressChamber / ExportChamber",
    aliases: ["Export Chamber", "Publisher Console"],
    inputs: ["approved artifacts", "manifest JSON", "media", "provenance notes"],
    generations: ["manifest resolution", "export diagnostics", "commerce/web formatting"],
    outputs: [
      "PDF/DOCX",
      "mimi.fish share plates (/s/:id)",
      "product pages",
      "Shopify CSV/JSON-LD packs",
      "portfolio-ready exports",
      "Keep Tabs RSS (/u/:handle/feed.xml)",
    ],
    userFlow: "Package approved work into a shareable or portfolio-ready artifact. Making a zine public files it in the creator Keep Tabs feed for subscribe-once readers. Share actions emit mimi.fish/s/:id attention plates.",
    notes: "Artifact-specific export exists inside AnalysisDisplay via ExportChamber; the canonical top-level route currently opens PublisherDashboard. Public issues also project to RSS via /api/feed?handle=. Attention/share loop surface is mimi.fish (host skin over PublicZineSharePage).",
    family: "publishing",
    phase: "publish",
    visibility: "primary",
    atmosphere: ["paper", "registry"],
    primaryAction: {
      label: "Apply seal and publish",
      intent: { type: "publish" },
    },
    suggestedNext: {
      mode: "stand",
      label: "File on The Stand",
      reason: "Released work enters the creator's published archive.",
    },
    visualPacket: "proofing-table",
  },
  {
    id: "pocket",
    name: "Pocket / Registry",
    layer: "chamber",
    engine: "Persistence Engine",
    priority: 7,
    status: "live",
    canonicalRoute: "/pocket",
    implementedMode: "pocket",
    component: "Pocket",
    aliases: ["Registry", "Archive"],
    inputs: ["saved media", "links", "zines", "generated assets", "folders"],
    generations: ["local/cloud persistence", "folder mapping", "provenance preservation"],
    outputs: ["persistent archive", "source packs", "reusable context packs"],
    userFlow: "Save and retrieve references without losing source priority or provenance.",
    notes:
      "Ghost/anonymous path uses IndexedDB and suppresses Firestore Pocket listeners. Storage read failures must not be treated as intentional deletes. Identity changes cancel in-flight sync (Architecture Update 20).",
    family: "library",
    phase: "collect",
    visibility: "primary",
    atmosphere: ["paper", "registry"],
    primaryAction: {
      label: "Preserve with provenance",
      intent: { type: "preserve" },
    },
    suggestedNext: {
      mode: "studio",
      label: "Send selected material to the dossier",
      reason: "Sources retain origin while becoming active context.",
    },
    visualPacket: "filing-surface",
  },
  {
    id: "stand",
    name: "The Stand",
    layer: "chamber",
    engine: "Showcase Engine",
    priority: 7,
    status: "live",
    canonicalRoute: "/stand",
    implementedMode: "stand",
    component: "TheStand",
    aliases: ["Showcase", "Published Works"],
    inputs: ["published zines", "local archive", "community floor", "Sovereign archive projections"],
    generations: ["cover grid", "issue filtering", "comment threads", "hybrid Floor search"],
    outputs: ["personal showcase", "floor feed", "profile seed"],
    userFlow: "Browse your published archive and the consented public Floor — discovery after Press, not a recommendation feed.",
    notes:
      "When Sovereign is ready, Floor/Mine prefer owned archive + SSE over Firestore listeners. Stand vs Floor vs Mine vs Press ownership distinction remains an open canon question.",
    family: "publishing",
    phase: "preserve",
    visibility: "primary",
    seoIndexable: true,
    atmosphere: ["paper", "public-face", "registry"],
    primaryAction: {
      label: "Open the published archive",
      intent: { type: "preserve" },
    },
    suggestedNext: {
      mode: "proscenium",
      label: "Prepare a public encounter",
      reason: "The archive and its circulation remain distinct publishing jobs.",
    },
    visualPacket: "archive-stand",
  },
  {
    id: "mood-board",
    name: "Mood Board",
    layer: "chamber",
    engine: "Canvas State Engine",
    priority: 11,
    status: "live",
    canonicalRoute: "/moodboard",
    implementedMode: "moodboard",
    component: "MoodBoardChamber",
    aliases: ["Canvas", "Dossier"],
    inputs: ["uploaded images", "links", "board notes", "folders"],
    generations: ["spatial arrangement tracking", "report synthesis", "card deck translation"],
    outputs: ["moodboard reports", "board decks", "Studio prompt context"],
    userFlow: "Arrange references visually and send the board context into Studio.",
    notes: "Legacy /dossier aliases here. DossierView runs inside the chamber shell.",
    family: "production",
    phase: "compose",
    visibility: "primary",
    atmosphere: ["paper", "worktable"],
    primaryAction: {
      label: "Compose the references",
      intent: { type: "compose" },
    },
    suggestedNext: {
      mode: "studio",
      label: "Send the board to the Worktable",
      reason: "Spatial direction should travel with its source references.",
    },
    visualPacket: "composition-board",
  },
  {
    id: "intelhub",
    name: "IntelHub",
    layer: "chamber",
    engine: "Grounding Engine",
    priority: 9,
    status: "live",
    canonicalRoute: "/intelhub",
    implementedMode: "intel-hub",
    component: "IntelHub",
    aliases: ["Intel Hub", "Aesthetic Intelligence Hub"],
    inputs: ["links", "brand reports", "Tailor profile", "keywords", "search grounding logic"],
    generations: ["research synthesis", "link parsing", "evidence-vs-inference review", "commerce discovery"],
    outputs: ["approved Used Context", "SEO/editorial briefs", "artifact packs", "Press handoffs", "intelligence audits"],
    userFlow: "Collect evidence, review Tailor inferences, approve Used Context, discover possibilities, and hand a provenance-bearing artifact pack to The Press.",
    notes: "IntelHub orchestrates project state; it does not publish directly. Paired with GeoEngine; canon treats them as related but distinct chambers.",
    family: "intelligence",
    phase: "understand",
    visibility: "primary",
    atmosphere: ["paper", "registry", "signal-dense"],
    primaryAction: {
      label: "Open an evidence-led inquiry",
      intent: { type: "research" },
    },
    suggestedNext: {
      mode: "the-edit",
      label: "Shape an editorial direction",
      reason: "Approved evidence can inform direction without becoming unmarked fact.",
    },
    visualPacket: "intelligence-ledger",
  },
  {
    id: "geoengine",
    name: "GeoEngine",
    layer: "chamber",
    engine: "Location Context Engine",
    priority: 9,
    status: "live",
    canonicalRoute: "/geoengine",
    implementedMode: "geo_engine",
    component: "TheGEOEngine",
    aliases: ["GEO Engine", "GEO"],
    inputs: ["zine text", "brand reports", "opt-in location/venue parameters", "search grounding logic"],
    generations: ["GEO schema generation", "location-scouting synthesis", "machine-readable brand metadata"],
    outputs: ["GEO manifests / JSON-LD", "location-scouting memos", "AI-readable brand metadata"],
    userFlow: "Turn aesthetic identity into location-aware, search-grounded machine-readable structure.",
    family: "intelligence",
    phase: "understand",
    visibility: "contextual",
    atmosphere: ["specimen", "signal-dense"],
    primaryAction: {
      label: "Read geographic variation",
      intent: { type: "research" },
    },
    suggestedNext: {
      mode: "forecast",
      label: "Hand off labeled geographic signals",
      reason: "Geographic variation travels with evidence — no invented drift scores.",
    },
    visualPacket: "geographic-plate",
  },
  {
    id: "darkroom",
    name: "Darkroom",
    layer: "chamber",
    engine: "Visual Generation Engine",
    priority: 10,
    status: "live",
    canonicalRoute: "/darkroom",
    implementedMode: "darkroom",
    component: "DarkroomView",
    aliases: ["Image Lab"],
    inputs: ["visual prompts", "uploaded references", "Tailor rules", "treatment presets"],
    generations: ["visual analysis", "treatment application", "image generation"],
    outputs: ["generated images", "visual concepts", "reusable anchors"],
    userFlow: "Test visual treatments against references and send strong anchors back into Studio or Pocket.",
    family: "capture",
    phase: "shape",
    visibility: "primary",
    atmosphere: ["specimen", "worktable"],
    primaryAction: {
      label: "Develop source material",
      intent: { type: "capture" },
    },
    suggestedNext: {
      mode: "studio",
      label: "Send the developed asset to the dossier",
      reason: "A visual experiment remains connected to its source and treatment.",
    },
    visualPacket: "darkroom-proof",
  },
  {
    id: "wardrobe",
    name: "Wardrobe",
    layer: "chamber",
    engine: "Catalog & Semantic Storage Engine",
    priority: 12,
    status: "live",
    canonicalRoute: "/wardrobe",
    implementedMode: "wardrobe",
    component: "WardrobeView",
    aliases: ["Closet"],
    inputs: ["garment images", "titles", "categories", "tags", "styling notes"],
    generations: ["metadata embedding", "capsule organization", "Studio handoff context"],
    outputs: ["looks", "capsules", "style references", "generation anchors"],
    userFlow: "Store garments and looks as reusable visual context.",
    family: "library",
    phase: "preserve",
    visibility: "contextual",
    atmosphere: ["paper", "registry"],
    primaryAction: {
      label: "File a garment",
      intent: { type: "preserve" },
    },
    suggestedNext: {
      mode: "thimble",
      label: "Translate a wardrobe gap",
      reason: "Approved wardrobe evidence can become sourcing language.",
    },
    visualPacket: "wardrobe-sleeves",
  },
  {
    id: "thimble",
    name: "Thimble",
    layer: "chamber",
    engine: "Procurement Logic Engine",
    priority: 13,
    status: "live",
    canonicalRoute: "/thimble",
    implementedMode: "thimble",
    component: "ThimbleDashboard",
    aliases: ["Sourcing"],
    inputs: ["Pinterest links", "moodboard reports", "wardrobe gaps", "budget constraints"],
    generations: ["aesthetic tag extraction", "marketplace query mapping", "procurement framing"],
    outputs: ["search terms", "product categories", "sourcing plans"],
    userFlow: "Convert taste signals into concrete sourcing language.",
    family: "services",
    phase: "shape",
    visibility: "contextual",
    atmosphere: ["paper", "registry"],
    primaryAction: {
      label: "Open a sourcing packet",
      intent: { type: "start-service" },
    },
    suggestedNext: {
      mode: "atelier",
      label: "File the resulting objects",
      reason: "Sourced objects become evidence only when their custody is clear.",
    },
    visualPacket: "dispatch-folder",
  },
  {
    id: "sanctuary",
    name: "Sanctuary",
    layer: "chamber",
    engine: "Private Local Store",
    priority: 14,
    status: "live",
    canonicalRoute: "/sanctuary",
    implementedMode: "sanctuary",
    component: "SanctuaryView",
    aliases: ["Local-only vault"],
    inputs: ["sensitive artifacts", "private documents"],
    generations: ["local-only persistence", "privacy boundary enforcement"],
    outputs: ["local-only grounded artifacts"],
    userFlow: "Keep sensitive material usable without sending it through cloud sync.",
    family: "library",
    phase: "preserve",
    visibility: "contextual",
    atmosphere: ["paper", "registry"],
    primaryAction: {
      label: "Preserve privately",
      intent: { type: "preserve" },
    },
    visualPacket: "private-envelope",
  },
  {
    id: "the-ward",
    name: "The Ward / IP Custody",
    layer: "chamber",
    engine: "IP Custody Center",
    priority: 15,
    status: "live",
    canonicalRoute: "/ward",
    implementedMode: "ward",
    component: "TheWard",
    aliases: ["IP Custody Center"],
    inputs: ["metadata notes", "copyright data", "visual artifacts"],
    generations: ["provenance tracking", "specimen records", "custody checks"],
    outputs: ["IP specimen records", "copyright notes", "infringement tracking data"],
    userFlow: "Keep proof and provenance attached to important artifacts.",
    family: "library",
    phase: "preserve",
    visibility: "contextual",
    atmosphere: ["paper", "registry", "specimen"],
    primaryAction: {
      label: "Register custody",
      intent: { type: "preserve" },
    },
    suggestedNext: {
      mode: "the-press",
      label: "Attach custody to the proof",
      reason: "Publishing should not detach an artifact from its provenance.",
    },
    visualPacket: "custody-ledger",
  },
  {
    id: "private-studio",
    name: "Private Studio",
    layer: "chamber",
    engine: "Services Chamber",
    priority: 16,
    status: "live",
    canonicalRoute: "/private-studio",
    implementedMode: "private-studio",
    component: "PrivateStudioChamber",
    aliases: ["Services", "Case Study"],
    inputs: ["marketing commentary", "portfolio proof", "generated reports"],
    generations: ["client-facing packaging", "service framing", "proof artifact formatting"],
    outputs: ["service pages", "portfolio packages", "case studies"],
    userFlow: "Turn internal Mimi proof into client-facing work.",
    notes: "Legacy /case-study aliases here.",
    family: "services",
    phase: "compose",
    visibility: "primary",
    atmosphere: ["paper", "worktable"],
    primaryAction: {
      label: "Open a client working packet",
      intent: { type: "start-service" },
    },
    suggestedNext: {
      mode: "the-press",
      label: "Prepare the client handoff",
      reason: "Approved internal intelligence becomes a scoped public deliverable.",
    },
    visualPacket: "correspondence-desk",
  },
  {
    id: "mimi-dolls",
    name: "Mimi Dolls",
    layer: "chamber",
    engine: "Persistent Identity Visualization",
    priority: 17,
    status: "live",
    canonicalRoute: "/mimi-dolls",
    implementedMode: "mimi-dolls",
    component: "MimiDollsChamber",
    aliases: ["Dolls", "mimi.you"],
    inputs: ["Tailor profile", "Research Memory", "moodboards", "generation controls"],
    generations: ["identity consistency tracking", "art-historical reinterpretation", "editorial portrait generation"],
    outputs: ["Mimi Shell portraits (shell-v1 staple)", "identity pack refs", "badges", "profile cards", "report covers"],
    userFlow: "Project taste onto a house porcelain-BJD shell — same species for every creator; wardrobe and motifs vary.",
    notes:
      "Staple in services/dollEngine/staplePrompt.ts (prd/doll-staple-shell.md). Shell-first chamber plate; realtime shader lives in secondary Shader Lab tab (Architecture Update 20). Engine also: procedural aesthetic + identity pack + masks + companion. Public cards at /u/:handle.",
    family: "identity",
    phase: "compose",
    visibility: "contextual",
    atmosphere: ["specimen", "signal-dense"],
    primaryAction: {
      label: "Compose a representation",
      intent: { type: "compose" },
    },
    suggestedNext: {
      mode: "signature",
      label: "Review the identity specimen",
      reason: "Representations remain lenses on one profile.",
    },
    visualPacket: "identity-portrait",
  },
  {
    id: "mimi-rip",
    name: "mimi.rip",
    layer: "chamber",
    engine: "Inverse Taste Projection",
    priority: 17.5,
    status: "live",
    canonicalRoute: "/rip",
    implementedMode: "mimi-rip",
    component: "RipChamber",
    aliases: ["Rip", "Dark Mirror", "Inverse Reading"],
    inputs: ["Taste Graph", "evidence dossier", "likeness antiMotifs", "Doll blind spots", "exclusion principles"],
    generations: ["inverse thesis", "anti-motif map", "opposite palette/silhouette", "shadow experiments"],
    outputs: ["private Rip reading", "optional public mimi.rip card"],
    userFlow: "Read the dark mirror of your graph — refusals, blind spots, and controlled inversions — without replacing your identity on mimi.you.",
    notes: "Private by default. Public skin at mimi.rip/:handle when published. Not diagnosis.",
    family: "identity",
    phase: "understand",
    visibility: "contextual",
    atmosphere: ["dark-plate", "public-face", "specimen", "signal-dense"],
    primaryAction: {
      label: "Read the discarded selves",
      intent: { type: "research" },
    },
    suggestedNext: {
      mode: "tailor",
      label: "Repair or refuse the interpretation",
      reason: "An inverse reading never silently rewrites the profile.",
    },
    visualPacket: "mortuary-file",
  },
  {
    id: "art-style",
    name: "Art Style Scryer",
    layer: "chamber",
    engine: "Sovereign Semiotic Scrying Engine",
    priority: 18,
    status: "aliased",
    canonicalRoute: "/art-style",
    implementedMode: "tailor",
    component: "TailorHub / ArtStyleChamber",
    aliases: ["Art Style", "Style Scryer", "Aesthetic Signature Crafter"],
    inputs: ["image uploads", "aesthetic cues", "text snippets"],
    generations: ["pattern extraction", "motif calibration", "style card compositing"],
    outputs: ["Art Style Signature Card", "custom model prompts", "palette configurations"],
    userFlow: "Open Tailor Style Lab, upload references, inspect extracted patterns, and approve reusable style evidence for the active profile.",
    notes: "Compatibility route opens /tailor/style-lab. Style evidence remains linked instead of being embedded into every profile payload.",
    family: "identity",
    phase: "understand",
    visibility: "registry",
    atmosphere: ["paper", "specimen"],
    primaryAction: {
      label: "Inspect style evidence",
      intent: { type: "research" },
    },
    suggestedNext: {
      mode: "tailor",
      label: "Approve in Tailor",
      reason: "Style evidence remains linked to the persistent profile.",
    },
    visualPacket: "style-specimen",
  },
  {
    id: "atelier",
    name: "Atelier",
    layer: "chamber",
    engine: "Taste Object Archive",
    priority: 19,
    status: "live",
    canonicalRoute: "/atelier",
    implementedMode: "atelier",
    component: "AtelierChamber",
    aliases: ["Objects", "Taste Objects"],
    inputs: ["zine commerce touchpoints", "Shopify-verified product metadata", "semiotic rationale"],
    generations: ["taste-signal persistence", "cross-issue object clustering"],
    outputs: ["pinned taste objects", "desire / buyer-orientation evidence"],
    userFlow: "Pin semiotic commerce objects from a zine as Desire or Reference taste signals, then revisit them here. Desire steers Studio/Tailor; reference stays light. Soft-capped archive, not a wishlist.",
    notes: "Distinct from the Atelier membership plan. Thimble=sourcing, Pocket=media, Atelier=commerce-as-taste. Soft cap 40; oldest references prune first.",
    family: "library",
    phase: "preserve",
    visibility: "contextual",
    atmosphere: ["paper", "registry", "specimen"],
    primaryAction: {
      label: "File a taste object",
      intent: { type: "preserve" },
    },
    suggestedNext: {
      mode: "studio",
      label: "Use approved desire signals",
      reason: "Objects steer composition only with their rationale attached.",
    },
    visualPacket: "object-ledger",
  },
  {
    id: "house",
    name: "The House",
    layer: "chamber",
    engine: "Four-Floor Editorial Loop",
    priority: 7,
    status: "live",
    canonicalRoute: "/house",
    implementedMode: "house",
    component: "HouseChamber",
    aliases: ["House", "Floors", "Editorial House", "Ascension"],
    inputs: ["links", "text fragments", "image descriptions", "uploaded images"],
    generations: [
      "debris tagging",
      "keep/refuse curation",
      "aesthetic reading",
      "generative plates",
      "numbered issues",
    ],
    outputs: ["local debris archive", "plates", "issued editions (JSON)", "timeline chronicle"],
    userFlow:
      "Ascend Ingest → Curate → Plate → Penthouse. Refuse at least one thing, synthesize a reading, compose plates from your palette, bind a numbered edition. Undo/redo and night mode via keyboard.",
    notes:
      "Local-first House loop (mimi.studio.v2). Distinct from Atelier (commerce taste objects) and Chamber Map (registry). Nested /house/issue/:id opens the issue viewer.",
    family: "production",
    phase: "compose",
    visibility: "contextual",
    atmosphere: ["paper", "worktable"],
    primaryAction: {
      label: "Structure the larger world",
      intent: { type: "compose" },
    },
    suggestedNext: {
      mode: "the-press",
      label: "Bind the approved issue",
      reason: "The House structures work; The Press packages its release.",
    },
    visualPacket: "house-blueprint",
  },
  {
    id: "proscenium",
    name: "The Proscenium",
    layer: "chamber",
    engine: "Public Stage / Social Circle",
    priority: 8,
    status: "live",
    maturity: "prototype",
    canonicalRoute: "/proscenium",
    implementedMode: "proscenium",
    component: "ProsceniumView",
    aliases: ["Connections", "Cliques", "Correspondents", "Stage"],
    inputs: [
      "public transmissions",
      "follow graph",
      "friend requests",
      "named cliques",
      "vibe notes",
    ],
    generations: [
      "resonance counts",
      "wing routing (stage / correspondents / cliques)",
      "demo specimen labeling",
    ],
    outputs: [
      "witnessed transmissions",
      "correspondent lists",
      "clique membership",
      "absorb / refract handoffs to Studio",
    ],
    userFlow:
      "Witness published transmissions, open Correspondents for follows and connections, or manage invite-only Cliques — circulation after The Press, with explicit consent.",
    notes:
      "Legacy /connections and /cliques redirect to /proscenium/correspondents and /proscenium/cliques. Local Echoes are demonstration specimens only.",
    family: "publishing",
    phase: "publish",
    visibility: "contextual",
    seoIndexable: true,
    atmosphere: ["paper", "public-face"],
    primaryAction: {
      label: "Stage the public encounter",
      intent: { type: "publish" },
    },
    suggestedNext: {
      mode: "stand",
      label: "Return to the published archive",
      reason: "Circulation and archival custody remain separate.",
    },
    visualPacket: "public-stage",
  },
  {
    id: "residue",
    name: "Residue",
    layer: "chamber",
    engine: "Cultural / Emotional Residue Engine",
    priority: 14.5,
    status: "live",
    canonicalRoute: "/residue",
    implementedMode: "residue",
    component: "ResidueChamber",
    aliases: ["Residue Engine", "Cultural Residue", "Emotional Residue", "MMM"],
    inputs: [
      "cultural query or emotional experience text",
      "optional user notes",
      "manual / acquired sources (offline heuristics first)",
      "optional Apify acquisition (token-gated)",
    ],
    generations: [
      "cultural lineage + codes",
      "interpretive neighborhoods",
      "mean / median / mode readouts",
      "intelligence reports",
      "product adapter proposals",
    ],
    outputs: [
      "session residue runs",
      "evidence + source manifests",
      "intelligence reports",
      "proposed zine / edit / forecast / taste / memory artifacts",
    ],
    userFlow:
      "Run an offline-first cultural or emotional residue pass, inspect synthesis and evidence, review M/M/M and product proposals, then hand off to Intel Hub, Edit, Forecast, or Taste Graph. Optional signed-in Apify acquisition when configured.",
    notes:
      "Emotional mode always shows the non-diagnostic safety notice. Memory / taste / edit outputs stay proposed until accepted elsewhere. Live Apify acquisition is Phase 9 (token + session gated). Alias MMM here is per-run Residue analysis — collective Mean Median Mode is The Observatory.",
    family: "intelligence",
    phase: "understand",
    visibility: "contextual",
    atmosphere: ["specimen", "signal-dense"],
    primaryAction: {
      label: "Read what remains",
      intent: { type: "research" },
    },
    suggestedNext: {
      mode: "intel-hub",
      label: "Audit the evidence",
      reason: "Residue is interpretation and should travel with its source ledger.",
    },
    visualPacket: "residue-trace",
  },
  {
    id: "observatory",
    name: "The Observatory",
    layer: "chamber",
    engine: "Collective Perception",
    priority: 9,
    status: "live",
    maturity: "prototype",
    canonicalRoute: "/observatory",
    implementedMode: "observatory",
    component: "ObservatoryChamber",
    aliases: ["Observatory", "Collective Intelligence"],
    inputs: [
      "consented public Proscenium artifacts",
      "anonymized topic / motif / inquiry / form signals",
    ],
    generations: [
      "central-tendency profiles",
      "Mean Median Mode reports",
      "methodology + uncertainty disclosure",
    ],
    outputs: [
      "present-atmosphere readout",
      "handoffs to Forecast / Proscenium / Residue",
    ],
    userFlow:
      "Open The Observatory to read Mean Median Mode — mean, median, mode, and their joint profile over consented public signals. Per-run M/M/M stays in Residue.",
    notes:
      "Live aggregates from consented Proscenium publishes; demonstration specimens are opt-in preview only. Do not alias this module as MMM (Residue keeps that short alias).",
    family: "intelligence",
    phase: "understand",
    visibility: "contextual",
    atmosphere: ["dark-plate", "specimen", "signal-dense"],
    primaryAction: {
      label: "Observe the present atmosphere",
      intent: { type: "research" },
    },
    suggestedNext: {
      mode: "forecast",
      label: "Project what may follow",
      reason: "Observation precedes directional projection.",
    },
    visualPacket: "observatory-ledger",
  },
  {
    id: "mean-median-mode",
    name: "Mean Median Mode",
    layer: "chamber",
    engine: "Collective Central Tendency",
    priority: 9.1,
    status: "live",
    maturity: "prototype",
    canonicalRoute: "/mean-median-mode",
    implementedMode: "mean-median-mode",
    component: "ObservatoryChamber",
    aliases: ["Mean Median Mode", "Collective Moods"],
    inputs: [
      "consented public signal aggregates",
      "windowed intensity observations",
    ],
    generations: [
      "mean / median / mode strip",
      "summation interpretation",
      "seeking-mode shares",
    ],
    outputs: ["MeanMedianModeReport", "CentralTendencyProfile[]"],
    userFlow:
      "Read the present atmosphere via literal mean, median, and mode — not a leaderboard. Stage on The Proscenium to contribute anonymized structure.",
    notes:
      "Collective Moods is a docs-only conceptual alias. Distinct from Residue per-run MeanMedianModeResult.",
    family: "intelligence",
    phase: "understand",
    visibility: "contextual",
    atmosphere: ["registry", "signal-dense"],
    primaryAction: {
      label: "Read the distribution",
      intent: { type: "research" },
    },
    suggestedNext: {
      mode: "observatory",
      label: "Return to the wider observation",
      reason: "Central tendency is one lens within collective intelligence.",
    },
    visualPacket: "distribution-strip",
  },
  {
    id: "forecast",
    name: "Forecast",
    layer: "chamber",
    engine: "Aesthetic Meteorology",
    priority: 9.2,
    status: "live",
    canonicalRoute: "/forecast",
    implementedMode: "forecast",
    component: "TheForecast",
    aliases: ["The Forecast", "Aesthetic Meteorology"],
    inputs: [
      "profile season",
      "aesthetic DNA",
      "GEO drift when calibrated",
      "taste vector",
      "optional You.com / AI Gateway for live content vectors",
    ],
    generations: [
      "season / drift overview",
      "content forecast synthesis (You.com → Mimi Gateway)",
      "handoffs to Observatory / Residue / GEO",
    ],
    outputs: ["forecast overview", "live or empty content trends"],
    userFlow:
      "Read personal aesthetic meteorology from calibrated profile signals, then hand off to The Observatory for collective atmosphere or GEO for drift calibration.",
    notes:
      "Menu peer of Observatory; narrative child (Observatory’s “what next”). Content Forecasting uses live search/gateway paths with honest empty/offline states — never invent drift scores or costume trends.",
    family: "intelligence",
    phase: "shape",
    visibility: "contextual",
    atmosphere: ["specimen", "signal-dense"],
    primaryAction: {
      label: "Project a direction",
      intent: { type: "research" },
    },
    suggestedNext: {
      mode: "the-edit",
      label: "Turn projection into direction",
      reason: "A forecast remains a projection until editorially approved.",
    },
    visualPacket: "forecast-plot",
  },
  {
    id: "celestial-calibration",
    name: "Celestial Calibration",
    layer: "chamber",
    engine: "Personal Timing Calibration",
    priority: 11.5,
    status: "live",
    canonicalRoute: "/celestial-calibration",
    implementedMode: "celestial-calibration",
    component: "CelestialCalibrationChamber",
    aliases: ["Celestial", "Natal", "Zodiac", "Sun Sign"],
    inputs: [
      "birth date",
      "optional birth time (local civil clock)",
      "optional birth location (geocode → timezone + coordinates)",
      "seasonal alignment + lineage notes",
    ],
    generations: [
      "tropical Sun / Moon / planets via astronomy-engine",
      "major aspects; Rising + Whole Sign houses when time + place resolve",
      "astronomical season",
      "timing phrase for Tailor / generation / Oracle Latent Space Translation",
    ],
    outputs: [
      "tailorDraft.celestialCalibration",
      "profile birth fields + zodiacSign",
      "optional generation timing context",
      "structured readout for Oracle Latent Space Translation",
    ],
    userFlow:
      "Enter birth data, resolve place for timezone/coords, review ephemeris readout, opt in to generation use, save into Tailor, then hand off to Worktable or Oracle.",
    notes:
      "Rising/houses require birth time + geocoded coordinates. Sidereal and quadrant houses unsupported. Distinct from The Observatory (collective Mean Median Mode) and from poetic zine field celestial_calibration.",
    family: "identity",
    phase: "understand",
    visibility: "contextual",
    atmosphere: ["specimen", "signal-dense"],
    primaryAction: {
      label: "Review the calibration",
      intent: { type: "approve" },
    },
    suggestedNext: {
      mode: "tailor",
      label: "Attach approved timing context",
      reason: "Optional calibration belongs to the same persistent profile.",
    },
    visualPacket: "celestial-chart",
  },
  {
    id: "mesopic-lens",
    name: "Mesopic Lens",
    layer: "chamber",
    engine: "Twilight Reading Engine",
    priority: 11.6,
    status: "live",
    canonicalRoute: "/mesopic-lens",
    implementedMode: "mesopic-lens",
    component: "MesopicLensChamber",
    aliases: ["Obsidian Mirror", "Twilight Lens", "Mesopic"],
    inputs: [
      "natural-language question",
      "curiosity chips",
      "Tailor profile context",
      "celestial calibration readout",
    ],
    generations: [
      "live web signal retrieval (Gemini Google Search)",
      "profile × celestial twilight reading synthesis",
      "curiosity record persistence",
      "pattern report compilation",
    ],
    outputs: [
      "grounded twilight reading",
      "web citation list",
      "curiosity records",
      "recurring-theme pattern report",
    ],
    userFlow:
      "Ask a personal question in the twilight — profile taste and celestial calibration orient the reading; live web signals ground it. Curiosities log for pattern reports.",
    notes:
      "Distinct from Observatory Mesopic Lens (collective weak signals). Symbolic celestial context only — never fabricated positions. Web grounding via Gemini; synthesis via AI Gateway. Curiosity records are not approved Taste Graph memory.",
    family: "intelligence",
    phase: "understand",
    visibility: "primary",
    atmosphere: ["dark-plate", "specimen", "signal-dense"],
    primaryAction: {
      label: "Ask in twilight vision",
      intent: { type: "research" },
    },
    suggestedNext: {
      mode: "scry",
      label: "Trace evidence in Scry",
      reason: "Mesopic readings orient; Scry returns lane-separated evidence.",
    },
    visualPacket: "twilight-mirror",
  },
];

/** Infrastructure substrates (not chamber routes). Not validated by validateCanonRoutes. */
export interface CanonInfrastructure {
  id: string;
  name: string;
  status: "live" | "hardening" | "proposed";
  purpose: string;
  owns: string[];
  notes?: string;
}

export const CANON_INFRASTRUCTURE: CanonInfrastructure[] = [
  {
    id: "sovereign-data-plane",
    name: "Legacy Sovereign Data Plane",
    status: "hardening",
    purpose: "Compatibility publication/discovery reads while records migrate to canonical Neon repositories",
    owns: ["public zines", "profiles", "Pocket mirrors", "search projections", "SSE sync", "import/export"],
    notes: "No new billing, credit, workflow, AI-run, proposal, or atom writes. See ADR 001.",
  },
  {
    id: "neon-operational-database",
    name: "Neon Operational Database",
    status: "hardening",
    purpose: "Canonical relational state behind database-neutral server repositories",
    owns: [
      "memberships",
      "entitlements",
      "credit ledger and reservations",
      "workflow and AI runs",
      "memory proposals and atoms",
      "provenance",
      "Stripe reconciliation",
    ],
    notes: "Drizzle + @neondatabase/serverless; Firebase Auth remains identity; binaries stay in object storage.",
  },
  {
    id: "sovereign-search",
    name: "Sovereign Search",
    status: "live",
    purpose: "Hybrid keyword + Gateway embedding discovery over the owned archive",
    owns: ["write-time card projections", "vector storage", "reindex route", "Floor search ranking"],
  },
  {
    id: "ai-gateway-embeddings",
    name: "AI Gateway Embeddings",
    status: "live",
    purpose: "Shared embedding pipeline with executed-model and dimension provenance",
    owns: ["Scry", "Taste clustering", "Shadow Memory", "Sovereign search embeddings", "EmbeddingSpaceId contract"],
    notes:
      "Different dimensions/models are never compared. Shared contract: schemas/embeddingContracts.ts (Architecture Update 21).",
  },
  {
    id: "shadow-memory-migration",
    name: "Shadow Memory Migration",
    status: "live",
    purpose: "Detect and reindex embedding-incompatible personal memory vectors",
    owns: ["dimension/model audit", "authenticated reindex", "ghost-identity denial"],
  },
  {
    id: "gateway-entitlements",
    name: "Gateway Entitlement Boundary",
    status: "hardening",
    purpose: "Registered AI operations use server entitlements plus Neon reserve/commit/release",
    owns: ["operation registry", "Stripe reconciliation", "credit policies", "provider adapters"],
  },
  {
    id: "serverless-lazy-graphs",
    name: "Serverless Module Boundary",
    status: "live",
    purpose: "Load Node-heavy graphs only after cheap request checks on the active route",
    owns: ["Firebase Admin", "Stripe", "Apify", "SQLite", "dossier prompts", "Gemini service lazy paths"],
    notes: "CI: npm run verify:api-lazy-graphs (Architecture Update 21).",
  },
  {
    id: "data-plane-ownership",
    name: "Data Plane Ownership Map",
    status: "live",
    purpose: "Firebase identity; Neon relational state; object storage binaries; legacy migration sources; IndexedDB cache",
    owns: ["ownership rules", "Stand/Floor/Mine/Press distinctions", "anon migrate policy"],
    notes: "See docs/adr-001-neon-operational-database.md.",
  },
];

export const CANON_MODULE_BY_ROUTE = CANON_MODULES.reduce<Record<string, CanonModule>>((acc, module) => {
  acc[module.canonicalRoute] = module;
  return acc;
}, {});

export const CANON_MODULE_BY_ID = CANON_MODULES.reduce<Record<string, CanonModule>>((acc, module) => {
  acc[module.id] = module;
  return acc;
}, {});
