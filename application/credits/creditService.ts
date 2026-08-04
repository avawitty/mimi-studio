import type { DatabaseRepositories, UnitOfWork } from "../../domain/database.js";
import type {
  CreditAccountOwner,
  CreditBalance,
} from "../../domain/credits/types.js";
import type {
  EffectiveEntitlements,
  EntitlementDecision,
  EntitlementValue,
  PlanGrantDefinition,
} from "../../domain/entitlements/types.js";
import type {
  CanonicalPlan,
  Membership,
  MembershipStatus,
} from "../../domain/memberships/types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const envCredits = (key: string, fallback: bigint): bigint => {
  const value = process.env[key];
  if (!value) return fallback;
  try {
    const parsed = BigInt(value);
    return parsed >= 0n ? parsed : fallback;
  } catch {
    return fallback;
  }
};

export const PLAN_GRANTS: Record<CanonicalPlan, PlanGrantDefinition> = {
  free: {
    credits: envCredits("MIMI_FREE_MONTHLY_CREDITS", 25n),
    expiresWithMembershipPeriod: true,
  },
  trial: {
    credits: envCredits("MIMI_TRIAL_CREDITS", 150n),
    expiresWithMembershipPeriod: true,
  },
  creator: {
    credits: envCredits("MIMI_CREATOR_MONTHLY_CREDITS", 1_500n),
    expiresWithMembershipPeriod: true,
  },
  studio: {
    credits: envCredits("MIMI_STUDIO_MONTHLY_CREDITS", 10_000n),
    expiresWithMembershipPeriod: true,
  },
  team: {
    credits: envCredits("MIMI_TEAM_MONTHLY_CREDITS", 30_000n),
    expiresWithMembershipPeriod: true,
  },
};

const BASE_ENTITLEMENTS: Record<CanonicalPlan, Record<string, EntitlementValue>> = {
  free: {
    "ai.scribe.propose": true,
    "ai.image.generate": false,
    "ai.deep.search": false,
    "workspace.team": false,
  },
  trial: {
    "ai.scribe.propose": true,
    "ai.image.generate": true,
    "ai.deep.search": false,
    "workspace.team": false,
  },
  creator: {
    "ai.scribe.propose": true,
    "ai.image.generate": true,
    "ai.deep.search": true,
    "workspace.team": false,
  },
  studio: {
    "ai.scribe.propose": true,
    "ai.image.generate": true,
    "ai.deep.search": true,
    "workspace.team": false,
  },
  team: {
    "ai.scribe.propose": true,
    "ai.image.generate": true,
    "ai.deep.search": true,
    "workspace.team": true,
  },
};

export function canonicalPlanFromLegacy(value: unknown): CanonicalPlan {
  const normalized = String(value || "free").trim().toLowerCase();
  switch (normalized) {
    case "trial":
    case "on_trial":
    case "on trial":
      return "trial";
    case "creator":
    case "initiation":
    case "core":
    case "starter":
    case "optioning":
    case "option":
    case "member":
      return "creator";
    case "studio":
    case "atelier":
    case "pro":
    case "lab":
    case "sovereign":
    case "agency":
    case "enterprise":
      return "studio";
    case "team":
      return "team";
    case "free":
    case "ghost":
    default:
      return "free";
  }
}

function isMembershipUsable(status: MembershipStatus): boolean {
  switch (status) {
    case "active":
    case "trialing":
      return true;
    case "past_due":
    case "canceled":
    case "expired":
      return false;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function utcMonthWindow(now = new Date()): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

function membershipWindow(membership: Membership): { start: Date; end: Date } {
  const fallback = utcMonthWindow();
  return {
    start: membership.currentPeriodStart ?? fallback.start,
    end: membership.currentPeriodEnd ?? fallback.end,
  };
}

export class CreditService {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async resolveMembership(
    repositories: DatabaseRepositories,
    actorId: string,
    workspaceId?: string,
  ): Promise<Membership> {
    if (workspaceId) {
      const role = await repositories.memberships.getWorkspaceRole(
        actorId,
        workspaceId,
      );
      if (!role || role === "viewer") {
        throw Object.assign(new Error("Workspace access is denied."), {
          code: "SOURCE_ACCESS_DENIED",
          status: 403,
        });
      }
      const workspaceMembership =
        await repositories.memberships.findForWorkspace(workspaceId);
      if (!workspaceMembership) {
        throw Object.assign(new Error("Workspace membership is not configured."), {
          code: "PAYMENT_STATE_UNRESOLVED",
          status: 409,
        });
      }
      return workspaceMembership;
    }

    return (
      (await repositories.memberships.findForUser(actorId)) ??
      (await repositories.memberships.ensureFreeMembership(actorId))
    );
  }

  resolveEntitlements(membership: Membership): EffectiveEntitlements {
    return {
      plan: membership.plan,
      values: BASE_ENTITLEMENTS[membership.plan],
      periodEndsAt: membership.currentPeriodEnd,
    };
  }

  authorize(membership: Membership, entitlement: string): EntitlementDecision {
    if (!isMembershipUsable(membership.status)) {
      return {
        allowed: false,
        entitlement,
        plan: membership.plan,
        reason: "PAYMENT_STATE_UNRESOLVED",
      };
    }
    const allowed = this.resolveEntitlements(membership).values[entitlement] === true;
    return {
      allowed,
      entitlement,
      plan: membership.plan,
      ...(allowed ? {} : { reason: "ENTITLEMENT_REQUIRED" as const }),
    };
  }

  async ensureAccountAndGrant(
    repositories: DatabaseRepositories,
    actorId: string,
    membership: Membership,
    workspaceId?: string,
  ) {
    const account = await this.ensureAccount(
      repositories,
      actorId,
      workspaceId,
    );
    const grant = PLAN_GRANTS[membership.plan];
    const period =
      membership.plan === "free"
        ? utcMonthWindow()
        : membershipWindow(membership);
    if (
      (membership.provider !== "stripe" || membership.plan === "free") &&
      isMembershipUsable(membership.status) &&
      grant.credits > 0n
    ) {
      await repositories.credits.issueGrant({
        accountId: account.id,
        source: "plan",
        amount: grant.credits,
        expiresAt: grant.expiresWithMembershipPeriod ? period.end : null,
        externalReference: membership.id,
        idempotencyKey: `plan:${membership.id}:${period.start.toISOString()}`,
        metadata: {
          plan: membership.plan,
          periodStart: period.start.toISOString(),
          periodEnd: period.end.toISOString(),
        },
      });
    }
    return account;
  }

  async ensureAccount(
    repositories: DatabaseRepositories,
    actorId: string,
    workspaceId?: string,
  ) {
    const owner: CreditAccountOwner = workspaceId
      ? { kind: "workspace", workspaceId }
      : { kind: "user", userId: actorId };
    const account = await repositories.credits.getOrCreateAccount(owner);
    await repositories.credits.expireEligibleGrants(account.id);
    return account;
  }

  async getSummary(actorId: string, workspaceId?: string): Promise<{
    balance: CreditBalance;
    membership: Membership;
  }> {
    const prepared = await this.unitOfWork.transaction(async (repositories) => {
      const membership = await this.resolveMembership(
        repositories,
        actorId,
        workspaceId,
      );
      const account = await this.ensureAccountAndGrant(
        repositories,
        actorId,
        membership,
        workspaceId,
      );
      return { accountId: account.id, membership };
    });
    const balance = await this.unitOfWork.repositories.credits.getBalance(
      prepared.accountId,
    );
    return { balance, membership: prepared.membership };
  }
}

export const DEFAULT_RESERVATION_TTL_MS = 10 * 60 * 1000;
export const DEFAULT_TRIAL_PERIOD_MS = 30 * DAY_MS;
