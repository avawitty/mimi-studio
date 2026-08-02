import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import type {
  MemoryRepository,
  ProvenanceRepository,
} from "../../../domain/memory/repository.js";
import type {
  ApproveMemoryProposalsInput,
  CreateMemoryProposalInput,
  CreateSourceInput,
  MemoryAtom,
  MemoryProposal,
  ProvenanceEdge,
  SourceRecord,
} from "../../../domain/memory/types.js";
import type { NeonRepositoryDatabase } from "./connection.js";
import {
  mapMemoryAtomRow,
  mapMemoryProposalRow,
  mapProvenanceEdgeRow,
  mapSourceRow,
} from "./mappers.js";
import {
  memoryApprovalCommands,
  memoryAtoms,
  memoryProposals,
  provenanceEdges,
  sources,
} from "./schema.js";

export class NeonMemoryRepository implements MemoryRepository {
  constructor(
    private readonly db: NeonRepositoryDatabase,
    private readonly transactional: boolean,
  ) {}

  private requireTransaction(): void {
    if (!this.transactional) {
      throw new Error("Memory mutations require a UnitOfWork transaction.");
    }
  }

  async createSource(input: CreateSourceInput): Promise<SourceRecord> {
    this.requireTransaction();
    const [existing] = await this.db
      .select()
      .from(sources)
      .where(
        and(
          eq(sources.ownerId, input.ownerId),
          eq(sources.contentHash, input.contentHash),
        ),
      )
      .limit(1);
    if (existing) return mapSourceRow(existing);

    const [created] = await this.db
      .insert(sources)
      .values({
        id: input.id,
        ownerId: input.ownerId,
        projectId: input.projectId ?? null,
        sourceType: input.sourceType,
        storageReference: input.storageReference,
        contentHash: input.contentHash,
        metadata: input.metadata ?? {},
      })
      .onConflictDoNothing()
      .returning();
    if (created) return mapSourceRow(created);

    const [concurrent] = await this.db
      .select()
      .from(sources)
      .where(
        and(
          eq(sources.ownerId, input.ownerId),
          eq(sources.contentHash, input.contentHash),
        ),
      )
      .limit(1);
    if (!concurrent) throw new Error("Source record could not be created.");
    return mapSourceRow(concurrent);
  }

  async createProposals(
    inputs: CreateMemoryProposalInput[],
  ): Promise<MemoryProposal[]> {
    this.requireTransaction();
    if (inputs.length === 0) return [];
    const rows = await this.db
      .insert(memoryProposals)
      .values(
        inputs.map((input) => ({
          id: input.id,
          ownerId: input.ownerId,
          projectId: input.projectId ?? null,
          sourceId: input.sourceId ?? null,
          aiRunId: input.aiRunId,
          proposalType: input.proposalType,
          content: input.content,
          status: "proposed" as const,
        })),
      )
      .returning();
    return rows.map(mapMemoryProposalRow);
  }

  async getProposals(
    ownerId: string,
    proposalIds: string[],
  ): Promise<MemoryProposal[]> {
    if (proposalIds.length === 0) return [];
    const rows = await this.db
      .select()
      .from(memoryProposals)
      .where(
        and(
          eq(memoryProposals.ownerId, ownerId),
          inArray(memoryProposals.id, proposalIds),
        ),
      );
    return rows.map(mapMemoryProposalRow);
  }

  async listActiveAtoms(
    ownerId: string,
    projectId?: string,
    limit = 100,
  ): Promise<MemoryAtom[]> {
    const scope = projectId
      ? or(eq(memoryAtoms.projectId, projectId), isNull(memoryAtoms.projectId))
      : undefined;
    const rows = await this.db
      .select()
      .from(memoryAtoms)
      .where(
        and(
          eq(memoryAtoms.ownerId, ownerId),
          eq(memoryAtoms.status, "active"),
          scope,
        ),
      )
      .orderBy(desc(memoryAtoms.updatedAt))
      .limit(Math.max(1, Math.min(limit, 200)));
    return rows.map(mapMemoryAtomRow);
  }

  async approveProposals(
    input: ApproveMemoryProposalsInput,
  ): Promise<MemoryAtom[]> {
    this.requireTransaction();
    if (input.proposalIds.length === 0) return [];

    const [existingCommand] = await this.db
      .select()
      .from(memoryApprovalCommands)
      .where(
        and(
          eq(memoryApprovalCommands.ownerId, input.ownerId),
          eq(memoryApprovalCommands.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    if (existingCommand) {
      if (
        existingCommand.requestHash !== input.requestHash ||
        JSON.stringify([...existingCommand.proposalIds].sort()) !==
          JSON.stringify([...input.proposalIds].sort())
      ) {
        throw Object.assign(
          new Error("Idempotency key was already used for another approval request."),
          { code: "IDEMPOTENCY_KEY_REUSED", status: 409 },
        );
      }
      if (existingCommand.atomIds.length === 0) return [];
      const rows = await this.db
        .select()
        .from(memoryAtoms)
        .where(inArray(memoryAtoms.id, existingCommand.atomIds));
      return rows.map(mapMemoryAtomRow);
    }

    const proposalRows = await this.db
      .select()
      .from(memoryProposals)
      .where(
        and(
          eq(memoryProposals.ownerId, input.ownerId),
          inArray(memoryProposals.id, input.proposalIds),
        ),
      )
      .for("update");
    if (proposalRows.length !== new Set(input.proposalIds).size) {
      throw new Error("One or more memory proposals are unavailable.");
    }
    const projectIds = new Set(
      proposalRows.map((proposal) => proposal.projectId).filter(Boolean),
    );
    if (projectIds.size > 1) {
      throw new Error("Memory proposals from different projects require separate approvals.");
    }

    const atomRows: Array<typeof memoryAtoms.$inferSelect> = [];
    for (const proposal of proposalRows) {
      const [existingAtom] = await this.db
        .select()
        .from(memoryAtoms)
        .where(eq(memoryAtoms.proposalId, proposal.id))
        .limit(1);
      if (existingAtom) {
        atomRows.push(existingAtom);
        continue;
      }
      if (proposal.status !== "proposed") {
        throw new Error(`Memory proposal ${proposal.id} is already ${proposal.status}.`);
      }

      const rawConfidence = Number(proposal.content.confidence);
      const confidence = Number.isFinite(rawConfidence)
        ? String(rawConfidence > 1 ? rawConfidence / 100 : rawConfidence)
        : null;
      const [atom] = await this.db
        .insert(memoryAtoms)
        .values({
          id: randomUUID(),
          ownerId: input.ownerId,
          projectId: proposal.projectId,
          proposalId: proposal.id,
          atomType: proposal.proposalType,
          content: proposal.content,
          confidence,
          status: "active",
        })
        .returning();
      atomRows.push(atom);

      await this.db
        .update(memoryProposals)
        .set({ status: "approved", reviewedAt: new Date() })
        .where(eq(memoryProposals.id, proposal.id));

      await this.db.insert(provenanceEdges).values([
        {
          id: randomUUID(),
          fromEntityType: "memory_atom",
          fromEntityId: atom.id,
          toEntityType: "memory_proposal",
          toEntityId: proposal.id,
          relationship: "approved_from",
          metadata: { approvalCommand: input.idempotencyKey },
        },
        ...(proposal.sourceId
          ? [
              {
                id: randomUUID(),
                fromEntityType: "memory_atom",
                fromEntityId: atom.id,
                toEntityType: "source",
                toEntityId: proposal.sourceId,
                relationship: "derived_from",
                metadata: {},
              },
            ]
          : []),
      ]);
    }

    await this.db.insert(memoryApprovalCommands).values({
      id: randomUUID(),
      ownerId: input.ownerId,
      projectId: proposalRows[0]?.projectId ?? null,
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
      proposalIds: input.proposalIds,
      atomIds: atomRows.map((atom) => atom.id),
    });
    return atomRows.map(mapMemoryAtomRow);
  }
}

export class NeonProvenanceRepository implements ProvenanceRepository {
  constructor(
    private readonly db: NeonRepositoryDatabase,
    private readonly transactional: boolean,
  ) {}

  async createEdges(
    edges: Array<Omit<ProvenanceEdge, "id" | "createdAt">>,
  ): Promise<ProvenanceEdge[]> {
    if (!this.transactional) {
      throw new Error("Provenance mutations require a UnitOfWork transaction.");
    }
    if (edges.length === 0) return [];
    const rows = await this.db
      .insert(provenanceEdges)
      .values(
        edges.map((edge) => ({
          id: randomUUID(),
          ...edge,
        })),
      )
      .returning();
    return rows.map(mapProvenanceEdgeRow);
  }
}
