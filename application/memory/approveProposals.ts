import { createHash } from "node:crypto";
import type { UnitOfWork } from "../../domain/database.js";
import type { MemoryAtom } from "../../domain/memory/types.js";

export class ApproveMemoryProposalsService {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: {
    actorId: string;
    proposalIds: string[];
    idempotencyKey: string;
  }): Promise<MemoryAtom[]> {
    const proposalIds = [...new Set(input.proposalIds)];
    if (proposalIds.length === 0) return [];
    return this.unitOfWork.transaction(async (repositories) => {
      const proposals = await repositories.memory.getProposals(
        input.actorId,
        proposalIds,
      );
      if (proposals.length !== proposalIds.length) {
        throw Object.assign(
          new Error("One or more memory proposals are unavailable."),
          {
            code: "SOURCE_ACCESS_DENIED",
            status: 404,
          },
        );
      }
      return repositories.memory.approveProposals({
        ownerId: input.actorId,
        proposalIds,
        idempotencyKey: input.idempotencyKey,
        requestHash: createHash("sha256")
          .update(JSON.stringify([...proposalIds].sort()))
          .digest("hex"),
      });
    });
  }
}
