/** @vitest-environment node */
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const initialMigrationPath = new URL(
  "../infrastructure/database/neon/migrations/0000_lucky_thunderbolts.sql",
  import.meta.url,
);
const creditRepositoryPath = new URL(
  "../infrastructure/database/neon/creditRepository.ts",
  import.meta.url,
);
const unitOfWorkPath = new URL(
  "../infrastructure/database/neon/unitOfWork.ts",
  import.meta.url,
);

describe("Neon operational schema contract", () => {
  it("contains the canonical operational tables and database invariants", async () => {
    const migration = await readFile(initialMigrationPath, "utf8");
    for (const table of [
      "memberships",
      "credit_accounts",
      "credit_ledger_entries",
      "credit_reservations",
      "workflow_runs",
      "ai_runs",
      "ai_provider_attempts",
      "sources",
      "memory_proposals",
      "memory_atoms",
      "operation_results",
      "provenance_edges",
      "stripe_webhook_events",
      "legacy_record_map",
    ]) {
      expect(migration).toContain(`"mimi"."${table}"`);
    }
    expect(migration).toContain("credit_accounts_available_nonnegative");
    expect(migration).toContain("credit_ledger_entries_immutable");
    expect(migration).toContain("workflow_runs_actor_idempotency_unique");
  });

  it("uses row locks and serializable pooled transactions for money state", async () => {
    const [repository, unitOfWork] = await Promise.all([
      readFile(creditRepositoryPath, "utf8"),
      readFile(unitOfWorkPath, "utf8"),
    ]);
    expect(repository.toLowerCase()).toContain("for update");
    expect(repository).toContain("aiRunId: null");
    expect(unitOfWork).toContain("BEGIN ISOLATION LEVEL SERIALIZABLE");
    expect(unitOfWork).toContain("40001");
  });
});
