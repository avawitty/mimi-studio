import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import {
  CreditReservationStateError,
} from "../../../domain/credits/errors.js";
import {
  allocateGrantConsumption,
  commitBalance,
  releaseBalance,
  reserveBalance,
} from "../../../domain/credits/invariants.js";
import type { CreditLedgerRepository } from "../../../domain/credits/repository.js";
import type {
  CommitReservationInput,
  CreateReservationInput,
  CreditAccount,
  CreditAccountOwner,
  CreditBalance,
  CreditLedgerEntry,
  CreditReservation,
  IssueCreditGrantInput,
  ReleaseReservationInput,
} from "../../../domain/credits/types.js";
import type { NeonRepositoryDatabase } from "./connection.js";
import {
  mapCreditAccountRow,
  mapCreditBalance,
  mapCreditLedgerEntryRow,
  mapCreditReservationRow,
} from "./mappers.js";
import {
  creditAccounts,
  creditGrantBuckets,
  creditLedgerEntries,
  creditReservations,
  profiles,
} from "./schema.js";

export class NeonCreditLedgerRepository implements CreditLedgerRepository {
  constructor(
    private readonly db: NeonRepositoryDatabase,
    private readonly transactional: boolean,
  ) {}

  private requireTransaction(): void {
    if (!this.transactional) {
      throw new Error("Credit mutations require a UnitOfWork transaction.");
    }
  }

  private async lockAccount(accountId: string): Promise<void> {
    await this.db.execute(
      sql`select ${creditAccounts.id} from ${creditAccounts}
          where ${creditAccounts.id} = ${accountId}
          for update`,
    );
  }

  private async lockReservation(reservationId: string): Promise<void> {
    await this.db.execute(
      sql`select ${creditReservations.id} from ${creditReservations}
          where ${creditReservations.id} = ${reservationId}
          for update`,
    );
  }

  async findAccount(owner: CreditAccountOwner): Promise<CreditAccount | null> {
    const where =
      owner.kind === "user"
        ? eq(creditAccounts.userId, owner.userId)
        : eq(creditAccounts.workspaceId, owner.workspaceId);
    const [row] = await this.db.select().from(creditAccounts).where(where).limit(1);
    return row ? mapCreditAccountRow(row) : null;
  }

  async getOrCreateAccount(owner: CreditAccountOwner): Promise<CreditAccount> {
    this.requireTransaction();
    if (owner.kind === "user") {
      await this.db
        .insert(profiles)
        .values({ id: owner.userId })
        .onConflictDoNothing({ target: profiles.id });
    }

    const existing = await this.findAccount(owner);
    if (existing) return existing;

    const id = randomUUID();
    const [inserted] = await this.db
      .insert(creditAccounts)
      .values({
        id,
        userId: owner.kind === "user" ? owner.userId : null,
        workspaceId: owner.kind === "workspace" ? owner.workspaceId : null,
      })
      .onConflictDoNothing()
      .returning();
    if (inserted) return mapCreditAccountRow(inserted);

    const concurrent = await this.findAccount(owner);
    if (!concurrent) throw new Error("Credit account could not be created.");
    return concurrent;
  }

  async issueGrant(input: IssueCreditGrantInput): Promise<CreditLedgerEntry> {
    this.requireTransaction();
    if (input.amount <= 0n) throw new Error("Credit grants must be positive.");
    await this.lockAccount(input.accountId);

    const [existing] = await this.db
      .select()
      .from(creditLedgerEntries)
      .where(
        and(
          eq(creditLedgerEntries.accountId, input.accountId),
          eq(creditLedgerEntries.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    if (existing) {
      if (
        existing.amount !== input.amount ||
        existing.externalReference !== (input.externalReference ?? null)
      ) {
        throw Object.assign(
          new Error("Idempotency key was already used for another credit grant."),
          { code: "IDEMPOTENCY_KEY_REUSED", status: 409 },
        );
      }
      return mapCreditLedgerEntryRow(existing);
    }

    const bucketId = randomUUID();
    await this.db.insert(creditGrantBuckets).values({
      id: bucketId,
      accountId: input.accountId,
      source: input.source,
      originalAmount: input.amount,
      remainingAmount: input.amount,
      expiresAt: input.expiresAt ?? null,
      externalReference: input.externalReference ?? null,
    });

    const [entry] = await this.db
      .insert(creditLedgerEntries)
      .values({
        id: randomUUID(),
        accountId: input.accountId,
        entryType: "grant",
        amount: input.amount,
        grantBucketId: bucketId,
        externalReference: input.externalReference ?? null,
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata ?? {},
      })
      .returning();

    await this.db
      .update(creditAccounts)
      .set({
        availableBalance: sql`${creditAccounts.availableBalance} + ${input.amount}`,
        version: sql`${creditAccounts.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(creditAccounts.id, input.accountId));

    return mapCreditLedgerEntryRow(entry);
  }

  private async expireEligibleGrantsAfterLock(
    accountId: string,
    now: Date,
  ): Promise<bigint> {
    const [account] = await this.db
      .select()
      .from(creditAccounts)
      .where(eq(creditAccounts.id, accountId))
      .limit(1);
    if (!account) throw new Error("Credit account does not exist.");

    const expiredBuckets = await this.db
      .select()
      .from(creditGrantBuckets)
      .where(
        and(
          eq(creditGrantBuckets.accountId, accountId),
          gt(creditGrantBuckets.remainingAmount, 0n),
          sql`${creditGrantBuckets.expiresAt} <= ${now}`,
        ),
      )
      .orderBy(asc(creditGrantBuckets.expiresAt), asc(creditGrantBuckets.createdAt))
      .for("update");
    const expiredTotal = expiredBuckets.reduce(
      (total, bucket) => total + bucket.remainingAmount,
      0n,
    );
    // Reservations are not bucket-specific. Conservatively protect enough
    // expired value to cover active reservations; the next mutation expires it
    // after those reservations commit or release.
    let expirable =
      expiredTotal > account.reservedBalance
        ? expiredTotal - account.reservedBalance
        : 0n;
    if (expirable === 0n) return 0n;
    const totalExpirable = expirable;

    for (const bucket of expiredBuckets) {
      if (expirable === 0n) break;
      const amount =
        bucket.remainingAmount < expirable
          ? bucket.remainingAmount
          : expirable;
      await this.db
        .update(creditGrantBuckets)
        .set({
          remainingAmount: sql`${creditGrantBuckets.remainingAmount} - ${amount}`,
        })
        .where(eq(creditGrantBuckets.id, bucket.id));
      await this.db.insert(creditLedgerEntries).values({
        id: randomUUID(),
        accountId,
        entryType: "expire",
        amount: -amount,
        grantBucketId: bucket.id,
        idempotencyKey: `expire:${bucket.id}:${bucket.remainingAmount.toString()}`,
        metadata: {
          expiredAt: now.toISOString(),
        },
      });
      expirable -= amount;
    }

    if (account.availableBalance < totalExpirable) {
      throw new Error("Expired grants exceed the spendable account projection.");
    }
    await this.db
      .update(creditAccounts)
      .set({
        availableBalance: account.availableBalance - totalExpirable,
        version: sql`${creditAccounts.version} + 1`,
        updatedAt: now,
      })
      .where(eq(creditAccounts.id, accountId));
    return totalExpirable;
  }

  async expireEligibleGrants(
    accountId: string,
    now = new Date(),
  ): Promise<bigint> {
    this.requireTransaction();
    await this.lockAccount(accountId);
    return this.expireEligibleGrantsAfterLock(accountId, now);
  }

  async createReservation(input: CreateReservationInput): Promise<CreditReservation> {
    this.requireTransaction();
    if (input.estimatedCredits <= 0n) {
      throw new Error("Credit reservations must be positive.");
    }
    await this.lockAccount(input.accountId);
    await this.expireEligibleGrantsAfterLock(input.accountId, new Date());

    const [existing] = await this.db
      .select()
      .from(creditReservations)
      .where(
        and(
          eq(creditReservations.accountId, input.accountId),
          eq(creditReservations.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    if (existing) {
      if (
        existing.operationId !== input.operationId ||
        existing.estimatedAmount !== input.estimatedCredits ||
        existing.workflowRunId !== input.workflowRunId ||
        existing.aiRunId !== input.aiRunId
      ) {
        throw Object.assign(
          new Error("Idempotency key was already used for another reservation."),
          { code: "IDEMPOTENCY_KEY_REUSED", status: 409 },
        );
      }
      return mapCreditReservationRow(existing);
    }

    const [account] = await this.db
      .select()
      .from(creditAccounts)
      .where(eq(creditAccounts.id, input.accountId))
      .limit(1);
    if (!account) throw new Error("Credit account does not exist.");
    const projection = reserveBalance(
      {
        available: account.availableBalance,
        reserved: account.reservedBalance,
      },
      {
        amount: input.estimatedCredits,
        operationId: input.operationId,
      },
    );

    const [reservation] = await this.db
      .insert(creditReservations)
      .values({
        id: randomUUID(),
        accountId: input.accountId,
        operationId: input.operationId,
        estimatedAmount: input.estimatedCredits,
        status: "active",
        idempotencyKey: input.idempotencyKey,
        workflowRunId: input.workflowRunId,
        aiRunId: input.aiRunId,
        expiresAt: input.expiresAt,
      })
      .returning();

    await this.db.insert(creditLedgerEntries).values({
      id: randomUUID(),
      accountId: input.accountId,
      entryType: "reserve",
      amount: 0n,
      reservationId: reservation.id,
      operationId: input.operationId,
      workflowRunId: input.workflowRunId,
      // The AI run is created immediately after the reservation and points
      // back to it. Keep this side null to avoid a circular immediate FK.
      aiRunId: null,
      idempotencyKey: `${input.idempotencyKey}:reserve`,
      metadata: { reserved: input.estimatedCredits.toString() },
    });

    await this.db
      .update(creditAccounts)
      .set({
        availableBalance: projection.available,
        reservedBalance: projection.reserved,
        version: sql`${creditAccounts.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(creditAccounts.id, input.accountId));

    return mapCreditReservationRow(reservation);
  }

  async commitReservation(input: CommitReservationInput): Promise<CreditLedgerEntry[]> {
    this.requireTransaction();
    await this.lockReservation(input.reservationId);
    const [reservation] = await this.db
      .select()
      .from(creditReservations)
      .where(eq(creditReservations.id, input.reservationId))
      .limit(1);
    if (!reservation) {
      throw new CreditReservationStateError(input.reservationId, "Reservation does not exist.");
    }

    if (reservation.status === "committed") {
      if (
        reservation.committedAmount !== input.actualCredits ||
        reservation.aiRunId !== input.aiRunId
      ) {
        throw Object.assign(
          new Error("Reservation was already committed with another payload."),
          { code: "IDEMPOTENCY_KEY_REUSED", status: 409 },
        );
      }
      const existing = await this.db
        .select()
        .from(creditLedgerEntries)
        .where(eq(creditLedgerEntries.reservationId, input.reservationId));
      return existing
        .filter((entry) => entry.entryType === "consume" || entry.entryType === "release")
        .map(mapCreditLedgerEntryRow);
    }
    if (reservation.status !== "active") {
      throw new CreditReservationStateError(
        input.reservationId,
        `Reservation is already ${reservation.status}.`,
      );
    }
    await this.lockAccount(reservation.accountId);
    const [account] = await this.db
      .select()
      .from(creditAccounts)
      .where(eq(creditAccounts.id, reservation.accountId))
      .limit(1);
    if (!account) throw new Error("Credit account does not exist.");
    const projection = commitBalance(
      {
        available: account.availableBalance,
        reserved: account.reservedBalance,
      },
      mapCreditReservationRow(reservation),
      {
        actual: input.actualCredits,
        maximum: input.maximumCredits,
      },
    );

    const buckets = await this.db
      .select()
      .from(creditGrantBuckets)
      .where(
        and(
          eq(creditGrantBuckets.accountId, reservation.accountId),
          gt(creditGrantBuckets.remainingAmount, 0n),
        ),
      )
      .orderBy(
        sql`${creditGrantBuckets.expiresAt} asc nulls last`,
        asc(creditGrantBuckets.createdAt),
      )
      .for("update");

    const allocation = allocateGrantConsumption(
      buckets.map((bucket) => bucket.remainingAmount),
      input.actualCredits,
    );
    const consumptionEntries: Array<typeof creditLedgerEntries.$inferInsert> = [];
    for (const [index, bucket] of buckets.entries()) {
      const amount = allocation.allocations[index];
      if (amount === 0n) continue;
      await this.db
        .update(creditGrantBuckets)
        .set({ remainingAmount: sql`${creditGrantBuckets.remainingAmount} - ${amount}` })
        .where(eq(creditGrantBuckets.id, bucket.id));
      consumptionEntries.push({
        id: randomUUID(),
        accountId: reservation.accountId,
        entryType: "consume",
        amount: -amount,
        grantBucketId: bucket.id,
        reservationId: reservation.id,
        operationId: reservation.operationId,
        workflowRunId: reservation.workflowRunId,
        aiRunId: input.aiRunId,
        idempotencyKey: `${input.idempotencyKey}:consume:${bucket.id}`,
        metadata: {
          usage: input.usage,
          allocation: amount.toString(),
        },
      });
    }
    if (allocation.unallocated > 0n) {
      throw new Error("Credit grant buckets do not reconcile with the account projection.");
    }

    const released = projection.released;
    await this.db
      .update(creditAccounts)
      .set({
        reservedBalance: projection.reserved,
        availableBalance: projection.available,
        version: sql`${creditAccounts.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(creditAccounts.id, reservation.accountId));

    const entries = await this.db
      .insert(creditLedgerEntries)
      .values([
        ...consumptionEntries,
        {
          id: randomUUID(),
          accountId: reservation.accountId,
          entryType: "release",
          amount: 0n,
          reservationId: reservation.id,
          operationId: reservation.operationId,
          workflowRunId: reservation.workflowRunId,
          aiRunId: input.aiRunId,
          idempotencyKey: `${input.idempotencyKey}:release-unused`,
          metadata: { released: released.toString() },
        },
      ])
      .returning();

    await this.db
      .update(creditReservations)
      .set({
        status: "committed",
        committedAmount: input.actualCredits,
        aiRunId: input.aiRunId,
        updatedAt: new Date(),
      })
      .where(eq(creditReservations.id, reservation.id));

    return entries.map(mapCreditLedgerEntryRow);
  }

  async releaseReservation(input: ReleaseReservationInput): Promise<void> {
    this.requireTransaction();
    await this.lockReservation(input.reservationId);
    const [reservation] = await this.db
      .select()
      .from(creditReservations)
      .where(eq(creditReservations.id, input.reservationId))
      .limit(1);
    if (!reservation) return;
    if (reservation.status === "released" || reservation.status === "expired") return;
    if (reservation.status === "committed") {
      throw new CreditReservationStateError(
        input.reservationId,
        "A committed reservation cannot be released.",
      );
    }

    await this.lockAccount(reservation.accountId);
    const [account] = await this.db
      .select()
      .from(creditAccounts)
      .where(eq(creditAccounts.id, reservation.accountId))
      .limit(1);
    if (!account) throw new Error("Credit account does not exist.");
    const projection = releaseBalance(
      {
        available: account.availableBalance,
        reserved: account.reservedBalance,
      },
      mapCreditReservationRow(reservation),
    );
    await this.db
      .update(creditAccounts)
      .set({
        availableBalance: projection.available,
        reservedBalance: projection.reserved,
        version: sql`${creditAccounts.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(creditAccounts.id, reservation.accountId));

    await this.db.insert(creditLedgerEntries).values({
      id: randomUUID(),
      accountId: reservation.accountId,
      entryType: "release",
      amount: 0n,
      reservationId: reservation.id,
      operationId: reservation.operationId,
      workflowRunId: reservation.workflowRunId,
      aiRunId: reservation.aiRunId,
      idempotencyKey: `${input.idempotencyKey}:release`,
      metadata: {
        released: reservation.estimatedAmount.toString(),
        reason: input.reason,
      },
    });

    await this.db
      .update(creditReservations)
      .set({
        status: input.reason === "expired" ? "expired" : "released",
        updatedAt: new Date(),
      })
      .where(eq(creditReservations.id, reservation.id));
  }

  async getReservation(reservationId: string): Promise<CreditReservation | null> {
    const [row] = await this.db
      .select()
      .from(creditReservations)
      .where(eq(creditReservations.id, reservationId))
      .limit(1);
    return row ? mapCreditReservationRow(row) : null;
  }

  async listExpiredActiveReservations(
    now: Date,
    limit: number,
  ): Promise<CreditReservation[]> {
    this.requireTransaction();
    const rows = await this.db
      .select()
      .from(creditReservations)
      .where(
        and(
          eq(creditReservations.status, "active"),
          lt(creditReservations.expiresAt, now),
        ),
      )
      .orderBy(asc(creditReservations.expiresAt))
      .limit(Math.max(1, Math.min(limit, 100)))
      .for("update", { skipLocked: true });
    return rows.map(mapCreditReservationRow);
  }

  async deferReservationReview(
    reservationId: string,
    reviewAfter: Date,
  ): Promise<void> {
    this.requireTransaction();
    await this.db
      .update(creditReservations)
      .set({ expiresAt: reviewAfter, updatedAt: new Date() })
      .where(
        and(
          eq(creditReservations.id, reservationId),
          eq(creditReservations.status, "active"),
        ),
      );
  }

  async getBalance(accountId: string): Promise<CreditBalance> {
    const [account] = await this.db
      .select()
      .from(creditAccounts)
      .where(eq(creditAccounts.id, accountId))
      .limit(1);
    if (!account) throw new Error("Credit account does not exist.");
    const grants = await this.db
      .select()
      .from(creditGrantBuckets)
      .where(
        and(
          eq(creditGrantBuckets.accountId, accountId),
          gt(creditGrantBuckets.remainingAmount, 0n),
          or(
            isNull(creditGrantBuckets.expiresAt),
            gt(creditGrantBuckets.expiresAt, new Date()),
          ),
        ),
      )
      .orderBy(
        sql`${creditGrantBuckets.expiresAt} asc nulls last`,
        asc(creditGrantBuckets.createdAt),
      );
    return mapCreditBalance(account, grants);
  }

  async getEntriesForReservation(reservationId: string): Promise<CreditLedgerEntry[]> {
    const rows = await this.db
      .select()
      .from(creditLedgerEntries)
      .where(
        and(
          eq(creditLedgerEntries.reservationId, reservationId),
          inArray(creditLedgerEntries.entryType, ["consume", "release"]),
        ),
      );
    return rows.map(mapCreditLedgerEntryRow);
  }
}
