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

export type ProjectArtifactMaturity = "draft" | "working" | "production";

export interface ProjectArtifact {
  id: string;
  name: string;
  content: string;
  mediaType?: string;
  sourcePath?: string;
  attachedAt?: string;
}

export interface ArtifactProfile {
  artifactType: string;
  probablePurpose: string;
  project: string;
  maturity: ProjectArtifactMaturity;
  confidenceScore: number;
  evidence: SupportingEvidence[];
}

export interface RecoveredInputs {
  confirmedInputs: string[];
  likelyInputs: string[];
  missingInputs: string[];
  externalKnowledgeUsed: string[];
  lowConfidenceNotes: string[];
  evidenceBackedInferences: EvidenceBackedInference[];
}

export interface RecoveredPrompt {
  label: string;
  prompt: string;
  confidence: number;
  evidence: string[];
}

export interface WorkflowStage {
  stage: string;
  input: string;
  prompt: string;
  reasoning: string;
  output: string;
  storedKnowledge: string[];
  nextPrompt?: string;
}

export interface PersistentKnowledge {
  knowledge: string;
  reasonItShouldPersist: string;
  suggestedStorageLocation: string;
  priority: "low" | "medium" | "high";
  futureRelevance: string;
  status: "observed" | "inferred" | "user-confirmed" | "user-rejected" | "speculative";
  supportingEvidence: SupportingEvidence[];
}

export interface NextPromptSet {
  engineering: string;
  implementation: string;
  uiRefinement: string;
  apiDevelopment: string;
  testing: string;
  documentation: string;
  launch: string;
  maintenance: string;
}

export interface PromptLineageNode {
  label: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  confidence: number;
  missingInformation: string[];
}

export interface PromptLineageTree {
  nodes: PromptLineageNode[];
}

export interface ProjectReconstructionReport {
  executiveSummary: string;
  recoveredInputs: RecoveredInputs;
  recoveredPromptSet: RecoveredPrompt[];
  workflowDiagram: WorkflowStage[];
  knowledgeThatShouldPersist: PersistentKnowledge[];
  promptLineageTree: PromptLineageTree;
  projectTimeline: string[];
  confidenceAnalysis: string;
  missingInformation: string[];
  recommendedNextPrompts: NextPromptSet;
}

export interface HtmlDashboard {
  html: string;
  metadata: {
    title: string;
    generatedAt: string;
    promptCount: number;
    workflowStageCount: number;
  };
}

export interface ProjectReconstructionContext {
  artifacts: ProjectArtifact[];
  artifactProfile?: ArtifactProfile;
  recoveredInputs?: RecoveredInputs;
  recoveredPrompts?: RecoveredPrompt[];
  workflow?: WorkflowStage[];
  persistentKnowledge?: PersistentKnowledge[];
  nextPrompts?: NextPromptSet;
  lineageTree?: PromptLineageTree;
  report?: ProjectReconstructionReport;
}

interface PromptEngineDefinition<O> {
  id: string;
  name: string;
  purpose: string;
  capabilities: Capability[];
  promptContract: string;
  execute: (input: ProjectReconstructionContext) => O;
  explain: (output: O) => Explanation;
  provenance: (output: O) => Provenance;
}

const artifactCapabilities: Capability[] = [
  {
    id: "evidence-inspection",
    label: "Evidence Inspection",
    description: "Treats generated artifacts as evidence instead of summaries.",
  },
  {
    id: "prompt-lineage",
    label: "Prompt Lineage",
    description: "Recovers the likely prompt chain behind project artifacts.",
  },
  {
    id: "project-memory",
    label: "Project Memory",
    description: "Identifies knowledge that should persist across future work.",
  },
  {
    id: "mimizine-evidence-governance",
    label: "Mimi Evidence Governance",
    description: "Keeps observed, inferred, confirmed, rejected, and speculative claims separate.",
  },
];

const assertArtifacts = (input: ProjectReconstructionContext): ValidationResult => ({
  valid: input.artifacts.length > 0 && input.artifacts.every((artifact) => artifact.content.trim().length > 0),
  issues: [
    ...(input.artifacts.length === 0
      ? [{ field: "artifacts", message: "At least one project artifact is required.", severity: "error" as const }]
      : []),
    ...input.artifacts
      .filter((artifact) => artifact.content.trim().length === 0)
      .map((artifact) => ({
        field: `artifacts.${artifact.id}.content`,
        message: "Artifact content is empty.",
        severity: "error" as const,
      })),
  ],
});

const evidenceNames = (input: ProjectReconstructionContext): string[] =>
  input.artifacts.map((artifact) => artifact.sourcePath || artifact.name);

const artifactEvidence = (artifact: ProjectArtifact, status: SupportingEvidence["status"] = "observed"): SupportingEvidence => ({
  id: artifact.id,
  status,
  source: artifact.sourcePath || artifact.name,
  excerpt: artifact.content.slice(0, 240),
  confidence: status === "observed" ? 1 : 0.66,
});

const allArtifactEvidence = (input: ProjectReconstructionContext): SupportingEvidence[] =>
  input.artifacts.map((artifact) => artifactEvidence(artifact));

const inferMaturity = (content: string): ProjectArtifactMaturity => {
  const lower = content.toLowerCase();
  if (lower.includes("production") || lower.includes("launch") || lower.includes("deploy")) return "production";
  if (lower.includes("todo") || lower.includes("draft") || lower.includes("placeholder")) return "draft";
  return "working";
};

const inferArtifactType = (artifact: ProjectArtifact): string => {
  const lowerName = artifact.name.toLowerCase();
  const lowerContent = artifact.content.toLowerCase();
  if (lowerName.endsWith(".html") || lowerContent.includes("<html")) return "technical HTML report";
  if (lowerName.endsWith(".tsx") || lowerName.endsWith(".ts")) return "TypeScript service or component";
  if (lowerContent.includes("interface ") || lowerContent.includes("export const")) return "source code artifact";
  if (lowerContent.includes("executive summary") || lowerContent.includes("recommended next prompts")) return "reconstruction report";
  return "project artifact";
};

const inferProjectName = (input: ProjectReconstructionContext): string => {
  const joined = input.artifacts.map((artifact) => `${artifact.name}\n${artifact.content}`).join("\n").toLowerCase();
  if (joined.includes("mimi")) return "Mimi";
  if (joined.includes("project")) return "Unspecified project system";
  return "Unknown project";
};

const buildPrompt = (label: string, body: string, confidence = 0.74, evidence: string[] = []): RecoveredPrompt => ({
  label,
  prompt: body.trim(),
  confidence,
  evidence,
});

const promptBodies = {
  artifactIntake: `
You are receiving one or more project artifacts.
Treat every attached file as the OUTPUT of one or more AI generations.
Do not summarize the files.
Inspect them as evidence and identify the artifact type, probable purpose, project, maturity, and confidence score.
Do not infer prompts yet.
`,
  recoverInputs: `
Reverse engineer the inputs that most likely existed before this artifact.
Recover user goals, project requirements, research, references, previous documents, screenshots, APIs, data, business objectives, constraints, and design inspiration.
Separate confirmed evidence from inferred evidence.
`,
  recoverPrompts: `
Treat this artifact as the output of one or more AI prompts.
Reconstruct every prompt that likely existed.
If multiple prompting stages occurred, recover each separately and label every prompt by stage.
`,
  recoverWorkflow: `
Determine how the recovered prompts connected together.
Describe the workflow as a pipeline with Input, Prompt, Reasoning, Output, Stored Knowledge, and Next Prompt.
Summarize the prompting workflow rather than summarizing the artifact.
`,
  persistKnowledge: `
Identify all information that should become persistent project knowledge, including architecture, product decisions, API decisions, component patterns, UX conventions, brand rules, engineering constraints, state machines, and business rules.
Mimi-specific rules must persist: every inference links to supporting evidence; Observed, Inferred, User-Confirmed, User-Rejected, and Speculative are separate states; the user is the final editor; dolls are projections, never source of truth; art history is thematic comparison, never identity or diagnostic claim; transformation matters more than imitation.
`,
  nextPrompts: `
Based on the recovered workflow, generate the prompts that naturally come next for engineering, implementation, UI refinement, API development, testing, documentation, launch, and maintenance.
`,
  lineageTree: `
Produce a complete Prompt Lineage Tree from Inputs through Final Artifact.
For every node include purpose, inputs, outputs, dependencies, confidence, and missing information.
`,
  report: `
Using every recovered prompt, reconstruct the entire development history.
Produce an executive summary, recovered inputs, recovered prompt set, workflow diagram, persistent knowledge, prompt lineage tree, project timeline, confidence analysis, missing information, and recommended next prompts.
`,
  htmlReport: `
Create a premium standalone HTML report visualizing the recovered prompt system with a responsive dashboard, fixed sidebar, artifact metadata, prompt cards, workflow timeline, lineage tree, expandable prompts, monospace blocks, copy buttons, and no placeholder content.
`,
};

const makeEngine = <O>(definition: PromptEngineDefinition<O>): Engine<ProjectReconstructionContext, O> => ({
  id: definition.id,
  name: definition.name,
  purpose: definition.purpose,
  capabilities: definition.capabilities,
  async execute(input) {
    const validation = assertArtifacts(input);
    if (!validation.valid) {
      throw new Error(validation.issues.map((issue) => issue.message).join(" "));
    }
    return definition.execute(input);
  },
  validate: assertArtifacts,
  explain: definition.explain,
  provenance: definition.provenance,
  evolve(feedback: Feedback): EngineState {
    return createEngineState(definition.id, feedback);
  },
});

export const artifactIntakeEngine = makeEngine<ArtifactProfile>({
  id: "artifact-intake",
  name: "Artifact Intake",
  purpose: "Identify the artifact and its development stage before deeper prompt recovery.",
  capabilities: artifactCapabilities,
  promptContract: promptBodies.artifactIntake,
  execute(input) {
    const content = input.artifacts.map((artifact) => artifact.content).join("\n");
    const primaryArtifact = input.artifacts[0];
    return {
      artifactType: inferArtifactType(primaryArtifact),
      probablePurpose: input.artifacts.length > 1 ? "Multi-artifact project workflow evidence" : "Single artifact project evidence",
      project: inferProjectName(input),
      maturity: inferMaturity(content),
      confidenceScore: content.length > 800 ? 0.82 : 0.64,
      evidence: allArtifactEvidence(input),
    };
  },
  explain: (output) => ({
    summary: `Identified ${output.artifactType} for ${output.project}.`,
    reasoning: ["Classified by file name, content markers, and maturity language.", "Stopped before prompt inference."],
    userFlowBenefit: "As a user, I can drop files in and first learn what kind of project evidence Mimi thinks it has before asking it to reconstruct the workflow.",
  }),
  provenance: () => ({
    engineId: "artifact-intake",
    generatedAt: new Date().toISOString(),
    inputs: ["artifact names", "artifact content", "media types"],
    evidence: ["file extensions", "source markers", "maturity terms"],
    assumptions: ["Artifact content was generated or shaped by previous AI work."],
  }),
});

export const recoverInputsEngine = makeEngine<RecoveredInputs>({
  id: "recover-inputs",
  name: "Recover Inputs",
  purpose: "Recover the probable goals, references, constraints, and source material behind the artifact.",
  capabilities: artifactCapabilities,
  promptContract: promptBodies.recoverInputs,
  execute(input) {
    const profile = input.artifactProfile;
    return {
      confirmedInputs: [
        ...evidenceNames(input),
        profile ? `Artifact profile: ${profile.artifactType}, ${profile.maturity}` : "Raw artifact content",
      ],
      likelyInputs: [
        "User goal to reconstruct prompt and project lineage from generated outputs.",
        "Project requirement for an engine-based service contract.",
        "Need for evidence/inference separation and persistent project memory.",
      ],
      missingInputs: ["Original conversation transcript", "Original model/provider settings", "Screenshots or attachments not present in this context"],
      externalKnowledgeUsed: ["General software pipeline conventions", "Prompt engineering workflow labels supplied by the user"],
      lowConfidenceNotes: profile ? [] : ["No Artifact Profile was provided before input recovery."],
      evidenceBackedInferences: [
        {
          claim: "The user wants a shared Engine<I, O> contract for project reconstruction services.",
          status: "user-confirmed",
          supportingEvidence: allArtifactEvidence(input),
          userEditable: true,
        },
        {
          claim: "Recovered prompt systems should support transformation into Mimi outputs without classifying the user.",
          status: "inferred",
          supportingEvidence: allArtifactEvidence(input),
          userEditable: true,
        },
      ],
    };
  },
  explain: () => ({
    summary: "Separated direct artifact evidence from likely upstream inputs.",
    reasoning: ["Confirmed inputs come from artifact metadata.", "Likely inputs come from prompt and workflow requirements."],
    userFlowBenefit: "As a user, I can see which assumptions Mimi is making before those assumptions become architecture or implementation work.",
  }),
  provenance: () => ({
    engineId: "recover-inputs",
    generatedAt: new Date().toISOString(),
    inputs: ["artifact profile", "artifact evidence"],
    evidence: ["source paths", "artifact text", "requested workflow"],
    assumptions: ["Some source goals and references are inferred because original prompts are absent."],
  }),
});

export const recoverPromptsEngine = makeEngine<RecoveredPrompt[]>({
  id: "recover-prompts",
  name: "Recover Original Prompts",
  purpose: "Reconstruct the likely prompts that produced the artifact set.",
  capabilities: artifactCapabilities,
  promptContract: promptBodies.recoverPrompts,
  execute(input) {
    const evidence = evidenceNames(input);
    return [
      buildPrompt("Planning Prompt", promptBodies.artifactIntake, 0.88, evidence),
      buildPrompt("Research Prompt", promptBodies.recoverInputs, 0.82, evidence),
      buildPrompt("Architecture Prompt", promptBodies.recoverWorkflow, 0.78, evidence),
      buildPrompt("Documentation Prompt", promptBodies.report, 0.76, evidence),
      buildPrompt("UI Prompt", promptBodies.htmlReport, 0.72, evidence),
    ];
  },
  explain: (output) => ({
    summary: `Recovered ${output.length} likely prompt stages.`,
    reasoning: ["Mapped artifact requirements to common AI generation stages.", "Used confidence scores to prevent inferred prompts from pretending to be verbatim."],
    userFlowBenefit: "As a user, I can reuse the recovered prompts as a reproducible build path instead of treating the artifact as a one-off result.",
  }),
  provenance: () => ({
    engineId: "recover-prompts",
    generatedAt: new Date().toISOString(),
    inputs: ["recovered inputs", "artifact profile", "artifact content"],
    evidence: ["explicit prompt-stage labels", "artifact output requirements"],
    assumptions: ["Recovered prompts are highest-confidence equivalents unless original prompt text is available."],
  }),
});

export const recoverWorkflowEngine = makeEngine<WorkflowStage[]>({
  id: "recover-workflow",
  name: "Recover Workflow",
  purpose: "Connect recovered prompts into a pipeline with inputs, reasoning, outputs, stored knowledge, and handoffs.",
  capabilities: artifactCapabilities,
  promptContract: promptBodies.recoverWorkflow,
  execute(input) {
    const prompts = input.recoveredPrompts || [];
    return (Array.isArray(prompts) ? prompts : []).map((prompt, index, all) => ({
      stage: prompt.label,
      input: index === 0 ? "Project artifacts" : all[index - 1].label,
      prompt: prompt.prompt,
      reasoning: "Each stage extracts a more durable layer of project understanding before handing it to the next stage.",
      output: `${prompt.label} output`,
      storedKnowledge: ["artifact evidence", "confidence level", "missing information"],
      nextPrompt: all[index + 1]?.label,
    }));
  },
  explain: (output) => ({
    summary: `Built a ${output.length}-stage prompt workflow.`,
    reasoning: ["Linked each recovered prompt to the next natural project step.", "Tracked what knowledge should survive the stage transition."],
    userFlowBenefit: "As a user, I can inspect the chain of work and decide where the next engineer or AI agent should resume.",
  }),
  provenance: () => ({
    engineId: "recover-workflow",
    generatedAt: new Date().toISOString(),
    inputs: ["recovered prompts"],
    evidence: ["prompt labels", "pipeline ordering"],
    assumptions: ["Workflow order follows the supplied reconstruction sequence."],
  }),
});

export const recoverPersistentKnowledgeEngine = makeEngine<PersistentKnowledge[]>({
  id: "recover-persistent-knowledge",
  name: "Recover Persistent Knowledge",
  purpose: "Identify decisions and constraints that should become reusable project memory.",
  capabilities: artifactCapabilities,
  promptContract: promptBodies.persistKnowledge,
  execute(input) {
    return [
      {
        knowledge: "Every project reconstruction stage should conform to Engine<I, O>.",
        reasonItShouldPersist: "Shared execution, validation, explanation, provenance, and evolution hooks make the pipeline composable.",
        suggestedStorageLocation: "services/engineContract.ts",
        priority: "high",
        futureRelevance: "All future engines can be added without creating bespoke orchestration code.",
        status: "user-confirmed",
        supportingEvidence: allArtifactEvidence(input),
      },
      {
        knowledge: "Evidence and inference must be separated during artifact recovery.",
        reasonItShouldPersist: "Prevents uncertain reverse engineering from hardening into false project history.",
        suggestedStorageLocation: "services/projectReconstructionEngines.ts",
        priority: "high",
        futureRelevance: "Keeps future reports honest when original prompts or screenshots are missing.",
        status: "user-confirmed",
        supportingEvidence: allArtifactEvidence(input),
      },
      {
        knowledge: "Recovered outputs should feed a production HTML dashboard only after lineage and confidence analysis exist.",
        reasonItShouldPersist: "The dashboard should visualize verified workflow data, not decorative placeholder content.",
        suggestedStorageLocation: "Project reconstruction report payload",
        priority: "medium",
        futureRelevance: "Supports shareable engineering handoffs and audits.",
        status: "inferred",
        supportingEvidence: allArtifactEvidence(input),
      },
      {
        knowledge: "Mimi does not classify users; it reveals evidence, clusters patterns, and lets the user curate.",
        reasonItShouldPersist: "This is the product promise that governs every interpretation and output.",
        suggestedStorageLocation: "services/projectReconstructionEngines.ts",
        priority: "high",
        futureRelevance: "Prevents identity claims, diagnostic readings, or model-authored final judgments.",
        status: "user-confirmed",
        supportingEvidence: allArtifactEvidence(input),
      },
      {
        knowledge: "Taste Graph is the source of truth; dolls, brand kits, art style, and zines are projections.",
        reasonItShouldPersist: "Downstream creative outputs must never overwrite the evidence base.",
        suggestedStorageLocation: "Taste Graph service and projection services",
        priority: "high",
        futureRelevance: "Keeps mimi.u and creative projections reversible, editable, and evidence-linked.",
        status: "user-confirmed",
        supportingEvidence: allArtifactEvidence(input),
      },
      {
        knowledge: "Every inference must be tagged as Observed, Inferred, User-Confirmed, User-Rejected, or Speculative.",
        reasonItShouldPersist: "The user remains the final editor and can accept, revise, or reject model reasoning.",
        suggestedStorageLocation: "services/engineContract.ts",
        priority: "high",
        futureRelevance: "Supports transparent dossiers, field notes, and creative-literacy review states.",
        status: "user-confirmed",
        supportingEvidence: allArtifactEvidence(input),
      },
      {
        knowledge: "Art history can provide thematic comparison, but it must never become an identity, class, taste-rank, or diagnostic claim about the user.",
        reasonItShouldPersist: "Creative literacy should expand the user's references without reducing them to a category.",
        suggestedStorageLocation: "analysis and dossier generation services",
        priority: "high",
        futureRelevance: "Keeps Mimi's language educational, non-diagnostic, and non-classifying.",
        status: "user-confirmed",
        supportingEvidence: allArtifactEvidence(input),
      },
      {
        knowledge: "Optimize for transformation, not imitation.",
        reasonItShouldPersist: "Mimi should help users turn evidence into something only they could make, not copy an aesthetic source.",
        suggestedStorageLocation: "projection and generation prompts",
        priority: "high",
        futureRelevance: "Guides zines, art styles, brand kits, and dolls toward original synthesis.",
        status: "user-confirmed",
        supportingEvidence: allArtifactEvidence(input),
      },
    ];
  },
  explain: () => ({
    summary: "Captured the project rules that should persist beyond one report.",
    reasoning: ["Prioritized architecture contract and evidence handling.", "Mapped each knowledge item to a storage location."],
    userFlowBenefit: "As a user, I get reusable project memory instead of having to re-explain the same workflow rules in every new session.",
  }),
  provenance: () => ({
    engineId: "recover-persistent-knowledge",
    generatedAt: new Date().toISOString(),
    inputs: ["workflow", "recovered prompts", "artifact profile"],
    evidence: ["engine contract request", "prompt lineage requirements"],
    assumptions: ["Service-layer code is the correct place for reusable engine contracts."],
  }),
});

export const generateNextPromptsEngine = makeEngine<NextPromptSet>({
  id: "generate-next-prompts",
  name: "Generate Next Prompts",
  purpose: "Generate production-quality prompts for the work that naturally follows the recovered workflow.",
  capabilities: artifactCapabilities,
  promptContract: promptBodies.nextPrompts,
  execute() {
    return {
      engineering: "Implement the recovered project architecture using the existing service patterns. Preserve the shared Engine<I, O> contract and add typed orchestration for each stage.",
      implementation: "Build the missing pipeline adapters that pass ArtifactProfile, RecoveredInputs, RecoveredPrompt, WorkflowStage, PersistentKnowledge, PromptLineageTree, and report data between engines while preserving Observed, Inferred, User-Confirmed, User-Rejected, and Speculative states.",
      uiRefinement: "Create a dense project-analysis dashboard that makes evidence, inference, confidence, user confirmations, user rejections, and next actions scannable without hiding the prompt lineage.",
      apiDevelopment: "Expose a project reconstruction endpoint that accepts artifacts, runs the engine pipeline, and returns typed report and HTML dashboard payloads.",
      testing: "Add unit tests for validation failures, evidence-linked inferences, provenance generation, prompt lineage ordering, projection/source-of-truth boundaries, and no-placeholder HTML output.",
      documentation: "Document the engine contract, each stage's input/output shape, and the user flow from artifact drop to reproducible build report. Include Mimi rules: Taste Graph is source of truth, dolls are projections, art history is thematic comparison, and the user is final editor.",
      launch: "Prepare a release checklist covering data privacy, artifact size limits, error states, and export formats.",
      maintenance: "Review engine feedback logs and promote stable recovered decisions into persistent project memory.",
    };
  },
  explain: () => ({
    summary: "Generated follow-on prompts for implementation, testing, launch, and maintenance.",
    reasoning: ["Assumed earlier recovery stages have already completed.", "Wrote prompts as handoffs to coding agents and engineering tools."],
    userFlowBenefit: "As a user, I can turn a recovered project history into the next set of Codex-ready tasks without starting from a blank brief.",
  }),
  provenance: () => ({
    engineId: "generate-next-prompts",
    generatedAt: new Date().toISOString(),
    inputs: ["recovered workflow", "persistent knowledge"],
    evidence: ["required next prompt categories"],
    assumptions: ["Next prompts should be production-oriented and tool-agnostic."],
  }),
});

export const promptLineageTreeEngine = makeEngine<PromptLineageTree>({
  id: "prompt-lineage-tree",
  name: "Prompt Lineage Tree",
  purpose: "Represent the full project as a readable dependency tree from inputs to final artifact.",
  capabilities: artifactCapabilities,
  promptContract: promptBodies.lineageTree,
  execute(input) {
    const labels = ["Inputs", "Planning", "Research", "Architecture", "PRD", "Database", "API", "React", "UI", "Engineering", "QA", "Launch", "Documentation", "Final Artifact"];
    return {
      nodes: labels.map((label, index) => ({
        label,
        purpose: index === 0 ? "Collect source evidence." : `Advance the project through ${label.toLowerCase()} work.`,
        inputs: index === 0 ? evidenceNames(input) : [labels[index - 1]],
        outputs: index === labels.length - 1 ? ["Reproducible project artifact"] : [labels[index + 1]],
        dependencies: index === 0 ? [] : [labels[index - 1]],
        confidence: index < 4 ? 0.82 : 0.68,
        missingInformation: index < 4 ? [] : ["Original prompt text may be unavailable."],
      })),
    };
  },
  explain: (output) => ({
    summary: `Created a lineage tree with ${output.nodes.length} nodes.`,
    reasoning: ["Used the required lineage sequence.", "Attached dependencies and missing information to every node."],
    userFlowBenefit: "As a user, I can see what came before and after each artifact stage, so rebuilding the project feels like following a map instead of guessing.",
  }),
  provenance: () => ({
    engineId: "prompt-lineage-tree",
    generatedAt: new Date().toISOString(),
    inputs: ["recovered workflow", "required lineage sequence"],
    evidence: ["pipeline labels", "dependency order"],
    assumptions: ["Later engineering nodes have lower confidence until source-specific artifacts are attached."],
  }),
});

export const projectReconstructionReportEngine = makeEngine<ProjectReconstructionReport>({
  id: "project-reconstruction-report",
  name: "Project Reconstruction Report",
  purpose: "Assemble the recovered prompt system into a reproducible engineering report.",
  capabilities: artifactCapabilities,
  promptContract: promptBodies.report,
  execute(input) {
    const recoveredInputs = input.recoveredInputs || {
      confirmedInputs: evidenceNames(input),
      likelyInputs: [],
      missingInputs: [],
      externalKnowledgeUsed: [],
      lowConfidenceNotes: [],
      evidenceBackedInferences: [],
    };
    const recoveredPromptSet = input.recoveredPrompts || [];
    const workflowDiagram = input.workflow || [];
    const knowledgeThatShouldPersist = input.persistentKnowledge || [];
    const promptLineageTree = input.lineageTree || { nodes: [] };
    const recommendedNextPrompts = input.nextPrompts || {
      engineering: "",
      implementation: "",
      uiRefinement: "",
      apiDevelopment: "",
      testing: "",
      documentation: "",
      launch: "",
      maintenance: "",
    };
    return {
      executiveSummary: "The artifacts describe a recoverable Mimi project workflow: evidence is observed first, inferences stay reviewable, the Taste Graph remains the source of truth, and projections become creative outputs rather than identity claims.",
      recoveredInputs,
      recoveredPromptSet,
      workflowDiagram,
      knowledgeThatShouldPersist,
      promptLineageTree,
      projectTimeline: workflowDiagram.map((stage, index) => `${index + 1}. ${stage.stage}`),
      confidenceAnalysis: "Confidence is strongest for explicitly supplied stages and lower where original prompt text, screenshots, or model settings are missing.",
      missingInformation: recoveredInputs.missingInputs,
      recommendedNextPrompts,
    };
  },
  explain: () => ({
    summary: "Assembled the full reconstruction report.",
    reasoning: ["Composed outputs from earlier engines.", "Preserved missing information and confidence notes."],
    userFlowBenefit: "As a user, I can hand another engineer one report that explains how to reproduce the project from artifact evidence.",
  }),
  provenance: () => ({
    engineId: "project-reconstruction-report",
    generatedAt: new Date().toISOString(),
    inputs: ["all prior engine outputs"],
    evidence: ["recovered inputs", "prompts", "workflow", "lineage tree"],
    assumptions: ["The report is only as complete as the attached artifacts and prior stage outputs."],
  }),
});

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const technicalHtmlReportEngine = makeEngine<HtmlDashboard>({
  id: "technical-html-report",
  name: "Technical HTML Report",
  purpose: "Render the recovered prompt system as a standalone engineering dashboard.",
  capabilities: artifactCapabilities,
  promptContract: promptBodies.htmlReport,
  execute(input) {
    const report = input.report;
    if (!report) {
      throw new Error("A ProjectReconstructionReport is required before rendering the HTML dashboard.");
    }
    const promptCards = report.recoveredPromptSet
      .map((prompt) => `
        <article class="card prompt-card">
          <div class="card-kicker">${escapeHtml(prompt.label)} · ${(prompt.confidence * 100).toFixed(0)}%</div>
          <details>
            <summary>Recovered prompt</summary>
            <pre><code>${escapeHtml(prompt.prompt)}</code></pre>
          </details>
          <button data-copy="${escapeHtml(prompt.prompt)}">Copy</button>
        </article>
      `)
      .join("");
    const timeline = report.workflowDiagram
      .map((stage) => `<li><strong>${escapeHtml(stage.stage)}</strong><span>${escapeHtml(stage.output)}</span></li>`)
      .join("");
    const lineage = report.promptLineageTree.nodes
      .map((node) => `<li><strong>${escapeHtml(node.label)}</strong><small>${escapeHtml(node.purpose)} · ${(node.confidence * 100).toFixed(0)}%</small></li>`)
      .join("");
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Project Reconstruction Report</title>
  <style>
    :root { color-scheme: dark; --bg:#101214; --panel:#181b1f; --ink:#f3f1ea; --muted:#9ca3af; --line:#30343a; --accent:#9dd1c8; --gold:#d7bd7a; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: var(--bg); color: var(--ink); }
    .shell { display: grid; grid-template-columns: 280px 1fr; min-height: 100vh; }
    nav { position: sticky; top: 0; height: 100vh; padding: 28px; border-right: 1px solid var(--line); background: #0c0e10; }
    nav a { display: block; color: var(--muted); text-decoration: none; margin: 14px 0; font-size: 13px; }
    main { padding: 32px; }
    header { border-bottom: 1px solid var(--line); padding-bottom: 24px; margin-bottom: 24px; }
    h1 { margin: 0 0 8px; font-size: clamp(32px, 5vw, 64px); letter-spacing: 0; }
    h2 { margin-top: 36px; font-size: 22px; }
    .meta { color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
    .card { border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 18px; transition: border-color .18s ease, transform .18s ease; }
    .card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .card-kicker { color: var(--gold); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; text-transform: uppercase; margin-bottom: 12px; }
    details summary { cursor: pointer; color: var(--accent); }
    pre { overflow: auto; background: #090a0b; border: 1px solid var(--line); border-radius: 6px; padding: 14px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; }
    button { margin-top: 12px; border: 1px solid var(--line); background: #0f1114; color: var(--ink); border-radius: 6px; padding: 9px 12px; cursor: pointer; }
    ol, ul { padding-left: 20px; }
    li { margin: 10px 0; }
    li span, li small { display: block; color: var(--muted); margin-top: 4px; }
    @media (max-width: 820px) { .shell { grid-template-columns: 1fr; } nav { position: relative; height: auto; border-right: 0; border-bottom: 1px solid var(--line); } main { padding: 20px; } }
  </style>
</head>
<body>
  <div class="shell">
    <nav>
      <strong>Prompt System</strong>
      <a href="#summary">Summary</a>
      <a href="#prompts">Prompt Cards</a>
      <a href="#workflow">Workflow Timeline</a>
      <a href="#lineage">Lineage Tree</a>
    </nav>
    <main>
      <header id="summary">
        <h1>Project Reconstruction Report</h1>
        <div class="meta">Generated ${escapeHtml(new Date().toISOString())} · ${report.recoveredPromptSet.length} prompts · ${report.workflowDiagram.length} workflow stages</div>
        <p>${escapeHtml(report.executiveSummary)}</p>
      </header>
      <section id="prompts"><h2>Prompt Cards</h2><div class="grid">${promptCards}</div></section>
      <section id="workflow"><h2>Workflow Timeline</h2><ol>${timeline}</ol></section>
      <section id="lineage"><h2>Prompt Lineage Tree</h2><ul>${lineage}</ul></section>
    </main>
  </div>
  <script>
    document.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        await navigator.clipboard.writeText(button.getAttribute("data-copy") || "");
        button.textContent = "Copied";
        setTimeout(() => { button.textContent = "Copy"; }, 1200);
      });
    });
  </script>
</body>
</html>`;
    return {
      html,
      metadata: {
        title: "Project Reconstruction Report",
        generatedAt: new Date().toISOString(),
        promptCount: report.recoveredPromptSet.length,
        workflowStageCount: report.workflowDiagram.length,
      },
    };
  },
  explain: () => ({
    summary: "Rendered a standalone technical HTML dashboard.",
    reasoning: ["Uses report data only.", "Includes fixed navigation, prompt cards, timeline, lineage tree, copy controls, and responsive CSS."],
    userFlowBenefit: "As a user, I can review the recovered project system visually and share it as a self-contained engineering artifact.",
  }),
  provenance: () => ({
    engineId: "technical-html-report",
    generatedAt: new Date().toISOString(),
    inputs: ["project reconstruction report"],
    evidence: ["report prompts", "workflow stages", "lineage nodes"],
    assumptions: ["The dashboard should remain standalone and avoid placeholder sections."],
  }),
});

export const projectReconstructionEngines = [
  artifactIntakeEngine,
  recoverInputsEngine,
  recoverPromptsEngine,
  recoverWorkflowEngine,
  recoverPersistentKnowledgeEngine,
  generateNextPromptsEngine,
  promptLineageTreeEngine,
  projectReconstructionReportEngine,
  technicalHtmlReportEngine,
] as const;

export const runProjectReconstructionPipeline = async (
  artifacts: ProjectArtifact[],
): Promise<ProjectReconstructionContext & { dashboard: HtmlDashboard }> => {
  const context: ProjectReconstructionContext = { artifacts };
  context.artifactProfile = await artifactIntakeEngine.execute(context);
  context.recoveredInputs = await recoverInputsEngine.execute(context);
  context.recoveredPrompts = await recoverPromptsEngine.execute(context);
  context.workflow = await recoverWorkflowEngine.execute(context);
  context.persistentKnowledge = await recoverPersistentKnowledgeEngine.execute(context);
  context.nextPrompts = await generateNextPromptsEngine.execute(context);
  context.lineageTree = await promptLineageTreeEngine.execute(context);
  context.report = await projectReconstructionReportEngine.execute(context);
  const dashboard = await technicalHtmlReportEngine.execute(context);
  return { ...context, dashboard };
};
