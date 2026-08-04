import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type {
  MembershipRepository,
  StripeEventRepository,
} from "../../../domain/memberships/repository.js";
import type {
  ApplyMembershipInput,
  Membership,
  StripeEventClaim,
} from "../../../domain/memberships/types.js";
import type { NeonRepositoryDatabase } from "./connection.js";
import { mapMembershipRow } from "./mappers.js";
import {
  memberships,
  profiles,
  stripeWebhookEvents,
  workspaceMembers,
} from "./schema.js";

export class NeonMembershipRepository implements MembershipRepository {
  constructor(
    private readonly db: NeonRepositoryDatabase,
    private readonly transactional: boolean,
  ) {}

  private requireTransaction(): void {
    if (!this.transactional) {
      throw new Error("Membership mutations require a UnitOfWork transaction.");
    }
  }

  async findForUser(userId: string): Promise<Membership | null> {
    const [row] = await this.db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, userId))
      .limit(1);
    return row ? mapMembershipRow(row) : null;
  }

  async findForWorkspace(workspaceId: string): Promise<Membership | null> {
    const [row] = await this.db
      .select()
      .from(memberships)
      .where(eq(memberships.workspaceId, workspaceId))
      .limit(1);
    return row ? mapMembershipRow(row) : null;
  }

  async findByProviderCustomerId(customerId: string): Promise<Membership | null> {
    const [row] = await this.db
      .select()
      .from(memberships)
      .where(eq(memberships.providerCustomerId, customerId))
      .limit(1);
    return row ? mapMembershipRow(row) : null;
  }

  async upsert(input: ApplyMembershipInput): Promise<Membership> {
    this.requireTransaction();
    const populatedOwners = Number(Boolean(input.userId)) + Number(Boolean(input.workspaceId));
    if (populatedOwners !== 1) {
      throw new Error("A membership must belong to exactly one user or workspace.");
    }
    if (input.userId) {
      await this.db
        .insert(profiles)
        .values({ id: input.userId })
        .onConflictDoNothing({ target: profiles.id });
    }

    const existing = input.userId
      ? await this.findForUser(input.userId)
      : await this.findForWorkspace(input.workspaceId!);
    if (existing) {
      const [updated] = await this.db
        .update(memberships)
        .set({
          plan: input.plan,
          status: input.status,
          provider: input.provider,
          providerCustomerId: input.providerCustomerId ?? existing.providerCustomerId,
          providerSubscriptionId:
            input.providerSubscriptionId ?? existing.providerSubscriptionId,
          providerEventId: input.providerEventId ?? existing.providerEventId,
          providerEventCreatedAt:
            input.providerEventCreatedAt ?? existing.providerEventCreatedAt,
          currentPeriodStart: input.currentPeriodStart ?? existing.currentPeriodStart,
          currentPeriodEnd: input.currentPeriodEnd ?? existing.currentPeriodEnd,
          updatedAt: new Date(),
        })
        .where(eq(memberships.id, existing.id))
        .returning();
      return mapMembershipRow(updated);
    }

    const [created] = await this.db
      .insert(memberships)
      .values({
        id: randomUUID(),
        userId: input.userId ?? null,
        workspaceId: input.workspaceId ?? null,
        plan: input.plan,
        status: input.status,
        provider: input.provider,
        providerCustomerId: input.providerCustomerId ?? null,
        providerSubscriptionId: input.providerSubscriptionId ?? null,
        providerEventId: input.providerEventId ?? null,
        providerEventCreatedAt: input.providerEventCreatedAt ?? null,
        currentPeriodStart: input.currentPeriodStart ?? null,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
      })
      .returning();
    return mapMembershipRow(created);
  }

  async ensureFreeMembership(userId: string): Promise<Membership> {
    this.requireTransaction();
    const existing = await this.findForUser(userId);
    if (existing) return existing;
    return this.upsert({
      userId,
      plan: "free",
      status: "active",
      provider: "internal",
    });
  }

  async getWorkspaceRole(
    userId: string,
    workspaceId: string,
  ): Promise<"owner" | "admin" | "editor" | "viewer" | null> {
    const [member] = await this.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    return member?.role ?? null;
  }
}

export class NeonStripeEventRepository implements StripeEventRepository {
  constructor(
    private readonly db: NeonRepositoryDatabase,
    private readonly transactional: boolean,
  ) {}

  private requireTransaction(): void {
    if (!this.transactional) {
      throw new Error("Stripe event mutations require a UnitOfWork transaction.");
    }
  }

  async get(eventId: string): Promise<StripeEventClaim | null> {
    const [row] = await this.db
      .select()
      .from(stripeWebhookEvents)
      .where(eq(stripeWebhookEvents.eventId, eventId))
      .limit(1);
    if (!row) return null;
    return {
      eventId: row.eventId,
      eventType: row.eventType,
      status: row.status,
      payloadReference: row.payloadReference,
      error: row.error,
    };
  }

  async claim(input: Omit<StripeEventClaim, "status">): Promise<boolean> {
    this.requireTransaction();
    const existing = await this.get(input.eventId);
    if (existing?.status === "completed" || existing?.status === "processing") {
      return false;
    }
    if (existing?.status === "failed") {
      await this.db
        .update(stripeWebhookEvents)
        .set({
          status: "processing",
          error: null,
          payloadReference: input.payloadReference,
          updatedAt: new Date(),
        })
        .where(eq(stripeWebhookEvents.eventId, input.eventId));
      return true;
    }

    const inserted = await this.db
      .insert(stripeWebhookEvents)
      .values({
        eventId: input.eventId,
        eventType: input.eventType,
        status: "processing",
        payloadReference: input.payloadReference,
        error: input.error ?? null,
      })
      .onConflictDoNothing({ target: stripeWebhookEvents.eventId })
      .returning();
    return inserted.length === 1;
  }

  async complete(eventId: string): Promise<void> {
    this.requireTransaction();
    await this.db
      .update(stripeWebhookEvents)
      .set({
        status: "completed",
        completedAt: new Date(),
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(stripeWebhookEvents.eventId, eventId));
  }

  async fail(eventId: string, error: Record<string, unknown>): Promise<void> {
    this.requireTransaction();
    await this.db
      .update(stripeWebhookEvents)
      .set({ status: "failed", error, updatedAt: new Date() })
      .where(eq(stripeWebhookEvents.eventId, eventId));
  }
}
