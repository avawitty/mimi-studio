import type {
  ApproveMemoryProposalsInput,
  CreateMemoryProposalInput,
  CreateSourceInput,
  MemoryAtom,
  MemoryProposal,
  ProvenanceEdge,
  SourceRecord,
} from "./types.js";

export interface MemoryRepository {
  createSource(input: CreateSourceInput): Promise<SourceRecord>;
  createProposals(inputs: CreateMemoryProposalInput[]): Promise<MemoryProposal[]>;
  getProposals(ownerId: string, proposalIds: string[]): Promise<MemoryProposal[]>;
  listActiveAtoms(
    ownerId: string,
    projectId?: string,
    limit?: number,
  ): Promise<MemoryAtom[]>;
  approveProposals(input: ApproveMemoryProposalsInput): Promise<MemoryAtom[]>;
}

export interface ProvenanceRepository {
  createEdges(
    edges: Array<Omit<ProvenanceEdge, "id" | "createdAt">>,
  ): Promise<ProvenanceEdge[]>;
}
