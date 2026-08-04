import {
  Capability,
  Engine,
  EngineState,
  EvidenceBackedInference,
  Explanation,
  Feedback,
  Provenance,
  SupportingEvidence,
  ValidationResult,
  createEngineState,
} from "./engineContract";

export type MimiEngineChamber =
  | "foundation"
  | "knowledge"
  | "editorial-intelligence"
  | "taste-intelligence"
  | "composition"
  | "platform"
  | "infrastructure";

export type MimiSourceOfTruthRole = "source-of-truth" | "projection" | "adapter" | "support";

export interface MimiServiceEngineInput {
  artifacts?: SupportingEvidence[];
  context?: Record<string, unknown>;
  feedback?: Feedback;
}

export interface MimiServiceEngineOutput {
  engineId: string;
  serviceFiles: string[];
  chamber: MimiEngineChamber;
  sourceOfTruthRole: MimiSourceOfTruthRole;
  productIntent: string;
  reconstructedPrompt: string;
  implementationPrd: {
    inputs: string[];
    outputs: string[];
    responsibilities: string[];
    providerRequirements: string[];
  };
  futureEngineSpec: string;
  governance: EvidenceBackedInference[];
}

export interface MimiServiceEngineSpec {
  id: string;
  name: string;
  purpose: string;
  chamber: MimiEngineChamber;
  serviceFiles: string[];
  sourceOfTruthRole: MimiSourceOfTruthRole;
  capabilities: Capability[];
  productIntent: string;
  reconstructedPrompt: string;
  implementationPrd: MimiServiceEngineOutput["implementationPrd"];
  futureEngineSpec: string;
}

const evidenceGovernanceCapabilities: Capability[] = [
  {
    id: "evidence-linked-claims",
    label: "Evidence Linked Claims",
    description: "Every inference must point back to supporting evidence.",
  },
  {
    id: "user-editorial-control",
    label: "User Editorial Control",
    description: "The user can confirm, revise, or reject model interpretations.",
  },
  {
    id: "provider-independence",
    label: "Provider Independence",
    description: "Engines describe work by capability, not by a fixed model vendor.",
  },
];

const providerRequirements = [
  "Supports hosted APIs, AI Gateway, OpenRouter, local models, MCP tools, or user-supplied API keys.",
  "Normalizes provider responses before returning engine output.",
  "Keeps provider credentials in adapters rather than product engines.",
];

const evidenceFromSpec = (spec: MimiServiceEngineSpec): SupportingEvidence[] =>
  spec.serviceFiles.map((file) => ({
    id: file,
    status: "observed",
    source: file,
    excerpt: `${file} is implemented as part of the ${spec.name}.`,
    confidence: 1,
  }));

const governanceForSpec = (spec: MimiServiceEngineSpec, artifacts: SupportingEvidence[] = []): EvidenceBackedInference[] => {
  const supportingEvidence = artifacts.length > 0 ? artifacts : evidenceFromSpec(spec);
  return [
    {
      claim: `${spec.name} must separate observed evidence from inferred interpretation.`,
      status: "user-confirmed",
      supportingEvidence,
      userEditable: true,
    },
    {
      claim: `${spec.name} must support Mimi's promise: reveal evidence, cluster patterns, and let the user curate.`,
      status: "user-confirmed",
      supportingEvidence,
      userEditable: true,
    },
    {
      claim: `${spec.name} is ${spec.sourceOfTruthRole === "projection" ? "a projection and must not overwrite the Taste Graph" : `a ${spec.sourceOfTruthRole} layer`}.`,
      status: "user-confirmed",
      supportingEvidence,
      userEditable: true,
    },
  ];
};

const validateMimiServiceEngineInput = (): ValidationResult => ({
  valid: true,
  issues: [],
});

const explainMimiServiceEngine = (output: MimiServiceEngineOutput): Explanation => ({
  summary: `${output.engineId} maps ${output.serviceFiles.join(", ")} into a vendor-neutral Mimi engine.`,
  reasoning: [
    "The engine is named by product capability rather than implementation vendor.",
    "Provider, storage, and model-specific details are treated as adapters.",
    "Mimi evidence governance is attached to the engine output.",
  ],
  userFlowBenefit: "As a creator, you can move from artifact evidence to creative output without Mimi making opaque identity claims or locking the workflow to one model provider.",
});

const provenanceForMimiServiceEngine = (output: MimiServiceEngineOutput): Provenance => ({
  engineId: output.engineId,
  generatedAt: new Date().toISOString(),
  inputs: output.serviceFiles,
  evidence: output.governance.flatMap((claim) => claim.supportingEvidence.map((evidence) => evidence.source)),
  assumptions: [
    "Current service file names are implementation evidence for the higher-level engine map.",
    "Provider-specific files are adapters unless they define product behavior directly.",
  ],
});

const createMimiServiceEngine = (spec: MimiServiceEngineSpec): Engine<MimiServiceEngineInput, MimiServiceEngineOutput> => ({
  id: spec.id,
  name: spec.name,
  purpose: spec.purpose,
  capabilities: spec.capabilities,
  async execute(input) {
    return {
      engineId: spec.id,
      serviceFiles: spec.serviceFiles,
      chamber: spec.chamber,
      sourceOfTruthRole: spec.sourceOfTruthRole,
      productIntent: spec.productIntent,
      reconstructedPrompt: spec.reconstructedPrompt,
      implementationPrd: spec.implementationPrd,
      futureEngineSpec: spec.futureEngineSpec,
      governance: governanceForSpec(spec, input.artifacts),
    };
  },
  validate: validateMimiServiceEngineInput,
  explain: explainMimiServiceEngine,
  provenance: provenanceForMimiServiceEngine,
  evolve(feedback: Feedback): EngineState {
    return createEngineState(spec.id, feedback);
  },
});

const spec = (
  id: string,
  name: string,
  chamber: MimiEngineChamber,
  serviceFiles: string[],
  sourceOfTruthRole: MimiSourceOfTruthRole,
  productIntent: string,
  reconstructedPrompt: string,
  inputs: string[],
  outputs: string[],
  responsibilities: string[],
  futureEngineSpec: string,
): MimiServiceEngineSpec => ({
  id,
  name,
  purpose: productIntent,
  chamber,
  serviceFiles,
  sourceOfTruthRole,
  capabilities: evidenceGovernanceCapabilities,
  productIntent,
  reconstructedPrompt,
  implementationPrd: {
    inputs,
    outputs,
    responsibilities,
    providerRequirements,
  },
  futureEngineSpec,
});

export const mimiServiceEngineSpecs: MimiServiceEngineSpec[] = [
  spec(
    "intelligence-router-engine",
    "Intelligence Router Engine",
    "foundation",
    ["services/aiProvider.ts", "services/apiKeyService.ts", "services/modelConfig.ts", "services/geminiClient.ts", "services/geminiService.ts", "services/geminiAgents.ts", "services/codexService.ts"],
    "adapter",
    "Select and normalize the best intelligence provider for a requested Mimi capability without binding the product to one vendor.",
    "Given a task, context, user preferences, available providers, budget, modality, and required reasoning depth, choose an execution plan and return a normalized response. Respect user-supplied API keys and support provider failover.",
    ["task", "context", "available providers", "user key preferences", "budget", "capability requirements"],
    ["execution plan", "selected provider", "normalized response", "provider metadata"],
    ["route model calls", "normalize outputs", "protect credentials", "support failover", "balance cost and quality"],
    "Evolve into a provider marketplace layer where OpenRouter, AI Gateway, local models, MCP tools, and future APIs can fulfill the same engine contract.",
  ),
  spec(
    "context-engine",
    "Context Engine",
    "foundation",
    ["services/memoryService.ts", "services/searchService.ts", "services/vectorSearch.ts", "services/googleDriveService.ts", "services/zineEmbeddingService.ts"],
    "support",
    "Assemble the right project, memory, research, and artifact context for every generation.",
    "Given a creative task and available project knowledge, retrieve, rank, compress, and format the most relevant context while preserving evidence boundaries.",
    ["task", "project memory", "documents", "embeddings", "search query", "token budget"],
    ["context packet", "retrieval evidence", "compression notes", "missing context warnings"],
    ["retrieve memory", "search artifacts", "rank evidence", "compress context", "flag uncertainty"],
    "Become Mimi's portable context compiler for Codex, Cursor, Claude Code, Gemini, Jules, and future agents.",
  ),
  spec(
    "research-engine",
    "Research Engine",
    "knowledge",
    ["services/researchService.ts", "services/artHistoryService.ts", "services/googleDriveService.ts"],
    "support",
    "Collect external and imported knowledge for creative-literacy work.",
    "Gather knowledge from search, documents, PDFs, URLs, images, APIs, and user uploads. Return evidence, citations, thematic comparisons, and structured knowledge without diagnostic identity claims.",
    ["research question", "references", "URLs", "documents", "images", "provider tools"],
    ["evidence", "citations", "summaries", "structured knowledge", "confidence notes"],
    ["collect research", "cite sources", "separate evidence from inference", "compare themes", "avoid identity claims"],
    "Support interchangeable research providers and local document corpora while keeping art history thematic and non-diagnostic.",
  ),
  spec(
    "memory-engine",
    "Memory Engine",
    "knowledge",
    ["services/memoryService.ts", "services/localArchive.ts", "services/archiveManager.ts", "services/draftStorage.ts", "services/threadService.ts"],
    "source-of-truth",
    "Maintain long-term project knowledge, drafts, decisions, and creative history.",
    "Store and retrieve decisions, creative direction, field notes, drafts, source artifacts, and implementation history with reversible provenance.",
    ["artifact", "decision", "draft", "thread", "user confirmation", "user rejection"],
    ["memory record", "draft state", "archive entry", "retrieval packet"],
    ["persist memories", "restore drafts", "record confirmations", "record rejections", "preserve local-first work"],
    "Act as the portable archive layer across local storage, cloud storage, Git, Drive, S3, or future storage backends.",
  ),
  spec(
    "semantic-search-engine",
    "Semantic Search Engine",
    "knowledge",
    ["services/searchService.ts", "services/vectorSearch.ts", "services/zineEmbeddingService.ts"],
    "support",
    "Retrieve relevant knowledge from every available source by intent rather than only keywords.",
    "Given an intent, retrieve matching memories, artifacts, zines, notes, and graph nodes through semantic, keyword, vector, graph, or hybrid search.",
    ["query", "intent", "memory index", "embeddings", "filters"],
    ["ranked results", "supporting evidence", "retrieval explanation"],
    ["rank relevance", "explain matches", "support hybrid search", "surface missing evidence"],
    "Become a retrieval adapter that can swap vector stores, graph stores, local indexes, and future retrieval systems.",
  ),
  spec(
    "archive-engine",
    "Archive Engine",
    "knowledge",
    ["services/archiveManager.ts", "services/localArchive.ts", "services/draftStorage.ts"],
    "source-of-truth",
    "Persist project artifacts independent of storage backend.",
    "Given an artifact and metadata, save, retrieve, update, and preserve it with provenance and local-first fallback.",
    ["artifact", "metadata", "project id", "storage preference"],
    ["archive entry", "storage receipt", "retrievable artifact"],
    ["store artifacts", "support local-first persistence", "preserve provenance", "recover drafts"],
    "Use Neon Postgres for canonical relational records, separate object storage for binaries, and explicit legacy adapters during migration.",
  ),
  spec(
    "interpretation-engine",
    "Interpretation Engine",
    "editorial-intelligence",
    ["services/tailorService.ts", "services/tailorAnalysisService.ts", "services/tailorBridge.ts", "services/liveAestheticService.ts"],
    "source-of-truth",
    "Interpret creative material through Tailor without classifying the user.",
    "Given images, links, notes, references, and collections, identify recurring motifs, silhouette, proportion, construction, materiality, atmosphere, historical influence, tensions, and editorial opportunities. Return evidence-linked interpretation, not labels.",
    ["images", "links", "notes", "collections", "approved references"],
    ["observations", "motifs", "tensions", "editorial opportunities", "evidence-linked inferences"],
    ["interpret references", "separate observation from inference", "bridge Tailor output downstream", "keep user final editor"],
    "Evolve into the main creative-literacy interpreter that feeds Taste Graph, Field Notes, Dossier, and projections.",
  ),
  spec(
    "aesthetic-engine",
    "Aesthetic Engine",
    "editorial-intelligence",
    ["services/aestheticGenerator.ts", "services/aestheticService.ts", "services/imageUtils.ts"],
    "support",
    "Infer visual language from creative evidence and prepare visual material for downstream work.",
    "Given references and project direction, produce palettes, typography, composition notes, materiality, silhouettes, atmosphere, and image-ready transformations with supporting evidence.",
    ["references", "images", "creative direction", "brand constraints"],
    ["palette", "typography", "composition notes", "image derivatives", "visual language"],
    ["process images", "infer visual systems", "support transformation", "avoid imitation"],
    "Become a multimodal visual language engine that can use any image, vision, or design provider through adapters.",
  ),
  spec(
    "semiotic-engine",
    "Semiotic Engine",
    "editorial-intelligence",
    ["services/semioticModulator.ts", "services/artHistoryService.ts", "services/thoughtSignatureService.ts"],
    "support",
    "Interpret symbolism, metaphor, cultural reference, and meaning without diagnostic claims.",
    "Analyze creative material for symbolism, narrative, cultural references, emotional signals, and thematic comparisons. Keep art history as comparison, never identity.",
    ["artifact", "reference set", "historical context", "field notes"],
    ["symbols", "metaphors", "thematic comparisons", "meaning notes"],
    ["interpret meaning", "cite evidence", "avoid identity claims", "surface uncertainty"],
    "Work as a meaning layer that strengthens creative literacy while leaving identity authorship with the user.",
  ),
  spec(
    "signal-engine",
    "Signal Engine",
    "editorial-intelligence",
    ["services/signalService.ts", "services/aiTaggingService.ts", "services/clusteringService.ts", "services/constellationService.ts"],
    "support",
    "Extract recurring patterns and organize creative material into meaningful relationships.",
    "Given fragments, references, notes, and artifacts, tag signals, discover clusters, identify anchors, and build constellations of related ideas.",
    ["fragments", "tags", "references", "notes", "artifacts"],
    ["tags", "clusters", "anchors", "constellations", "pattern evidence"],
    ["tag fragments", "cluster material", "detect recurring motifs", "connect ideas"],
    "Become the pattern layer between raw collection and Taste Graph reasoning.",
  ),
  spec(
    "taste-engine",
    "Taste Engine",
    "taste-intelligence",
    ["services/tasteEngine.ts", "services/signatureService.ts", "services/tasteLogger.ts"],
    "source-of-truth",
    "Infer latent creative principles from user-approved evidence as a living system, not a fixed profile.",
    "Given approved evidence and user feedback, identify core principles, negative space, hidden affinities, contradictions, emerging directions, and confidence scores. Never produce opaque identity scores.",
    ["approved references", "user confirmations", "user rejections", "field notes", "taste events"],
    ["taste principles", "confidence notes", "signature", "evolution history"],
    ["infer principles", "record provenance", "keep reasoning reversible", "separate confirmed from speculative"],
    "Evolve into the reasoning engine behind Creative Dossier, Field Notes, and mimi.u while preserving user editorial control.",
  ),
  spec(
    "taste-graph-engine",
    "Taste Graph Engine",
    "taste-intelligence",
    ["services/tasteGraphService.ts", "services/tasteLogger.ts", "services/constellationService.ts"],
    "source-of-truth",
    "Build and maintain the graph that anchors Mimi's evidence and relationships.",
    "Build a semantic graph from approved references. Nodes may include brands, designers, artists, materials, eras, colors, motifs, silhouettes, concepts, objects, and relationships. Every edge must be weighted and explainable.",
    ["approved references", "observations", "signals", "user confirmations"],
    ["nodes", "edges", "relationship weights", "provenance"],
    ["maintain graph", "link evidence", "explain relationships", "serve downstream projections"],
    "Remain Mimi's source of truth while dolls, brand kits, art styles, and zines stay projections.",
  ),
  spec(
    "provenance-engine",
    "Provenance Engine",
    "taste-intelligence",
    ["services/tasteLogger.ts", "services/auditService.ts", "services/engineContract.ts"],
    "source-of-truth",
    "Track why every conclusion exists and how it changed.",
    "Record every interaction, source, inference, user confirmation, user rejection, and engine output so conclusions remain explainable and reversible.",
    ["event", "claim", "source evidence", "feedback", "engine output"],
    ["audit record", "taste event", "provenance trail", "explanation packet"],
    ["track who/what/when/why/how", "link claims to evidence", "support reversal", "support review"],
    "Act as the audit spine for every Mimi engine and external provider adapter.",
  ),
  spec(
    "composition-engine",
    "Composition Engine",
    "composition",
    ["services/proposalOrchestrator.ts", "services/pressService.ts", "services/referenceCardExporter.tsx", "services/zineGenerator.ts", "services/thimbleService.ts"],
    "projection",
    "Transform knowledge into briefs, dossiers, reference cards, zines, and other creative outputs.",
    "Given evidence, Taste Graph relationships, Dossier notes, and user intent, compose structured recommendations and publishable artifacts that transform rather than imitate source material.",
    ["taste graph packet", "field notes", "project goal", "references", "format requirements"],
    ["proposal", "press artifact", "reference card", "zine", "export package"],
    ["compose outputs", "preserve evidence links", "support review", "optimize for transformation"],
    "Become a format-agnostic studio engine for briefs, reports, decks, zines, campaigns, and future creative projections.",
  ),
  spec(
    "generation-engine",
    "Generation Engine",
    "composition",
    ["services/geminiService.ts", "services/aestheticGenerator.ts", "services/zineGenerator.ts"],
    "projection",
    "Generate text, images, code, structured data, or media without assuming a specific model.",
    "Given a generation task and context packet, produce the requested format with provider-independent execution and explicit provenance.",
    ["generation task", "context packet", "format requirements", "provider plan"],
    ["generated artifact", "provider metadata", "provenance", "review notes"],
    ["generate content", "normalize outputs", "preserve source context", "mark speculative claims"],
    "Support text, image, audio, video, code, and structured data through interchangeable providers.",
  ),
  spec(
    "identity-engine",
    "Identity Engine",
    "platform",
    ["services/firebase.ts", "services/firebaseInit.ts", "services/firebaseUtils.ts", "services/connections.ts"],
    "adapter",
    "Manage authentication, authorization, profiles, organizations, permissions, and social relationships.",
    "Given a user/session request, resolve identity, access, profile data, and relationship state without leaking storage-provider details into product engines.",
    ["session", "auth state", "profile", "organization", "relationship action"],
    ["identity state", "permissions", "profile data", "relationship update"],
    ["initialize backend access", "manage auth state", "resolve permissions", "support relationships"],
    "Keep Firebase as Mimi authentication while server repositories resolve Neon-backed profiles, memberships, and permissions.",
  ),
  spec(
    "membership-engine",
    "Membership Engine",
    "platform",
    ["services/membershipPipeline.ts", "services/stripe.ts", "services/commerceService.ts", "services/retentionService.ts"],
    "support",
    "Manage plans, credits, subscriptions, feature access, commerce, and retention without interrupting creative flow.",
    "Given account state, usage, plan, and purchase intent, resolve access, credits, recommendations, and retention signals while keeping billing separate from creative truth.",
    ["account", "plan", "usage", "purchase intent", "engagement events"],
    ["entitlements", "credits", "checkout state", "retention insight"],
    ["manage billing", "resolve access", "track engagement", "support commerce"],
    "Support Stripe, future payment providers, licensing, teams, credits, and organization plans through adapters.",
  ),
  spec(
    "communication-engine",
    "Communication Engine",
    "platform",
    ["services/notificationService.ts", "services/errorHandling.ts", "services/firestoreErrorHandling.ts"],
    "support",
    "Deliver user-facing notifications, completion updates, reminders, and recoverable error messages.",
    "Given an event, error, or job status, produce a clear user-facing message and optional delivery request across available channels.",
    ["event", "error", "job status", "channel preference"],
    ["notification", "alert", "recovery guidance", "delivery receipt"],
    ["translate errors", "notify users", "support channels", "avoid opaque failures"],
    "Support email, push, SMS, Slack, Discord, webhooks, in-app alerts, and future channels.",
  ),
  spec(
    "monitoring-engine",
    "Monitoring Engine",
    "platform",
    ["services/systemHealth.ts", "services/sentinelService.ts", "services/ScalableInfrastructureService.ts"],
    "support",
    "Observe platform health, providers, storage, latency, errors, cost, usage, and execution readiness.",
    "Given system telemetry and provider state, detect anomalies, validate quality, and surface actionable operational issues before they affect users.",
    ["telemetry", "provider state", "storage state", "latency", "error logs"],
    ["health report", "alerts", "quality findings", "recovery actions"],
    ["monitor providers", "detect anomalies", "track health", "recommend recovery"],
    "Become a vendor-neutral observability layer for providers, queues, storage, jobs, and model costs.",
  ),
  spec(
    "execution-engine",
    "Execution Engine",
    "infrastructure",
    ["services/ScalableInfrastructureService.ts", "services/projectReconstructionEngines.ts", "services/mimiServiceEngineCatalog.ts"],
    "support",
    "Execute workflows through the same abstract engine contract.",
    "Given a workflow, engines, inputs, and constraints, validate each step, execute in order or parallel where safe, collect provenance, and return explainable outputs.",
    ["workflow", "engine registry", "inputs", "constraints", "feedback"],
    ["workflow output", "step provenance", "engine states", "validation results"],
    ["run engines", "validate inputs", "collect explanations", "evolve from feedback"],
    "Support background jobs, queues, scheduled tasks, agents, MCP tools, and future orchestration systems.",
  ),
  spec(
    "tool-engine",
    "Tool Engine",
    "infrastructure",
    ["services/googleDriveService.ts", "services/researchService.ts", "services/commerceService.ts", "services/apiKeyService.ts"],
    "adapter",
    "Provide a common interface to external capabilities and tools.",
    "Given a tool request and permission context, call external capabilities such as search, Drive, payments, GitHub, code execution, or future MCP tools, then normalize the result.",
    ["tool request", "permission context", "credentials", "provider adapter"],
    ["tool result", "normalized payload", "provenance", "error state"],
    ["call external tools", "normalize results", "protect credentials", "surface provenance"],
    "Let Mimi add or remove tools without changing product engines.",
  ),
];

export const mimiServiceEngines = mimiServiceEngineSpecs.map(createMimiServiceEngine);

export const mimiServiceEngineById = new Map(mimiServiceEngines.map((engine) => [engine.id, engine]));

export const getMimiServiceEnginesForFile = (serviceFile: string): Engine<MimiServiceEngineInput, MimiServiceEngineOutput>[] =>
  mimiServiceEngines.filter((engine) => {
    const sourceSpec = mimiServiceEngineSpecs.find((item) => item.id === engine.id);
    return sourceSpec?.serviceFiles.includes(serviceFile) || false;
  });
