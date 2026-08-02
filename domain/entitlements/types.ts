import type { CanonicalPlan } from "../memberships/types.js";

export type EntitlementValue = boolean | number | string | string[];

export interface EffectiveEntitlements {
  plan: CanonicalPlan;
  values: Readonly<Record<string, EntitlementValue>>;
  periodEndsAt: Date | null;
}

export interface EntitlementDecision {
  allowed: boolean;
  entitlement: string;
  plan: CanonicalPlan;
  reason?: "ENTITLEMENT_REQUIRED" | "PAYMENT_STATE_UNRESOLVED";
}

export interface PlanGrantDefinition {
  credits: bigint;
  expiresWithMembershipPeriod: boolean;
}
