export type CanonicalPlan = "free" | "trial" | "creator" | "studio" | "team";

export type MembershipStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "expired";

export type MembershipProvider = "stripe" | "manual" | "internal";

export interface Membership {
  id: string;
  userId: string | null;
  workspaceId: string | null;
  plan: CanonicalPlan;
  status: MembershipStatus;
  provider: MembershipProvider;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  providerEventId: string | null;
  providerEventCreatedAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplyMembershipInput {
  userId?: string | null;
  workspaceId?: string | null;
  plan: CanonicalPlan;
  status: MembershipStatus;
  provider: MembershipProvider;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerEventId?: string | null;
  providerEventCreatedAt?: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
}

export interface StripeEventClaim {
  eventId: string;
  eventType: string;
  status: "processing" | "completed" | "failed";
  payloadReference: Record<string, unknown>;
  error?: Record<string, unknown> | null;
}
