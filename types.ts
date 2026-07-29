
import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { 'pricing-table-id'?: string, 'publishable-key'?: string, 'client-reference-id'?: string };
    }
  }
}

export interface TasteDiscoveryResult {
  coreAesthetic: string;
  psychologicalProfile: string;
  visualPreferences: {
    color: string;
    form: string;
    texture: string;
  };
  recommendedKeywords: string[];
  evolutionPath: string;
}

export interface AestheticBaseline {
  silhouette: string;
  colorPalette: string[];
  structureVsFlow: string;
  riskTolerance: string;
  socialSignalingLevel: string;
}

export interface AspirationalReference {
  emotionalTone: string;
  boldnessLevel: string;
  identitySignal: string;
}

export interface TransformationStage {
  stageNumber: number;
  name: string;
  description: string;
  wearability: string;
  keyChanges: string[];
  curatedShops?: { name: string; url: string; rationale: string }[];
}

export interface TransformationPath {
  baseline: AestheticBaseline;
  aspiration: AspirationalReference;
  stages: TransformationStage[];
}

export interface AestheticSignature {
  primaryAxis: string;
  secondaryAxis: string;
  coreTrait?: string;
  motifs: string[];
  core_keywords?: string[];
  moodCluster: string;
  generatedAt: number;
  influenceLineage: InfluenceLineageItem[];
  creativeCycles: CreativeCycle[];
  motifEvolution: MotifFrequency[];
  paletteExtraction?: string[];
  tactileBias?: { dominant: string; secondary: string };
  typographicPairing?: { serif: string; sans: string };
  promptMatrix?: string[];
}

export interface InfluenceLineageItem {
  artist: string;
  movement: string;
  connectionStrength: number;
}

export interface CreativeCycle {
  period: string;
  mood: string;
  motifSpikes: string[];
  outputCount: number;
}

export interface MotifFrequency {
  motif: string;
  frequency: number;
  date: number;
}

export interface MaterialityConfig {
  paperStock: 'newsprint' | 'cold-press' | 'vellum' | 'raw-cardboard';
  typographyLineage: 'brutalist' | 'editorial-serif' | 'technical-mono';
  negativeSpaceDensity: number; // 1-10
  colorScheme: 'monochrome' | 'high-contrast' | 'earth-tones';
}

export interface ZineGenerationOptions {
  style: 'minimalist' | 'maximalist' | 'experimental' | 'balanced';
  theme: 'organic' | 'synthetic' | 'latent';
  contentFocus: 'visual-heavy' | 'text-heavy' | 'balanced';
  artStyle?: string;
  aestheticTone?: 'Cinematic' | 'Editorial' | 'Dreamy' | 'Industrial' | 'Noir';
  goals?: string;
  tags?: string[];
  customTitle?: string;
  selectedTreatmentId?: string;
  readingLevel?: 'short' | 'slow';
  compositionMix?: 'uniform' | 'editorial_mix';
  includeGeoBlock?: boolean;
  temperature?: number;
  imageEnhancement?: boolean;
  imageFilter?: 'none' | 'upscale' | 'grain' | 'duotone' | 'vivid' | 'vintage';
}

export type ZodiacSign = 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo' | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

export interface MediaFile {
  id?: string; // Identification for UI lists
  type: 'image' | 'audio' | 'video' | 'link' | 'file';
  url: string;
  data: string; // base64
  mimeType: string;
  name?: string;
  tags?: string[];
  file?: File;
  transcription?: string;
}

export interface ColorShard {
  name: string;
  hex: string;
  descriptor?: string;
}

export interface AgentEnrichment {
  autoTags?: string[];
  detectedEra?: string;
  culturalReference?: string;
  visualSemiotics?: string;
  lastAgentUpdate?: number;
}

export interface Stack {
  id: string;
  userId: string;
  title: string;
  description: string;
  fragmentIds: string[];
  createdAt: number;
}

export interface TasteReflection {
  alignmentScore: number;
  analysis: {
    pros: string[];
    cons: string[];
  };
  prediction: string;
  evolution: {
    reinforces: string;
    introduces: string;
    trajectory: string;
  };
  extractedSignals: {
    brand?: string;
    silhouette?: string;
    palette?: string[];
    category?: string;
    material?: string;
    tags: string[];
  };
  metrics?: {
    density: {
      score: number;
      signals: string;
      reasoning: string;
    };
    entropy: {
      score: number;
      signals: string;
      reasoning: string;
    };
    attractionAnalysis: string;
  };
}

export interface TasteCluster {
  id: string;
  centerEmbedding: number[];
  label: string;
  memberArtifactIds: string[];
  strength: number;
}

export interface CanonicalTasteObject {
  motifs: string[];
  palette: string[];
  form: string[];
  mood: string[];
  era_refs: string[];
  density: number; // 0-1
  entropy: number; // 0-1
  prompt_fragments: string[];
  commercial_signals: string[];
  novelty_score: number; // 0-1
  media_translation?: {
    format: string;
    medium: string;
    color_space: string;
    capture_system: string;
    lens_language: string;
    edit_procedure: string[];
    output_notes: string;
  };
}

export interface Artifact {
  id: string;
  sourceUrl?: string;
  mediaType: 'image' | 'text' | 'audio' | 'video';
  canonicalTaste?: CanonicalTasteObject;
  createdAt: number;
}

export interface TasteNode {
  id: string;
  label: string;
  canonicalTaste: CanonicalTasteObject;
  connections: string[];
}

export interface ClusterAnchor {
  id: string;
  label: string;
  canonicalTaste: CanonicalTasteObject;
  memberIds: string[];
  weight: number;
}

export interface GenerationPreset {
  id: string;
  name: string;
  canonicalTaste: CanonicalTasteObject;
  systemPrompt: string;
}

export interface AdComponent {
  id: string;
  campaignId: string;
  canonicalTaste: CanonicalTasteObject;
  copy: string;
  mediaUrl: string;
}

export interface TasteProfile {
  profileEmbedding?: number[];
  dominantClusters?: string[];
  lastUpdated?: number;
  archetype_weights: Record<string, number>;
  color_frequency: Record<string, number>;
  audit_history?: DriftEvent[];
  semantic_signature?: string;
  aestheticSignature?: AestheticSignature;
  aestheticTrajectory?: AestheticTrajectory;
  dominant_archetypes?: TypographicArchetype[];
  inspirations?: string;
  sovereignIdentity?: SovereignIdentityCard;
  constraints?: string[];
  canonicalTaste?: CanonicalTasteObject;
}

export interface DeltaVerdict {
  alignmentScore: number;
  divergencePoints: string[];
  resonanceAnalysis: string;
  surpriseVerdict: string;
}

export interface PocketItem {
  id: string;
  userId: string;
  title: string;
  source: string;
  timestamp: number;
  embedding?: number[];
  price?: number;
  tags?: string[];
  stackIds?: string[]; // NEW: Reference to stacks
  type: 'image' | 'video' | 'zine_card' | 'omen' | 'voicenote' | 'moodboard' | 'roadmap' | 'script' | 'analysis_report' | 'link' | 'text';
  savedAt: number;
  content: any;
  notes?: string;
  treatmentApplied?: string;
  parentShardId?: string;
  agentEnrichment?: AgentEnrichment;
  deltaVerdict?: DeltaVerdict;
}

export interface WardrobeItem {
  id: string;
  userId: string;
  title: string;
  imageUrl: string;
  silhouettePolygon?: string; // CSS shape-outside polygon
  category: 'top' | 'bottom' | 'outerwear' | 'shoe' | 'accessory' | 'other';
  tags: string[];
  costPerWear?: number;
  purchasePrice?: number;
  wearCount?: number;
  synergyScore?: number; // How well it fits the established vibe
  isArchived: boolean;
  createdAt: number;
}

export interface WardrobeCapsule {
  id: string;
  userId: string;
  name: string;
  description: string;
  itemIds: string[];
  aestheticGoal: string; // e.g. "Minimalist Professional", "Brutalist Leisure"
  maxItems: number;
  createdAt: number;
}

export interface SilhouetteInsight {
  bodyType: string;
  recommendedSilhouettes: string[];
  rationale: string;
  confidenceBoosters: string[]; // Specific tips for confidence
}

export interface TailorLogicDraft {
  positioningCore: {
    anchors: {
      culturalReferences: string[];
      ideologicalBias?: string[];
      culturalSynthesis?: string[];
      trendClusters?: string[];
      scryLinks?: string[];
    };
    aestheticCore: {
      silhouettes: string[];
      materiality: string[];
      eraBias: string;
      mediaStyle?: string[]; // Photographic or media style reference
      presentation?: string; // Feminine, Masculine, Androgynous, or custom
      bodyType?: string; // e.g. 'Hourglass', 'Athletic', 'Petite'
      density: number;  // 1?10
      entropy: number;  // 1?10
      tags: string[];
      visualShards?: string[];
      silhouetteInsight?: SilhouetteInsight; // NEW: Body-specific logic
    };
    positioningAxis: string;
    authorityClaim: string;
    exclusionPrinciples: string[];
  };

  algoDials?: {
    webScry: number;
    memorySynthesis: number;
    dissonance: number;
    binaryToSpectrum?: number;
  };

  visual_guidance?: {
    strict_palette: string[];
    negative_prompt?: string;
    composition_density?: number;
  };

  expressionEngine: {
    chromaticRegistry: {
      primaryPalette: ColorShard[];
      baseNeutral: string;
      accentSignal: string;
    };
    colorPalette: {
      primary: string;
      accent: string;
      preset?: string;
    };
    typographyIntent: {
      styleDescription: string;
      weightPreference: string;
    };
    typography: {
      serif: string;
      sans: string;
      mono: string;
    };
    visualPresets: {
      silhouette: string;
      texture: string;
      era: string;
    };
    narrativeVoice: {
      emotionalTemperature: string;
      structureBias: string;
      lexicalDensity: number;  // 1?10
      restraintLevel: number;  // 1?10
      voiceNotes?: string;
      tone?: string;
    };
    brandIdentity?: {
      fonts: {
        serif: string;
        sans: string;
        mono: string;
      };
      logo?: string;
      palette: string[];
    };
  };

  strategicVectors: {
    expansionTolerance: number;  // 1?10
    fiscalVelocity: "conservative" | "measured" | "accelerated";
    desireVectors: {
      deepen: string[];
      reduce: string[];
      experiment: string[];
      refuse: string[];
    };
    saturationAwareness: {
      oversaturatedClusters: string[];
      fragileDifferentiators: string[];
    };
  };

  diagnostics: {
    contradictionFlags: string[];
    dilutionRisks: string[];
    authorityStrengthScore: number;  // 0?100
    driftVulnerability: number;      // 1?10
  };

  chromaticRegistry?: {
    primaryPalette: ColorShard[];
    baseNeutral: string;
    accentSignal: string;
  };
  typographyIntent?: {
    styleDescription: string;
    weightPreference: string;
  };

  strategicSummary: {
    identityVector: string;  
    authorityAnchor: string;
    exclusionRules: string[];
    elasticityIndex: number;
    tonalConstraints: string;
    aestheticDNA: string;
  };

  celestialCalibration?: {
    enabled: boolean;
    zodiac?: ZodiacSign;
    birthDate?: string;
    birthTime?: string;
    birthLocation?: string;
    astrologicalLineage?: string;
    seasonalAlignment?: string;
  };

  materialityConfig?: MaterialityConfig;
  seedName?: string;
  characterReferences?: { name: string; description: string; imageUrl?: string }[];
  darkRoomTreatments?: { name: string; logic: string }[];
  styleEvidence?: Array<{
    id: string;
    type: "image_reference" | "text_reference";
    value: string;
    source: "user_input" | "tailor_evidence";
    scope: "persistent" | "project" | "session";
    weight: number;
    notes: string;
    approvedAt: number;
  }>;

  generationTemperature?: number; 
  draftStatus: 'provisional' | 'aligned' | 'evolving';
  aiSignature?: string;
  lastTailored: number;
}

export interface Persona {
  id: string;
  name: string;
  tailorDraft: TailorLogicDraft;
  apiKey?: string; // Optional override for specific billing
  themePreference?: string;
  photoURL?: string; // Visual representation for the mask
  createdAt: number;
  operationalParameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

export interface ZineSpec {
  id?: string;
  meta: {
    mode: "editorial" | "research" | "seasonal" | "oracle";
    intent: string;
    timestamp: number;
  };
  taste_context: {
    active_archetype: string;
    active_palette: string[];
    last_audit_summary?: string; 
  };
  structure: {
    hero_prompt: string;
    pages: ZinePageSpec[];
    sonic_layer?: string;
  };
  visual_guidance: {
    strict_palette: string[];
    negative_prompt: string;
    composition_density: number;
  };
  title?: string;
  headlines?: string[];
  vocal_summary_blurb?: string;
  header_image_prompt?: string;
  the_reading?: string;
  strategic_hypothesis?: string;
  semiotic_signals?: SemioticSignal[];
  aesthetic_touchpoints?: AestheticTouchpoint[];
  celestial_calibration?: string;
  visual_plates?: string[];
  the_roadmap?: string;
  originalThought?: string;
  poetic_provocation?: string;
  
  // Legacy fields
  oracular_mirror?: string;
  poetic_interpretation?: string;
  blueprint?: FruitionTrajectory;
  roadmap?: Roadmap;
  archetype_weights?: ArchetypeWeights;
}

export type RoadmapPhaseType = "establish" | "differentiate" | "operationalize" | "expand" | "evolve";

export interface AuthorityAnchor {
  coreClaim: string;
  repetitionVector: string;
  exclusionPrinciple: string;
}

export interface RoadmapPhase {
  type: RoadmapPhaseType;
  objective: string;
  strategicMove: string;
  artifactOutputs: string[];
  riskToIntegrity: string;
  signalToMonitor: string;
}

export interface DriftForecast {
  predictedClusterShift: string;
  audienceEvolution: string;
  absorptionRisk: string;
  overexposureRisk: string;
  refusalPoint: string;
}

export interface Roadmap {
  strategicThesis: string;
  positioningAxis: string;
  authorityAnchor: AuthorityAnchor;
  intensity: "low" | "medium" | "high";
  densityLevel: number;
  entropyLevel: number;
  timelineMode: "compressed" | "standard" | "long-arc";
  phases: RoadmapPhase[];
  driftForecast: DriftForecast;
}

export interface ZinePageSpec {
  pageNumber: number;
  headline: string;
  bodyCopy: string;
  supportingText?: string;
  imagePrompt: string;
  image_url?: string;
  pageType?: 'standard' | 'thread_timeline';
  threadData?: {
    artifacts: any[]; // Will be PocketItem[]
    commentary: string;
  };
}

export interface ZineContent extends ZineSpec {
  pages?: ZinePageSpec[];
  pagesJson?: string;
  geoBlock?: GeoBlock;
  designBrief?: string;
  hero_image_url?: string;
  hero_image_prompt?: string;
}

export interface ZineFolder {
  id: string;
  userId: string;
  name: string;
  createdAt: number;
}

export interface ZineMetadata {
  id: string;
  fragmentsUsed: string[];
  usedContextSnapshots?: UsedContextSnapshot[];
  createdAt: number;
  theme: string;
  aestheticVector: Record<string, number>;
  userId: string;
  userHandle: string;
  userAvatar?: string | null;
  title: string;
  concept?: string;
  summary?: string;
  tone: ToneTag;
  timestamp: number;
  likes: number;
  content: ZineContent;
  coverImageUrl?: string | null;
  editorialCompileMarkdown?: string;
  editorialCompileCompiledAt?: number;
  isDeepThinking?: boolean;
  isLite?: boolean;
  isQuickPreview?: boolean;
  imageEnhancement?: boolean;
  imageFilter?: string;
  isHighFidelity?: boolean;
  isPublic?: boolean;
  isLocked?: boolean;
  mask?: string;
  useSearch?: boolean;
  useMaps?: boolean;
  taskMode?: boolean;
  transmissionsUsed?: {
    userHandle: string;
    timestamp: number;
    content: string;
  }[];
  authorship?: string;
  originalInput?: string; 
  artifacts?: MediaFile[];
  lineage?: string[];
  embedding?: number[]; // NEW
  tags?: string[];
  treatmentId?: string;
  folderId?: string; // NEW: For organizing zines into folders
  executionLayer?: ExecutionLayer; // NEW
}

export interface SemioticSignal {
  motif: string;
  context: string;
  visual_directive?: string; 
  type?: 'acquisition' | 'conceptual' | 'lexical'; // NEW: Referential types
  link?: string; // NEW: Grounding link for acquisition
  semantic_trigger?: string; // The specific keyword/concept from the user's profile that triggered this
  targeting_rationale?: string; // Evidence-linked editorial explanation for the touchpoint
  image_url?: string;
  vendor?: string;
  price?: string;
  commerce_source?: 'shopify' | 'editorial';
  product_id?: string;
}

export interface AestheticTouchpoint {
  type: 'visual' | 'lexical' | 'sonic';
  motif: string;
}

export interface FruitionTrajectory {
  inciting_debris: string;
  structural_pivot: string;
  climax_manifest: string;
  end_product_spec: string;
}

export type ToneTag = 'chic' | 'nostalgia' | 'dream' | 'unhinged' | 'panic' | 'editorial' | 'research' | 'Cinematic Witness' | 'Editorial Stillness' | 'Romantic Interior' | 'Structured Desire' | 'Documentary B&W' | 'CONTENT' | 'SHADOW' | 'SIGNAL' | 'ECHO' | 'MANIFESTO' | 'SHARD' | 'DOSSIER' | 'PROMPT' | 'RAW' | 'VINTAGE' | 'CONTRARY';
export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9';
export type ImageSize = '1K' | '2K' | '4K';

export enum AppState {
  IDLE = 'IDLE',
  THINKING = 'THINKING',
  REVEALED = 'REVEALED',
  ERROR = 'ERROR'
}

export type TypographicArchetype = 'editorial-serif' | 'minimalist-sans' | 'brutalist-mono';

export interface DriftEvent {
  type: 'archetype_shift' | 'color_shift';
  timestamp: number;
  before: { archetype?: string; color?: string };
  after: { archetype?: string; color?: string };
  magnitude: number;
  triggerZineId: string;
}

export interface SovereignIdentityCard {
  aestheticCoordinates: {
    name: string;
    description: string;
  }[];
  tasteDriftPercentage: number;
  svgVisual: string; // NEW
  generatedAt: number;
}

export interface AestheticTrajectory {
  trajectoryId: string;
  userMomentum: string;
  predictedAestheticShift: string;
  psychologicalObservation: string;
  trajectoryLabel: 'aligned' | 'adjacent' | 'divergent' | 'latent';
  confidence: number;
  timestamp: number;
}

export type SymbolVector = {
  curvature: number; // 0 = sharp, 1 = soft
  density: number;   // 0 = minimal, 1 = ornate
  structure: number; // 0 = chaotic, 1 = ordered
  temperature: number; // 0 = cold, 1 = warm
  domain: number; // 0 = technical, 1 = mystical
};

export interface AestheticDNA {
  dnaStatement: string;
  archetypes: string[];
  poeticExpansion: string;
  generatedAt: number;
  axisBreakdown?: {
    form: string;
    density: string;
    structure: string;
    temperature: string;
    domain: string;
  };
  visualTranslation?: string;
  signalNotes?: string;
  vectors?: {
    selected: SymbolVector[];
    rejected: SymbolVector[];
    aggregate: SymbolVector;
  };
}

export interface ExecutionLayer {
  topTakeaway: string;
  concreteActions: string[];
  directionalDecision: string;
  antiPattern: string;
}


export interface AestheticVector {
  // FORM
  entropy: number;       // 0.0 (Minimal) ? 1.0 (Complex)
  density: number;       // 0.0 (Light/Airy) ? 1.0 (Dense/Layered)
  silhouette: number;    // 0.0 (Fluid) ? 1.0 (Structured)
  texture: number;       // 0.0 (Smooth) ? 1.0 (Coarse)
  contrast: number;      // 0.0 (Tonal) ? 1.0 (High Contrast)

  // TEMPORAL
  temporalSignal: number; // 0.0 (Timeless/Placeless) ? 1.0 (Time-specific / Trend-coded)

  // EXPRESSION
  expressiveness: number; // 0.0 (Restrained) ? 1.0 (Expressive)

  // PERCEPTUAL DYNAMICS (NEW)
  novelty: number;       // 0.0 (Expected/Familiar) ? 1.0 (Unexpected/Surprising)
  tension: number;       // 0.0 (Harmonious) ? 1.0 (Conflicting/Dynamic)
}

export interface ThimbleTasteEvent {
  userId: string;
  artifactId: string;

  aestheticVector: AestheticVector;

  similarityScore: number; // cosine similarity (0?1)
  trajectoryLabel: 'aligned' | 'adjacent' | 'divergent' | 'latent';

  interpretation: string; // generated insight
  confidence: number;     // NEW: model confidence (0?1)

  timestamp: number;
}

export interface ThimbleBoard {
  id: string;
  userId: string;
  collaborators?: string[];
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ThimbleItem {
  id: string;
  boardId: string;
  userId: string;
  url: string;
  title?: string;
  price?: string;
  notes?: string;
  imageUrl?: string;
  createdAt: number;
  tasteFingerprint?: {
    silhouetteCluster: string;
    materialSignal: string[];
    eraAffinity: string;
    priceAnchor: 'archive' | 'contemporary' | 'luxury';
    brandDNA: string[];
    aestheticTags: string[];
    analyzedAt: number;
  };
}

export interface TasteEvent {
  userId: string;
  event_type: 'view' | 'tweak' | 'save' | 'scry' | 'signature_feedback';
  input_context: {
    raw_text: string;
    selected_tone?: string;
    selected_archetype?: string;
    user_intent?: string;
  };
  output_context: {
    zineId?: string;
    generated_archetype?: string;
    colors?: string[];
    scry_insights?: any;
    taste_snapshot?: TasteProfile;
    layout_type?: string;
  };
  signature_payload?: {
    phrasingFeedback: Record<string, 'lands' | 'misses'>;
    toneFeedback: 'lands' | 'misses' | null;
    clusterFeedback: Record<string, 'lands' | 'misses'>;
    correctionNote: string;
  };
  behavioral_signal?: {
    dwellMs: number;
    scrollDepth: number;
    revisitCount: number;
    interactionType: 'glance' | 'linger' | 'study' | 'return';
  };
  timestamp: number;
  sessionId?: string;
}

export interface ProductTasteEvent {
  userId: string;
  itemId: string;
  dwellTime: number;
  interactionType: 'view' | 'like' | 'save';
  tags?: string[];
  timestamp: number;
}

export interface EditIssue {
  trajectoryId: string;
  thesis: string;
  codexReading: string;
  sequence: Array<{
    productId: string;
    caption: string;
    placement: 'hero' | 'supporting' | 'footnote';
  }>;
}

export interface AuditEntry {
  id: string;
  type: 'manifest' | 'archive';
  featureName: string;
  timestamp: number;
  reason: string;
  impact: string;
}

export interface TailorAuditReport {
  aestheticDirectives: string[];
  strategicOpportunity: string;
  profileManifesto: string;
  suggestedTouchpoints: string[];
}

export interface TasteAuditReport {
  coreFrequency: string;
  diagnosis: string;
  conceptualThroughline: string;
  designBrief: string;
  colorStory: ColorShard[];
  keyTouchpoints?: string[];
}

export interface VideoAuditReport {
  alignmentScore: number;
  narrativeCritique: string;
  missedSemiotics: string[];
  editingDirectives: string[];
  audienceResonance: string;
}

export interface InvestmentReport {
  thesis: string;
  tailor_alignment_note?: string;
  capital_allocation: {
    category: "KEYSTONE ASSET" | "STRATEGIC EXPENSE" | "VANITY METRIC";
    items: string[];
    reasoning: string;
    fiscal_route: "Business Write-off" | "Personal Equity" | "Operational Cost";
  }[];
  capsule_impact_score: number;
  missing_infrastructure: string;
}

export interface TrendSynthesisReport {
  pattern_signals: string[];
  structural_shifts: string;
  cultural_forces: string;
  time_horizon: string;
  grounding_sources?: { uri: string; title?: string }[];
}

export interface SanctuaryReport {
  validation: string;
  objectiveReframing: string;
  sartorialAffirmation: string;
}

export interface SeasonReport {
  currentVibe: string;
  cliqueLogic: string;
  timestamp: number;
}

export type ProsceniumRole = 'Witness' | 'Muse' | 'Editor' | 'Architect';

export interface EditorElementStyle {
  top: number;
  left: number;
  width: number;
  height?: number;
  zIndex?: number;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontStyle?: string;
  fontWeight?: string;
  rotation?: number;
  lineHeight?: number;
  objectFit?: 'cover' | 'contain';
  filter?: string;
  hasPin?: boolean;
  // BORDERS & OUTLINES
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  padding?: number;
  backgroundColor?: string;
  backgroundImage?: string;
  mixBlendMode?: string;
}

export interface EditorElement {
  id: string;
  type: 'image' | 'text' | 'box' | 'signal' | 'analysis_pin';
  content: string;
  link?: string;
  negativePrompt?: string;
  notes?: string;
  style: EditorElementStyle;
  sourceRef?: string;
  aestheticViolation?: { isViolation: boolean; reason: string };
  harmonizing?: boolean;
}

export interface ZinePage extends ZinePageSpec {
  image_url?: string;
  originalMediaUrl?: string;
  negativePrompt?: string;
  customLayout?: {
    elements: EditorElement[];
    editTrace?: { timestamp: number; note: string }[];
  };
}

export interface Treatment {
  id: string;
  name: string;
  instruction: string;
  variance?: 'interpretive' | 'anchored';
  isMixedMedia?: boolean;
  createdAt?: number;
  userId?: string;
}

// STRATEGIC IMPERATIVES
export interface Task {
  id: string;
  text: string;
  description?: string;
  notes?: string;
  completed: boolean;
  dueDate?: string;
  createdAt: number;
  platform?: string;
  tags?: string[];
  position?: { x: number; y: number };
  linkedContext?: { type: 'zine' | 'thimble' | 'dossier' | 'audit'; id: string };
}

export interface GeoBlock {
  id: string;
  sourceArtifactId?: string;
  sourceText: string;
  concepts: {
    name: string;
    description: string;
  }[];
  frameworks: {
    title: string;
    steps: string[];
  }[];
  citableLines: string[];
  embedding: number[];
  createdAt: number;
}

export interface StrategyAudit {
  id: string;
  platform: string;
  intent: string;
  identitySeed: string;
  timestamp: number;
  read: {
    openingLine: string;
    signalBreakdown: {
      reach: string;
      saves: string;
      shares: string;
      comments: string;
    };
    aestheticAudit: {
      palette: string;
      density: string;
      entropy: string;
      insight: string;
    };
    contentBehavior: string[];
    strategyShift: string[];
    contentPlan: {
      format: string;
      hook: string;
      visual: string;
      why: string;
      sensoryHook?: string;
      cognitiveLoad?: string;
      algorithmicTarget?: string;
    }[];
    audienceAlchemy: string;
    experiments: {
      test: string;
      successMetric: string;
      nextStep: string;
    }[];
    identityReframe: string;
  };
}

export interface DossierFolder {
  id: string;
  userId: string;
  name: string;
  createdAt: number;
  notes?: string;
  tasks?: Task[];
  collaborators?: string[];
}

export interface DossierElement {
  id: string;
  itemId?: string;
  type: 'image' | 'text' | 'analysis_pin';
  content: string;
  notes?: string;
  style: {
    zIndex: number;
    isPolaroid?: boolean;
    hasPin?: boolean;
  };
}

export type MoodboardLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  rotation?: number;
};

export interface DossierArtifact {
  id: string;
  userId: string;
  folderId: string;
  type: string;
  title: string;
  createdAt: number;
  elements: DossierElement[];
  report?: TasteAuditReport;
  tags?: string[];
  stackIds?: string[]; // NEW: For clustering
  status?: 'active' | 'dormant'; // NEW: For Dormant Vision System
  deltaVerdict?: DeltaVerdict;
  layout?: MoodboardLayout;
  imageUrl?: string;
  sourceUrl?: string;
  kind?: "upload" | "archive" | "generated";
  preview?: {
    dominantColor?: string;
    aspectRatio?: number;
  };
}

export interface SlideBlock {
  id: string;
  type: string;
  title: string;
  elements: EditorElement[];
}

export interface DarkroomLayer extends Treatment {
  layerId: string;
  opacity: number;
  isVisible: boolean;
}

export interface StyleTreatment {
  id: string;
  createdAt: number;
  treatmentName: string;
  canonicalTaste: CanonicalTasteObject;
  tags?: string[];
}

export interface UserPreferences {
  tailorDraft?: TailorLogicDraft;
  likenessManifest?: LikenessManifest;
  evidenceDossier?: EvidenceBasedCreativeDossier;
  personas?: Persona[]; 
  activePersonaId?: string;
  tasteProfile?: TasteProfile;
  savedTreatments?: StyleTreatment[];
  starredZineIds?: string[];
  lastAuditReport?: TailorAuditReport;
  enabledAlgos?: string[]; // NEW: User-defined firewalls for specific functions
  zineOptions?: ZineGenerationOptions;
  agentConfig?: {
    curatorEnabled: boolean;
    sentinelEnabled: boolean;
    curatorBudget: number;
    sentinelBudget: number;
  };
}

export type MembershipPlan = 'core' | 'pro' | 'lab' | 'free';

export interface SubscriptionData {
  status: 'active' | 'canceled' | 'past_due';
  planId: string;
  stripeCustomerId: string;
  currentPeriodEnd: number;
}

export type UserPlanStatus = 'ghost' | 'trial' | 'free' | 'core' | 'pro' | 'lab' | 'expired';

export interface UserProfile extends UserPreferences {
  uid: string;
  handle: string;
  /** Published doll + taste token for anonymous visitors at /u/:handle */
  publicShowcase?: PublicShowcaseSnapshot;
  email?: string | null;
  photoURL?: string | null;
  zodiacSign?: ZodiacSign;
  birthDate?: string;
  birthTime?: string;
  birthLocation?: string;
  currentSeason: 'rotting' | 'blooming' | 'frozen' | 'burning';
  createdAt: number;
  lastActive?: number;
  isSwan?: boolean;
  hiddenMenuItems?: string[]; 
  useLikeness?: boolean;
  syncedUsers?: string[];
  tasteVector?: Record<string, number>;
  aestheticDNA?: AestheticDNA; // NEW
  geoProfile?: GEOPack & {
    lastSynthesized: number;
    driftScore: number;
    driftAlert?: boolean;
  };
  // Patron & Retention Tracking
  isPatron?: boolean;
  patronActivatedAt?: number;
  patronKey?: string;
  plan?: 'free' | 'core' | 'pro' | 'lab';
  planStatus?: UserPlanStatus;
  trial?: {
    startedAt: number;
    endsAt: number;
    grantedCredits: number;
    usedCredits: number;
    remainingCredits: number;
    expiredAt?: number | null;
    convertedAt?: number | null;
    source?: 'gateway' | 'invite' | 'manual';
    bonusCredits?: number;
  };
  usage?: {
    totalGenerations: number;
    lastGenerationAt?: number;
    tailorRuns: number;
    reportRuns: number;
    imageRuns: number;
  };
  featureFlags?: {
    canComment: boolean;
    canSubmit: boolean;
    canGenerateImages: boolean;
    canUseDeepSearch: boolean;
  };
  subscriptionInterval?: 'month' | 'year';
  subscriptionStatus?: 'active' | 'inactive' | 'past_due' | 'canceled';
  subscription?: SubscriptionData;
  membershipPlan?: MembershipPlan;
  membershipCredits?: {
    allowance: number;
    remaining: number;
    used: number;
    interval?: 'month' | 'year';
    periodStartedAt?: number;
    periodEndsAt?: number;
    rolloverEligible?: boolean;
    lastGrantedAt?: number;
  };
  generationCount?: number;
  firstVisitAt?: number;
  lastVisitAt?: number;
  visitCount?: number;
  sessionDates?: number[];
  bio?: string;
  uiMode?: 'stage' | 'control'; // NEW: For Stage vs Control Room interface
  dnaMapped?: boolean; // NEW: For Progressive Disclosure onboarding
  displayName?: string;
  externalLinks?: { title: string; url: string }[];
  pocket?: PocketItem[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: number;
}

export interface NarrativeThread {
  id: string;
  userId: string;
  title: string;
  narrative: string;
  notes?: string;
  artifacts?: string[]; // IDs of associated artifacts
  mode: 'emotional' | 'biographical' | 'influence';
  createdAt: number;
  updatedAt: number;
}

export type ProposalStatus = "draft" | "locked" | "exported";

export interface BrandKit {
  primaryFont: string;
  secondaryFont: string;
  colorPalette: string[];
}

export interface LayoutConfig {
  template: "editorial" | "presentation" | "portfolio" | "bimbo-intellectual";
  fontSet: string[];
  colorSet: string[];
  spacingScale: number;
  backgroundStyle?: string;
  customStyles?: Record<string, string>;
}

export interface ProposalSection {
  id: string;
  title: string;
  body: string;
  visual_directive?: string; 
  elements: EditorElement[];
  order: number;
}

export interface ProposalContent {
  summary: string;
  analysis: string;
  sections: ProposalSection[];
}

export interface Proposal {
  id: string;
  userId: string;
  title: string;
  sourceFolderId: string;
  sourceArtifactIds: string[];
  content: ProposalContent;
  layout: LayoutConfig;
  brandKitSnapshot?: BrandKit;
  version: number;
  status: ProposalStatus;
  createdAt: number;
  updatedAt: number;
}

// -- SHARED CONTEXT SYSTEM -- //

export interface VibeNote {
  id: string;
  userId: string;
  userHandle: string;
  note: string; // The vibe (e.g., an emoji, a short phrase, a color hex)
  timestamp: number;
}

export interface Transmission {
  id: string;
  userId: string;
  userHandle: string;
  content: string; // The text content or summary
  timestamp: any; // Firestore Timestamp or number
  type: 'manifest' | 'echo' | 'signal';
  likes: number;
  // New fields for Gallery Mode
  title?: string;
  coverImage?: string;
  zineId?: string;
  artifacts?: MediaFile[];
  vibeNotes?: VibeNote[];
}

export interface LineageEntry {
  id?: string;
  userId: string;
  artifact_id: string;
  thought_signature: string;
  fragment_ids: string[];
  archetype_weights: ArchetypeWeights;
  timestamp: number;
}

export interface ContextEntry {
  id: string;
  userId: string;
  text: string;
  type: 'note' | 'link';
  timestamp: number;
}

export interface Fragment {
  id: string;
  userId: string;
  type: 'image' | 'text' | 'audio' | 'link' | 'zine_card';
  content: any; // Raw content
  tags: string[]; // AI generated tags
  aestheticVector: Record<string, number>; // For aesthetic tracking
  createdAt: number;
  sourceId?: string; // Reference to parent or source
  status: 'active' | 'dormant'; // NEW: For Dormant Vision System
}

export type Archetype = 'Architect' | 'Dreamer' | 'Archivist' | 'Catalyst';
export type ArchetypeWeights = Record<Archetype, number>;

export interface Constellation {
  id: string;
  userId: string;
  title: string;
  description?: string;
  artifactIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  link?: string;
  timestamp: number;
  read: boolean;
}

export interface TasteGraphNode {
  id: string;
  label: string;
  type: 'concept' | 'motif' | 'era' | 'web_reference';
  weight: number;
  explanation?: string;
  sourceUrl?: string;
  domain?: string;
  evidenceNodeIds?: string[];
  observationIds?: string[];
  claimType?: ClaimType;
  userStatus?: UserCurationStatus;
}

export interface TasteGraphEdge {
  source: string;
  target: string;
  strength: number;
  type: 'relates_to' | 'evolves_from' | 'contrasts_with';
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  affiliateLink: string;
  embedding: number[];
  category: string;
  tags: string[];
}

export interface PressIssue {
  id: string;
  title: string;
  narrative: string;
  matchedProductIds: string[];
  createdAt: number;
  userId: string;
  signalStrength: string;
  trajectoryId: string;
}

export interface PageDefinition {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
  path: string;
}

// -- GEO ENGINE SYSTEM -- //

export interface GEOVector {
  structure: number;        // s: fluid -> rigid
  entropy: number;         // e: order -> chaos
  colorIntensity: number;   // c: muted -> vibrant
  textureComplexity: number; // t: smooth -> coarse
  contrast: number;         // x: flat -> deep
  motionEnergy: number;     // m: static -> dynamic
  referenceDensity: number; // r: sparse -> layered
  depth: number;            // d: shallow -> voluminous
  formRigidity: number;     // f: soft -> brutalist
}

export interface GEOPack {
  id: string;
  userId: string;
  intent: string;
  retrievalIdentity: {
    identityDescription: string;
    semanticClusters: string[];
  };
  audienceEmbedding: {
    naturalLanguagePrompts: string[];
    targetCategories: string[];
  };
  generativeIntent: {
    usageDefinition: string;
    recommendedUseCases: string[];
  };
  semanticSignature: {
    tone: string;
    phrasingPatterns: string[];
    stylisticLanguage: string;
  };
  aestheticVectorSummary: {
    perceptualTraits: Record<string, number>;
    cohesiveSummary: string;
  };
  marketMirror?: {
    iabCategories: {
      categoryName: string;
      reasoning: string;
      isContested: boolean;
    }[];
    consumerArchetype: string;
    typicallyServedBrands: string[];
    mimiRecommends: string[];
    blindSpots: string[];
  };
  createdAt: number;
  manualOverrides?: Record<string, boolean>;
  generatedValues?: any;
  driftScore?: number;
  driftAlert?: boolean;
  lastSynthesized?: number;
  geoQBlocks?: {
    question: string;
    answer: string;
  }[];
}

// -- YOU SEARCH INTEGRATION SYSTEM -- //

export type YouSearchWebResult = {
  url: string;
  title?: string;
  description?: string;
  snippets?: string[];
  date?: string;
  source?: string;
};

export type MimiAestheticGraphNode = {
  sourceUrl: string;
  title: string;
  summary: string;
  domain: string;
  aestheticSignals: {
    keywords: string[];
    references: string[];
    tone: string;
  };
  graphType: "web_reference";
  confidence: number;
};

/** Scribe atom queued for Studio / Edit generation (approve ? apply loop). */
export type UsedContextTarget = "studio" | "the-edit";

/** Discriminator for documents in users/{uid}/memory (atoms vs embedding shadow). */
export type MemoryDocKind = 'memory_atom' | 'embedding_shadow';

/** Scribe signal types mapped into structured Memory Atoms. */
export type ScribeSignalType =
  | 'dialogue_paste'
  | 'conversation_log'
  | 'link_drop'
  | 'highlight_selection'
  | 'ask_answer'
  | 'selection_capture'
  | 'manual';

export interface MemoryAtom {
  id: string;
  projectId: string;
  content: string;
  title?: string;
  timestamp: number;
  source?: string;
  tags?: string[];
  /** Firestore doc kind ? memory atoms only (not embedding shadow docs). */
  kind?: MemoryDocKind;
  /** Normalized Scribe capture channel. */
  signalType?: ScribeSignalType;
  /** Structured metadata from Scribe parse (URLs, speakers, etc.). */
  metadata?: Record<string, unknown>;
  /** Optional link to usedContextService atomId (same as id when queued). */
  contextTarget?: UsedContextTarget;
}

export interface UsedContextEntry {
  atomId: string;
  title: string;
  content: string;
  source?: string;
  tags?: string[];
  projectId?: string;
  addedAt: number;
  approved: boolean;
  target: UsedContextTarget;
}

/** Frozen snapshot of used context at generation time (export / offline reveal). */
export interface UsedContextSnapshot {
  atomId: string;
  title: string;
  content: string;
  source?: string;
}

// ===============================================================
// Tailor / Taste Graph Pipeline
// ===============================================================

export type TailoringIntent =
  | 'creative_practice'
  | 'brand'
  | 'illustrations'
  | 'writing'
  | 'product'
  | 'wardrobe'
  | 'internet_presence'
  | 'campaign'
  | 'room'
  | 'world';

export type EvidenceSourceType =
  | 'image'
  | 'book'
  | 'artwork'
  | 'website'
  | 'screenshot'
  | 'note'
  | 'quote'
  | 'fashion'
  | 'object'
  | 'music'
  | 'film'
  | 'architecture'
  | 'product'
  | 'moodboard';

export type AnalysisStatus = 'pending' | 'processing' | 'analyzed' | 'failed';

export type ClaimType = 'observed' | 'inferred' | 'speculative' | 'user_confirmed' | 'user_rejected';

export type UserCurationStatus =
  | 'suggested'
  | 'accepted'
  | 'rejected'
  | 'renamed'
  | 'merged'
  | 'split'
  | 'hidden';

export type UserWeight = 'low' | 'medium' | 'high' | 'signature';

export type ObservationCategory =
  | 'visual'
  | 'language'
  | 'material'
  | 'emotional'
  | 'historical'
  | 'compositional'
  | 'symbolic'
  | 'typographic'
  | 'color'
  | 'texture'
  | 'motion'
  | 'fashion'
  | 'product';

export type FieldNoteType =
  | 'observation'
  | 'question'
  | 'correction'
  | 'experiment'
  | 'source'
  | 'reflection'
  | 'art_history'
  | 'project_note';

export type ReadConfidenceLabel = 'initial' | 'strong' | 'archive' | 'longitudinal';

export interface TailorProject {
  id: string;
  userId: string;
  title: string;
  intent: TailoringIntent;
  blurb?: string;
  tasteGraphId?: string;
  evidenceCount: number;
  readConfidence: ReadConfidenceLabel;
  analysisStatus: AnalysisStatus;
  createdAt: number;
  updatedAt: number;
}

export interface EvidenceNode {
  id: string;
  userId: string;
  projectId: string;
  sourceType: EvidenceSourceType;
  title: string;
  description?: string;
  sourceUrl?: string;
  uploadedFileUrl?: string;
  thumbnailUrl?: string;
  userCaption?: string;
  tags?: string[];
  extractedMetadata?: Record<string, unknown>;
  rightsMetadata?: Record<string, unknown>;
  analysisStatus: AnalysisStatus;
  embeddingRef?: string;
  createdAt: number;
  updatedAt: number;
}

export interface EvidenceSummary {
  evidenceNodeId: string;
  visualSummary: string;
  objects: string[];
  composition: string;
  materials: string[];
  typography: string;
  colorLogic: string;
  texture: string;
  historicalInfluences: string[];
  emotionalQualities: string[];
  creativeDecisions: string[];
  underlyingPrinciple: string;
  confidence: number;
}

export interface Observation {
  id: string;
  userId: string;
  projectId: string;
  evidenceNodeId: string;
  category: ObservationCategory;
  label: string;
  description: string;
  confidence: number;
  claimType: ClaimType;
  modelReasoningSummary?: string;
  userStatus: UserCurationStatus;
  createdAt: number;
}

export interface PatternCluster {
  id: string;
  userId: string;
  projectId: string;
  name: string;
  description: string;
  category: ObservationCategory;
  observationIds: string[];
  supportingEvidenceNodeIds: string[];
  frequency: number;
  confidence: number;
  possibleInterpretations: string[];
  claimType: ClaimType;
  userStatus: UserCurationStatus;
  userWeight: UserWeight;
  userAnnotation?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreativeLaw {
  id: string;
  userId: string;
  projectId: string;
  title: string;
  principle: string;
  explanation: string;
  supportingPatternClusterIds: string[];
  supportingEvidenceNodeIds: string[];
  confidence: number;
  claimType: ClaimType;
  userStatus: UserCurationStatus;
  applications: string[];
  avoidances?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TasteGraphDocument {
  id: string;
  userId: string;
  projectId?: string;
  evidenceNodeIds: string[];
  observationIds: string[];
  patternClusterIds: string[];
  creativeLawIds: string[];
  fieldNoteIds: string[];
  dollIds: string[];
  dossierIds: string[];
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface FieldNote {
  id: string;
  userId: string;
  projectId?: string;
  title: string;
  body: string;
  noteType: FieldNoteType;
  linkedEvidenceNodeIds: string[];
  linkedPatternClusterIds: string[];
  linkedCreativeLawIds: string[];
  linkedDollIds: string[];
  tags: string[];
  archived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DollMask {
  id: string;
  dollId: string;
  name: string;
  role:
    | 'illustrator'
    | 'curator'
    | 'archivist'
    | 'builder'
    | 'editor'
    | 'poet'
    | 'strategist'
    | 'performer'
    | 'brand_designer';
  behaviorDescription: string;
  outputPreferences?: string[];
  promptTemplate?: string;
  createdAt: number;
}

export interface Doll {
  id: string;
  userId: string;
  projectId?: string;
  tasteGraphId: string;
  name: string;
  description: string;
  visualLanguage: string[];
  palette: string[];
  materials: string[];
  silhouette: string;
  motifs: string[];
  eyeTreatment?: string;
  emotionalRegister: string;
  creativePhilosophy: string;
  creativeLawIds: string[];
  strengths: string[];
  blindSpots: string[];
  preferredMediums: string[];
  favoriteShapes: string[];
  favoriteContrasts: string[];
  signatureMotifs: string[];
  suggestedExperiments: string[];
  sourceEvidenceIds: string[];
  generatedImageUrl?: string;
  maskIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ArtworkMatch {
  id: string;
  userId: string;
  projectId?: string;
  artworkTitle: string;
  artist: string;
  date?: string;
  museum?: string;
  imageUrl?: string;
  sourceUrl: string;
  publicDomainStatus?: string;
  matchedThemes: string[];
  matchedVisualSignals: string[];
  differences: string[];
  educationalSummary: string;
  suggestedUserExperiment?: string;
  linkedPatternClusterIds: string[];
  linkedCreativeLawIds: string[];
  createdAt: number;
}

export interface MarketingAsset {
  id: string;
  userId: string;
  projectId?: string;
  sourceTasteGraphId: string;
  sourceDollId?: string;
  sourceMaskId?: string;
  assetType:
    | 'social_post'
    | 'poster'
    | 'landing_page_hero'
    | 'product_card'
    | 'zine_cover'
    | 'campaign_caption'
    | 'brand_statement'
    | 'press_blurb'
    | 'visual_prompt';
  title: string;
  bodyCopy: string;
  imagePrompt?: string;
  layoutGuidance?: string;
  palette?: string[];
  typographyGuidance?: string;
  evidenceLinks: string[];
  sourceNotes?: string;
  transformationNotes?: string;
  createdAt: number;
}

export interface GenerationJob {
  id: string;
  userId: string;
  projectId: string;
  jobType: 'analyze' | 'patterns' | 'laws' | 'dossier' | 'doll' | 'art_history' | 'asset';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  resultRef?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DossierSection {
  id: string;
  title: string;
  body: string;
  claimType: ClaimType;
  evidenceNodeIds: string[];
  observationIds: string[];
  patternClusterIds: string[];
  creativeLawIds: string[];
}

export interface CreativeDossier {
  id: string;
  userId: string;
  projectId: string;
  tasteGraphId: string;
  title: string;
  overview: string;
  sections: DossierSection[];
  evidenceLibraryIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TailorAnalysisOutput {
  evidenceSummaries: EvidenceSummary[];
  observations: Omit<Observation, 'id' | 'userId' | 'projectId' | 'createdAt' | 'userStatus'>[];
  patternClusters: Omit<PatternCluster, 'id' | 'userId' | 'projectId' | 'createdAt' | 'updatedAt' | 'userStatus' | 'userWeight'>[];
  creativeLaws: Omit<CreativeLaw, 'id' | 'userId' | 'projectId' | 'createdAt' | 'updatedAt' | 'userStatus'>[];
  suggestedDollSeeds: Array<{ name: string; description: string; motifs: string[] }>;
  artHistorySearchQueries: string[];
  userCurationPrompts: string[];
  warnings: string[];
}

export interface DollSeed {
  name: string;
  description: string;
  motifs: string[];
  palette?: string[];
  creativePhilosophy?: string;
}

// --- Evidence-Based Creative Dossier (single-call synthesis pipeline) ---

export interface DossierUnderlyingPrinciple {
  principle: string;
  confidence: number;
}

export interface DossierReferenceReading {
  id: string;
  visualSummary: string;
  objects: string[];
  composition: string[];
  colorSystem: { palette: string[]; logic: string };
  typography: string[];
  materials: string[];
  texture: string[];
  historicalTouchpoints: string[];
  emotionalTone: string[];
  interestingDecisions: string[];
  underlyingPrinciples: DossierUnderlyingPrinciple[];
}

export interface DossierRecurringSignal {
  signal: string;
  count: number;
  totalReferences: number;
  evidenceRefIds: string[];
  confidence: number;
}

export interface DossierOutlier {
  signal: string;
  refId: string;
  note: string;
}

export interface DossierPatternGraph {
  recurringSignals: DossierRecurringSignal[];
  outliers: DossierOutlier[];
}

export interface DossierDesignLaw {
  law: string;
  rationale: string;
  evidenceRefIds: string[];
  confidence: number;
}

export interface DossierCreativeOperatingSystem {
  containerName: string;
  oneSentencePhilosophy: string;
  designLaws: DossierDesignLaw[];
  visualGrammar: string[];
  materialVocabulary: string[];
  emotionalVocabulary: string[];
  colorLogic: string;
  compositionLogic: string;
  typographyLogic: string;
  symbolLogic: string;
  thingsToAvoid: string[];
}

export interface DossierApplications {
  illustration: string[];
  brand: string[];
  ui: string[];
  writing: string[];
  photography: string[];
  packaging: string[];
  fashion: string[];
  product: string[];
}

export interface DossierInversion {
  becauseYouTendTo: string;
  tryInstead: string;
  evidenceRefIds: string[];
}

export interface DossierNextExperiment {
  title: string;
  hypothesis: string;
  evidenceRefIds: string[];
}

export type PaperWarmth = 'cool' | 'neutral' | 'warm';

export interface LikenessManifest {
  accentHex: string;
  paperWarmth: PaperWarmth;
  voiceAdjectives: string[];
  motifCandidates: string[];
  antiMotifs: string[];
  containerName?: string;
  oneSentencePhilosophy?: string;
  savedAt?: number;
}

/** Public-safe doll token on profiles_public for mimi.you/u/:handle showcase. */
export interface PublicShowcaseSnapshot {
  handle: string;
  dollLabel: string;
  philosophy: string;
  accentHex: string;
  paperWarmth?: PaperWarmth;
  voiceAdjectives: string[];
  motifCandidates: string[];
  updatedAt: number;
}

export interface EvidenceBasedCreativeDossier {
  dossierTitle: string;
  userIntent: string;
  references: DossierReferenceReading[];
  patternGraph: DossierPatternGraph;
  creativeOperatingSystem: DossierCreativeOperatingSystem;
  applications: DossierApplications;
  inversions: DossierInversion[];
  nextExperiments: DossierNextExperiment[];
  likenessManifest: LikenessManifest;
  synthesizedAt?: number;
}

export type InteractionSurface =
  | "quiet_canvas"
  | "guided_form"
  | "command_bar"
  | "chat"
  | "voice";

export type InterpretationLevel =
  | "literal"
  | "organize"
  | "develop"
  | "interpret"
  | "speculate";

export type PerspectivePolicy =
  | "creator_only"
  | "creator_and_assistant"
  | "explicit_named_perspectives";

export type MemoryWritePolicy =
  | "none"
  | "artifact_only"
  | "propose_memory"
  | "approved_memory";

export interface InteractionPolicy {
  surface: InteractionSurface;
  interpretationLevel: InterpretationLevel;
  perspectivePolicy: PerspectivePolicy;
  memoryWritePolicy: MemoryWritePolicy;
}

export interface AuthorshipBoundary {
  id: string;
  creatorId: string;
  perspectivePolicy: PerspectivePolicy;
  permittedPerspectiveIds: string[];
  prohibitInferredThirdParties: boolean;
  prohibitSimulatedAudience: boolean;
  prohibitInterpersonalRetrieval: boolean;
  createdAt: string;
  schemaVersion: string;
}

export interface SealedContextPacket {
  id: string;
  projectId?: string;
  version: number;
  sources: Array<{
    sourceId: string;
    sourceType: string;
    reasonUsed: string;
  }>;
  memoryWritePolicy: MemoryWritePolicy;
  fingerprint: string;
  state: "draft" | "sealed" | "superseded";
  createdAt: string;
  sealedAt?: string;
  retrievalVersion: string;
}

export type QuietOperationType =
  | "direction_card"
  | "image_brief"
  | "decision_extract";

export interface QuietOperation {
  id: string;
  projectId?: string;
  type: QuietOperationType;
  inputRef: string;
  inputText?: string;
  contextPacketId?: string;
  interactionPolicy: InteractionPolicy;
  status:
    | "draft"
    | "processing"
    | "review"
    | "approved"
    | "discarded"
    | "failed";
  generatedArtifactId?: string;
  generatedContent?: string;
  createdAt: string;
  updatedAt: string;
}
