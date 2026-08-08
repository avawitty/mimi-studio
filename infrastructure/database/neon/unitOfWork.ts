import type {
  DatabaseRepositories,
  UnitOfWork,
} from "../../../domain/database.js";
import {
  closeNeonConnections,
  createNeonPooledDatabase,
  getNeonQueryDatabase,
  getNeonTransactionPool,
  type NeonRepositoryDatabase,
} from "./connection.js";
import { NeonCreditLedgerRepository } from "./creditRepository.js";
import {
  NeonMembershipRepository,
  NeonStripeEventRepository,
} from "./membershipRepository.js";
import {
  NeonMemoryRepository,
  NeonProvenanceRepository,
} from "./memoryRepository.js";
import type { TasteIntelligenceRepository } from "../../../domain/tasteIntelligence/repository.js";
import {
  NeonAiRunRepository,
  NeonOperationResultRepository,
  NeonWorkflowRepository,
} from "./workflowRepository.js";
import { NeonTasteIntelligenceRepository } from "./tasteIntelligenceRepository.js";

function createRepositories(
  db: NeonRepositoryDatabase,
  transactional: boolean,
): DatabaseRepositories {
  return {
    credits: new NeonCreditLedgerRepository(db, transactional),
    memberships: new NeonMembershipRepository(db, transactional),
    stripeEvents: new NeonStripeEventRepository(db, transactional),
    workflows: new NeonWorkflowRepository(db),
    aiRuns: new NeonAiRunRepository(db),
    operationResults: new NeonOperationResultRepository(db),
    memory: new NeonMemoryRepository(db, transactional),
    provenance: new NeonProvenanceRepository(db, transactional),
    tasteIntelligence: new NeonTasteIntelligenceRepository(db, transactional),
  };
}

function isSerializationFailure(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "40001"
  );
}

export class NeonUnitOfWork implements UnitOfWork {
  readonly repositories: DatabaseRepositories;

  constructor() {
    this.repositories = createRepositories(getNeonQueryDatabase(), false);
  }

  async transaction<T>(
    callback: (repositories: DatabaseRepositories) => Promise<T>,
  ): Promise<T> {
    const pool = getNeonTransactionPool();
    const maxAttempts = 3;
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt += 1;
      const client = await pool.connect();
      try {
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
        const repositories = createRepositories(
          createNeonPooledDatabase(client),
          true,
        );
        const value = await callback(repositories);
        await client.query("COMMIT");
        return value;
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // Preserve the original error.
        }
        if (attempt < maxAttempts && isSerializationFailure(error)) {
          continue;
        }
        throw error;
      } finally {
        client.release();
      }
    }
    throw new Error("Neon transaction retry budget exhausted.");
  }

  async close(): Promise<void> {
    await closeNeonConnections();
  }
}

let singleton: NeonUnitOfWork | null = null;

export function getNeonUnitOfWork(): NeonUnitOfWork {
  if (!singleton) singleton = new NeonUnitOfWork();
  return singleton;
}

export async function resetNeonUnitOfWorkForTests(): Promise<void> {
  const current = singleton;
  singleton = null;
  await current?.close();
}
