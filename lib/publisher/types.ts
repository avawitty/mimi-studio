/** Deterministic release-readiness — not AI-derived. */
export type ReadinessStatus =
  | "ready"
  | "needs-review"
  | "blocked"
  | "not-configured";

export type ReleaseStageId =
  | "proof"
  | "metadata"
  | "rights"
  | "context"
  | "destinations"
  | "publish";

export type DestinationId =
  | "web-issue"
  | "archival-pdf"
  | "asset-package"
  | "shopify-draft"
  | "newsletter"
  | "social-plates";

export type MetricProvenance =
  | "live"
  | "derived"
  | "estimated"
  | "sample"
  | "awaiting-connection";

export interface ReleaseCheck {
  id: string;
  label: string;
  status: ReadinessStatus;
  summary: string;
  evidence?: string[];
  actionLabel?: string;
  actionPath?: string;
}

export interface ReleaseDestination {
  id: DestinationId;
  label: string;
  status: ReadinessStatus;
  description: string;
  previewAvailable: boolean;
  publishAvailable: boolean;
  blockingCheckIds: string[];
  detailLines?: string[];
}

export interface ReleaseStage {
  id: ReleaseStageId;
  label: string;
  status: ReadinessStatus;
  summary: string;
  unresolvedCount: number;
  checks: ReleaseCheck[];
  actionLabel?: string;
  actionPath?: string;
}

export interface ApprovalItem {
  id: string;
  artifactId: string;
  artifactTitle: string;
  label: string;
  fieldRef?: string;
  status: "pending" | "approved" | "dismissed";
  summary: string;
  timestamp?: number;
  actionLabel: string;
  actionPath?: string;
  /** When no persistence exists for this approval type. */
  persistenceNote?: string;
}

export interface ReleaseRecommendation {
  headline: string;
  rationale: string[];
  evidence: string[];
  primaryActionLabel: string;
  primaryActionPath?: string;
}

export interface ReleaseHistoryEntry {
  id: string;
  artifactId: string;
  artifactVersion: number;
  timestamp: number;
  kind:
    | "exported"
    | "published"
    | "draft-created"
    | "made-public"
    | "unpublished"
    | "failed"
    | "superseded"
    | "revision";
  destination?: string;
  result: string;
  publicUrl?: string;
  externalId?: string;
  filesProduced?: string[];
  warnings?: string[];
  /** Derived only — not a durable audit log until server persistence ships. */
  source: "artifact" | "revision";
}

export interface ArtifactReleaseReadiness {
  artifactId: string;
  title: string;
  artifactType: string;
  version: number;
  overallStatus: ReadinessStatus;
  overallSummary: string;
  unresolvedCount: number;
  stages: ReleaseStage[];
  destinations: ReleaseDestination[];
  checks: ReleaseCheck[];
  approvals: ApprovalItem[];
  recommendation: ReleaseRecommendation;
  history: ReleaseHistoryEntry[];
  historyNote?: string;
}
