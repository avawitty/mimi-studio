export type CreditAccountOwner =
  | { kind: "user"; userId: string }
  | { kind: "workspace"; workspaceId: string };

export type CreditReservationStatus =
  | "active"
  | "committed"
  | "released"
  | "expired";

export type CreditLedgerEntryType =
  | "grant"
  | "purchase"
  | "reserve"
  | "release"
  | "consume"
  | "refund"
  | "expire"
  | "adjustment"
  | "migration";

export interface CreditAccount {
  id: string;
  owner: CreditAccountOwner;
  currency: "mimi_credit";
  available: bigint;
  reserved: bigint;
  version: bigint;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditGrant {
  id: string;
  accountId: string;
  source: "plan" | "purchase" | "promotion" | "migration" | "support";
  originalAmount: bigint;
  remainingAmount: bigint;
  expiresAt: Date | null;
  externalReference: string | null;
  createdAt: Date;
}

export interface CreditReservation {
  id: string;
  accountId: string;
  operationId: string;
  estimatedAmount: bigint;
  committedAmount: bigint | null;
  status: CreditReservationStatus;
  idempotencyKey: string;
  workflowRunId: string;
  aiRunId: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditLedgerEntry {
  id: string;
  accountId: string;
  entryType: CreditLedgerEntryType;
  amount: bigint;
  grantBucketId: string | null;
  reservationId: string | null;
  operationId: string | null;
  workflowRunId: string | null;
  aiRunId: string | null;
  externalReference: string | null;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CreditBalance {
  accountId: string;
  available: bigint;
  reserved: bigint;
  version: bigint;
  grants: CreditGrant[];
}

export interface CreateReservationInput {
  accountId: string;
  operationId: string;
  estimatedCredits: bigint;
  idempotencyKey: string;
  workflowRunId: string;
  aiRunId: string;
  expiresAt: Date;
}

export interface CommitReservationInput {
  reservationId: string;
  actualCredits: bigint;
  maximumCredits: bigint;
  aiRunId: string;
  usage: Record<string, unknown>;
  idempotencyKey: string;
}

export interface ReleaseReservationInput {
  reservationId: string;
  reason:
    | "provider_failure"
    | "invalid_output"
    | "canceled"
    | "expired"
    | "internal_error";
  idempotencyKey: string;
}

export interface IssueCreditGrantInput {
  accountId: string;
  source: CreditGrant["source"];
  amount: bigint;
  expiresAt?: Date | null;
  externalReference?: string | null;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}
