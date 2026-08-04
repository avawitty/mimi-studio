import type {
  ApplyMembershipInput,
  Membership,
  StripeEventClaim,
} from "./types.js";

export interface MembershipRepository {
  findForUser(userId: string): Promise<Membership | null>;
  findForWorkspace(workspaceId: string): Promise<Membership | null>;
  findByProviderCustomerId(customerId: string): Promise<Membership | null>;
  upsert(input: ApplyMembershipInput): Promise<Membership>;
  ensureFreeMembership(userId: string): Promise<Membership>;
  getWorkspaceRole(
    userId: string,
    workspaceId: string,
  ): Promise<"owner" | "admin" | "editor" | "viewer" | null>;
}

export interface StripeEventRepository {
  get(eventId: string): Promise<StripeEventClaim | null>;
  claim(input: Omit<StripeEventClaim, "status">): Promise<boolean>;
  complete(eventId: string): Promise<void>;
  fail(eventId: string, error: Record<string, unknown>): Promise<void>;
}
