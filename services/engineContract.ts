export interface Capability {
  id: string;
  label: string;
  description: string;
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: "info" | "warning" | "error";
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface Explanation {
  summary: string;
  reasoning: string[];
  userFlowBenefit: string;
}

export interface Provenance {
  engineId: string;
  generatedAt: string;
  inputs: string[];
  evidence: string[];
  assumptions: string[];
}

export type EvidenceStatus = "observed" | "inferred" | "user-confirmed" | "user-rejected" | "speculative";

export interface SupportingEvidence {
  id: string;
  status: EvidenceStatus;
  source: string;
  excerpt: string;
  confidence: number;
}

export interface EvidenceBackedInference {
  claim: string;
  status: EvidenceStatus;
  supportingEvidence: SupportingEvidence[];
  userEditable: boolean;
}

export interface Feedback {
  rating?: "lands" | "misses";
  notes?: string;
  corrections?: string[];
  evidenceUpdates?: EvidenceBackedInference[];
}

export interface EngineState {
  engineId: string;
  revision: number;
  status: "stable" | "needs-review" | "deprecated";
  feedbackLog: Feedback[];
}

export interface Engine<I, O> {
  id: string;
  name: string;
  purpose: string;
  capabilities: Capability[];
  execute(input: I): Promise<O>;
  validate(input: I): ValidationResult;
  explain(output: O): Explanation;
  provenance(output: O): Provenance;
  evolve(feedback: Feedback): EngineState;
}

export const createEngineState = (engineId: string, feedback: Feedback): EngineState => ({
  engineId,
  revision: 1,
  status: feedback.rating === "misses" ? "needs-review" : "stable",
  feedbackLog: [feedback],
});
