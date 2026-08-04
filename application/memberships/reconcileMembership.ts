import type { UnitOfWork } from "../../domain/database.js";
import type {
  CanonicalPlan,
  MembershipStatus,
} from "../../domain/memberships/types.js";
import { CreditService } from "../credits/creditService.js";

export interface MembershipReconciliationEvent {
  eventId: string;
  eventType: string;
  userId?: string | null;
  plan: CanonicalPlan;
  status: MembershipStatus;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerEventCreatedAt: Date;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  grant?: {
    amount: bigint;
    idempotencyKey: string;
    expiresAt: Date | null;
    externalReference: string;
  };
  payloadReference: Record<string, unknown>;
}

export interface MembershipReconciliationResult {
  duplicate: boolean;
  membershipId?: string;
  userId?: string;
}

function safeFailure(error: unknown): Record<string, unknown> {
  return {
    name: error instanceof Error ? error.name : "UnknownError",
    message:
      error instanceof Error
        ? error.message.slice(0, 500)
        : String(error).slice(0, 500),
  };
}

export class MembershipReconciliationService {
  private readonly credits: CreditService;

  constructor(private readonly unitOfWork: UnitOfWork) {
    this.credits = new CreditService(unitOfWork);
  }

  async process(
    input: MembershipReconciliationEvent,
  ): Promise<MembershipReconciliationResult> {
    try {
      return await this.unitOfWork.transaction(async (repositories) => {
        const claimed = await repositories.stripeEvents.claim({
          eventId: input.eventId,
          eventType: input.eventType,
          payloadReference: input.payloadReference,
          error: null,
        });
        if (!claimed) return { duplicate: true };

        const existing = input.providerCustomerId
          ? await repositories.memberships.findByProviderCustomerId(
              input.providerCustomerId,
            )
          : null;
        const userId = input.userId || existing?.userId;
        if (!userId) {
          throw new Error(
            "Stripe event cannot be mapped to a Mimi authentication identity.",
          );
        }
        const staleMembershipEvent = Boolean(
          existing?.providerEventCreatedAt &&
          existing.providerEventCreatedAt > input.providerEventCreatedAt,
        );

        const membership =
          staleMembershipEvent && existing
            ? existing
            : await repositories.memberships.upsert({
                userId,
                plan: input.plan,
                status: input.status,
                provider: "stripe",
                providerCustomerId: input.providerCustomerId,
                providerSubscriptionId: input.providerSubscriptionId,
                providerEventId: input.eventId,
                providerEventCreatedAt: input.providerEventCreatedAt,
                currentPeriodStart: input.currentPeriodStart,
                currentPeriodEnd: input.currentPeriodEnd,
              });

        if (
          input.grant &&
          (input.status === "active" || input.status === "trialing")
        ) {
          const account = await this.credits.ensureAccount(
            repositories,
            userId,
          );
          await repositories.credits.issueGrant({
            accountId: account.id,
            source: "plan",
            amount: input.grant.amount,
            expiresAt: input.grant.expiresAt,
            externalReference: input.grant.externalReference,
            idempotencyKey: input.grant.idempotencyKey,
            metadata: {
              plan: membership.plan,
              stripeEventId: input.eventId,
              periodStart: input.currentPeriodStart?.toISOString() ?? null,
              periodEnd: input.currentPeriodEnd?.toISOString() ?? null,
            },
          });
        }
        await repositories.stripeEvents.complete(input.eventId);
        return {
          duplicate: false,
          membershipId: membership.id,
          userId,
        };
      });
    } catch (error) {
      try {
        await this.unitOfWork.transaction(async (repositories) => {
          const existing = await repositories.stripeEvents.get(input.eventId);
          if (!existing) {
            await repositories.stripeEvents.claim({
              eventId: input.eventId,
              eventType: input.eventType,
              payloadReference: input.payloadReference,
              error: null,
            });
          }
          await repositories.stripeEvents.fail(input.eventId, safeFailure(error));
        });
      } catch (recordError) {
        console.error("MIMI // Failed to record Stripe reconciliation error:", {
          eventId: input.eventId,
          error: safeFailure(recordError),
        });
      }
      throw error;
    }
  }
}
