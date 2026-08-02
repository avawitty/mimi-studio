/** @vitest-environment node */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const testDatabaseUrl = process.env.TEST_NEON_DATABASE_URL;
const describeNeon = testDatabaseUrl ? describe : describe.skip;
const rollbackMarker = new Error("ROLLBACK_NEON_INTEGRATION_TEST");

describeNeon("Neon transactional repositories", () => {
  let unitOfWork: Awaited<
    ReturnType<
      typeof import("../infrastructure/database/neon/unitOfWork.js")["getNeonUnitOfWork"]
    >
  >;

  beforeAll(async () => {
    process.env.NEON_DATABASE_URL = testDatabaseUrl;
    process.env.NEON_POOLED_DATABASE_URL = testDatabaseUrl;
    process.env.MIMI_ALLOW_NON_NEON_DATABASE = "1";
    const module = await import(
      "../infrastructure/database/neon/unitOfWork.js"
    );
    await module.resetNeonUnitOfWorkForTests();
    unitOfWork = module.getNeonUnitOfWork();
  });

  afterAll(async () => {
    await unitOfWork?.close();
  });

  it("reserves, commits once, releases unused value, and rejects release-after-commit", async () => {
    const actorId = `integration-${randomUUID()}`;
    const workflowRunId = randomUUID();
    const aiRunId = randomUUID();

    await expect(
      unitOfWork.transaction(async (repositories) => {
        const membership =
          await repositories.memberships.ensureFreeMembership(actorId);
        expect(membership.plan).toBe("free");
        const account = await repositories.credits.getOrCreateAccount({
          kind: "user",
          userId: actorId,
        });
        await repositories.credits.issueGrant({
          accountId: account.id,
          source: "migration",
          amount: 10n,
          idempotencyKey: `test-grant:${actorId}`,
        });
        await repositories.workflows.create({
          id: workflowRunId,
          actorId,
          chamber: "scribe",
          workflowType: "scribe.propose-atoms",
          workflowVersion: 1,
          idempotencyKey: randomUUID(),
          requestHash: "integration-request",
          inputReference: {},
        });
        const reservation = await repositories.credits.createReservation({
          accountId: account.id,
          operationId: "scribe.propose-atoms",
          estimatedCredits: 3n,
          idempotencyKey: `test-reservation:${actorId}`,
          workflowRunId,
          aiRunId,
          expiresAt: new Date(Date.now() + 60_000),
        });
        await repositories.aiRuns.create({
          id: aiRunId,
          workflowRunId,
          actorId,
          operationId: "scribe.propose-atoms",
          operationVersion: 1,
          reservationId: reservation.id,
          routingPolicy: "structured-standard",
          promptId: "scribe.propose-atoms",
          promptVersion: 1,
          inputReference: {},
        });
        const first = await repositories.credits.commitReservation({
          reservationId: reservation.id,
          actualCredits: 2n,
          maximumCredits: 3n,
          aiRunId,
          usage: { inputTokens: 10, outputTokens: 5 },
          idempotencyKey: `test-commit:${actorId}`,
        });
        const replay = await repositories.credits.commitReservation({
          reservationId: reservation.id,
          actualCredits: 2n,
          maximumCredits: 3n,
          aiRunId,
          usage: { inputTokens: 10, outputTokens: 5 },
          idempotencyKey: `test-commit:${actorId}`,
        });
        expect(first.map((entry) => entry.entryType)).toEqual([
          "consume",
          "release",
        ]);
        expect(replay.map((entry) => entry.id).sort()).toEqual(
          first.map((entry) => entry.id).sort(),
        );
        const balance = await repositories.credits.getBalance(account.id);
        expect(balance.available).toBe(8n);
        expect(balance.reserved).toBe(0n);
        await expect(
          repositories.credits.releaseReservation({
            reservationId: reservation.id,
            reason: "canceled",
            idempotencyKey: `test-release:${actorId}`,
          }),
        ).rejects.toThrow("committed reservation cannot be released");
        throw rollbackMarker;
      }),
    ).rejects.toBe(rollbackMarker);
  });
});
