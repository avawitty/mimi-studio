export type MemoryProposalStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "superseded";

export interface SourceRecord {
  id: string;
  ownerId: string;
  projectId: string | null;
  sourceType: "text" | "image" | "url" | "file" | "conversation" | "imported";
  storageReference: Record<string, unknown>;
  contentHash: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface MemoryProposal {
  id: string;
  ownerId: string;
  projectId: string | null;
  sourceId: string | null;
  aiRunId: string;
  proposalType: string;
  content: Record<string, unknown>;
  status: MemoryProposalStatus;
  createdAt: Date;
  reviewedAt: Date | null;
}

export interface MemoryAtom {
  id: string;
  ownerId: string;
  projectId: string | null;
  proposalId: string | null;
  atomType: string;
  content: Record<string, unknown>;
  confidence: number | null;
  status: "active" | "archived" | "superseded";
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSourceInput {
  id: string;
  ownerId: string;
  projectId?: string | null;
  sourceType: SourceRecord["sourceType"];
  storageReference: Record<string, unknown>;
  contentHash: string;
  metadata?: Record<string, unknown>;
}

export interface CreateMemoryProposalInput {
  id: string;
  ownerId: string;
  projectId?: string | null;
  sourceId?: string | null;
  aiRunId: string;
  proposalType: string;
  content: Record<string, unknown>;
}

export interface ApproveMemoryProposalsInput {
  ownerId: string;
  proposalIds: string[];
  idempotencyKey: string;
  requestHash: string;
}

export interface ProvenanceEdge {
  id: string;
  fromEntityType: string;
  fromEntityId: string;
  toEntityType: string;
  toEntityId: string;
  relationship:
    | "derived_from"
    | "quoted_from"
    | "generated_by"
    | "approved_from"
    | "applied_to"
    | "supersedes";
  metadata: Record<string, unknown>;
  createdAt: Date;
}
