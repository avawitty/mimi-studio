import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { CanonicalPlan, MembershipStatus } from "../../../domain/memberships/types.js";

export const mimi = pgSchema("mimi");

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const profiles = mimi.table("profiles", {
  id: text("id").primaryKey(),
  displayName: text("display_name"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const workspaces = mimi.table(
  "workspaces",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("workspaces_owner_idx").on(table.ownerId)],
);

export const workspaceMembers = mimi.table(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role").$type<"owner" | "admin" | "editor" | "viewer">().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_members_user_idx").on(table.userId),
    check("workspace_members_role_check", sql`${table.role} in ('owner', 'admin', 'editor', 'viewer')`),
  ],
);

export const memberships = mimi.table(
  "memberships",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => profiles.id, { onDelete: "cascade" }),
    plan: text("plan").$type<CanonicalPlan>().notNull(),
    status: text("status").$type<MembershipStatus>().notNull(),
    provider: text("provider").$type<"stripe" | "manual" | "internal">().notNull(),
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),
    providerEventId: text("provider_event_id"),
    providerEventCreatedAt: timestamp("provider_event_created_at", {
      withTimezone: true,
    }),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("memberships_user_unique")
      .on(table.userId)
      .where(sql`${table.userId} is not null`),
    uniqueIndex("memberships_workspace_unique")
      .on(table.workspaceId)
      .where(sql`${table.workspaceId} is not null`),
    uniqueIndex("memberships_provider_subscription_unique")
      .on(table.providerSubscriptionId)
      .where(sql`${table.providerSubscriptionId} is not null`),
    index("memberships_provider_customer_idx").on(table.providerCustomerId),
    check(
      "memberships_owner_check",
      sql`num_nonnulls(${table.userId}, ${table.workspaceId}) = 1`,
    ),
    check(
      "memberships_plan_check",
      sql`${table.plan} in ('free', 'trial', 'creator', 'studio', 'team')`,
    ),
    check(
      "memberships_status_check",
      sql`${table.status} in ('active', 'trialing', 'past_due', 'canceled', 'expired')`,
    ),
  ],
);

export const entitlementDefinitions = mimi.table("entitlement_definitions", {
  key: text("key").primaryKey(),
  description: text("description").notNull(),
  valueType: text("value_type").notNull(),
  createdAt: createdAt(),
});

export const planEntitlements = mimi.table(
  "plan_entitlements",
  {
    plan: text("plan").$type<CanonicalPlan>().notNull(),
    entitlementKey: text("entitlement_key")
      .notNull()
      .references(() => entitlementDefinitions.key, { onDelete: "cascade" }),
    value: jsonb("value").$type<boolean | number | string | string[]>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.plan, table.entitlementKey] })],
);

export const entitlementOverrides = mimi.table(
  "entitlement_overrides",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id").references(() => profiles.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    entitlementKey: text("entitlement_key")
      .notNull()
      .references(() => entitlementDefinitions.key, { onDelete: "cascade" }),
    value: jsonb("value").$type<boolean | number | string | string[]>().notNull(),
    reason: text("reason").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("entitlement_overrides_user_idx").on(table.userId),
    index("entitlement_overrides_workspace_idx").on(table.workspaceId),
    check(
      "entitlement_overrides_owner_check",
      sql`num_nonnulls(${table.userId}, ${table.workspaceId}) = 1`,
    ),
  ],
);

export const creditAccounts = mimi.table(
  "credit_accounts",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id").references(() => profiles.id, { onDelete: "restrict" }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "restrict" }),
    currency: text("currency").$type<"mimi_credit">().notNull().default("mimi_credit"),
    availableBalance: bigint("available_balance", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    reservedBalance: bigint("reserved_balance", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    version: bigint("version", { mode: "bigint" }).notNull().default(sql`0`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("credit_accounts_user_unique")
      .on(table.userId)
      .where(sql`${table.userId} is not null`),
    uniqueIndex("credit_accounts_workspace_unique")
      .on(table.workspaceId)
      .where(sql`${table.workspaceId} is not null`),
    check(
      "credit_accounts_owner_check",
      sql`num_nonnulls(${table.userId}, ${table.workspaceId}) = 1`,
    ),
    check("credit_accounts_available_nonnegative", sql`${table.availableBalance} >= 0`),
    check("credit_accounts_reserved_nonnegative", sql`${table.reservedBalance} >= 0`),
  ],
);

export const creditGrantBuckets = mimi.table(
  "credit_grant_buckets",
  {
    id: uuid("id").primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => creditAccounts.id, { onDelete: "restrict" }),
    source: text("source")
      .$type<"plan" | "purchase" | "promotion" | "migration" | "support">()
      .notNull(),
    originalAmount: bigint("original_amount", { mode: "bigint" }).notNull(),
    remainingAmount: bigint("remaining_amount", { mode: "bigint" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    externalReference: text("external_reference"),
    createdAt: createdAt(),
  },
  (table) => [
    index("credit_grant_buckets_spend_idx").on(
      table.accountId,
      table.expiresAt,
      table.createdAt,
    ),
    check("credit_grant_original_positive", sql`${table.originalAmount} > 0`),
    check("credit_grant_remaining_nonnegative", sql`${table.remainingAmount} >= 0`),
    check(
      "credit_grant_remaining_lte_original",
      sql`${table.remainingAmount} <= ${table.originalAmount}`,
    ),
  ],
);

export const workflowRuns = mimi.table(
  "workflow_runs",
  {
    id: uuid("id").primaryKey(),
    actorId: text("actor_id").notNull(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "restrict" }),
    chamber: text("chamber").notNull(),
    workflowType: text("workflow_type").notNull(),
    workflowVersion: integer("workflow_version").notNull(),
    status: text("status").notNull(),
    currentStep: text("current_step"),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    inputReference: jsonb("input_reference").$type<Record<string, unknown>>().notNull(),
    resultReference: jsonb("result_reference").$type<Record<string, unknown>>(),
    errorCode: text("error_code"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("workflow_runs_actor_idempotency_unique").on(
      table.actorId,
      table.idempotencyKey,
    ),
    index("workflow_runs_actor_created_idx").on(table.actorId, table.createdAt),
    check(
      "workflow_runs_status_check",
      sql`${table.status} in ('queued', 'running', 'awaiting_approval', 'succeeded', 'failed', 'canceled')`,
    ),
  ],
);

export const creditReservations = mimi.table(
  "credit_reservations",
  {
    id: uuid("id").primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => creditAccounts.id, { onDelete: "restrict" }),
    operationId: text("operation_id").notNull(),
    estimatedAmount: bigint("estimated_amount", { mode: "bigint" }).notNull(),
    committedAmount: bigint("committed_amount", { mode: "bigint" }),
    status: text("status").$type<"active" | "committed" | "released" | "expired">().notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    workflowRunId: uuid("workflow_run_id")
      .notNull()
      .references(() => workflowRuns.id, { onDelete: "restrict" }),
    aiRunId: uuid("ai_run_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("credit_reservations_account_idempotency_unique").on(
      table.accountId,
      table.idempotencyKey,
    ),
    index("credit_reservations_active_expiry_idx").on(table.status, table.expiresAt),
    check("credit_reservations_estimate_positive", sql`${table.estimatedAmount} > 0`),
    check(
      "credit_reservations_status_check",
      sql`${table.status} in ('active', 'committed', 'released', 'expired')`,
    ),
  ],
);

export const aiRuns = mimi.table(
  "ai_runs",
  {
    id: uuid("id").primaryKey(),
    workflowRunId: uuid("workflow_run_id")
      .notNull()
      .references(() => workflowRuns.id, { onDelete: "restrict" }),
    actorId: text("actor_id").notNull(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "restrict" }),
    operationId: text("operation_id").notNull(),
    operationVersion: integer("operation_version").notNull(),
    status: text("status").notNull(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => creditReservations.id, { onDelete: "restrict" }),
    routingPolicy: text("routing_policy").notNull(),
    promptId: text("prompt_id").notNull(),
    promptVersion: integer("prompt_version").notNull(),
    inputReference: jsonb("input_reference").$type<Record<string, unknown>>().notNull(),
    outputReference: jsonb("output_reference").$type<Record<string, unknown>>(),
    normalizedUsage: jsonb("normalized_usage").$type<Record<string, unknown>>(),
    chargedCredits: bigint("charged_credits", { mode: "bigint" }),
    errorCode: text("error_code"),
    errorMetadata: jsonb("error_metadata").$type<Record<string, unknown>>(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("ai_runs_reservation_unique").on(table.reservationId),
    index("ai_runs_workflow_idx").on(table.workflowRunId),
    index("ai_runs_operation_created_idx").on(table.operationId, table.createdAt),
    check(
      "ai_runs_status_check",
      sql`${table.status} in ('queued', 'running', 'awaiting_approval', 'succeeded', 'failed', 'canceled')`,
    ),
  ],
);

export const aiProviderAttempts = mimi.table(
  "ai_provider_attempts",
  {
    id: uuid("id").primaryKey(),
    aiRunId: uuid("ai_run_id")
      .notNull()
      .references(() => aiRuns.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    status: text("status").notNull(),
    providerRequestId: text("provider_request_id"),
    usage: jsonb("usage").$type<Record<string, unknown>>(),
    costUsd: numeric("cost_usd", { precision: 18, scale: 8 }),
    latencyMs: integer("latency_ms"),
    errorCode: text("error_code"),
    errorMetadata: jsonb("error_metadata").$type<Record<string, unknown>>(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("ai_provider_attempts_run_number_unique").on(
      table.aiRunId,
      table.attemptNumber,
    ),
  ],
);

export const operationResults = mimi.table(
  "operation_results",
  {
    id: uuid("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    workflowRunId: uuid("workflow_run_id")
      .notNull()
      .references(() => workflowRuns.id, { onDelete: "restrict" }),
    aiRunId: uuid("ai_run_id")
      .notNull()
      .references(() => aiRuns.id, { onDelete: "restrict" }),
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    contentHash: text("content_hash").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("operation_results_workflow_unique").on(table.workflowRunId),
    uniqueIndex("operation_results_ai_run_unique").on(table.aiRunId),
    index("operation_results_owner_created_idx").on(table.ownerId, table.createdAt),
  ],
);

export const creditLedgerEntries = mimi.table(
  "credit_ledger_entries",
  {
    id: uuid("id").primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => creditAccounts.id, { onDelete: "restrict" }),
    entryType: text("entry_type").notNull(),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    grantBucketId: uuid("grant_bucket_id").references(() => creditGrantBuckets.id, {
      onDelete: "restrict",
    }),
    reservationId: uuid("reservation_id").references(() => creditReservations.id, {
      onDelete: "restrict",
    }),
    operationId: text("operation_id"),
    workflowRunId: uuid("workflow_run_id").references(() => workflowRuns.id, {
      onDelete: "restrict",
    }),
    aiRunId: uuid("ai_run_id").references(() => aiRuns.id, { onDelete: "restrict" }),
    externalReference: text("external_reference"),
    idempotencyKey: text("idempotency_key").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("credit_ledger_account_idempotency_unique").on(
      table.accountId,
      table.idempotencyKey,
    ),
    index("credit_ledger_account_created_idx").on(table.accountId, table.createdAt),
    index("credit_ledger_reservation_idx").on(table.reservationId),
    check(
      "credit_ledger_entry_type_check",
      sql`${table.entryType} in ('grant', 'purchase', 'reserve', 'release', 'consume', 'refund', 'expire', 'adjustment', 'migration')`,
    ),
  ],
);

export const workflowSteps = mimi.table(
  "workflow_steps",
  {
    id: uuid("id").primaryKey(),
    workflowRunId: uuid("workflow_run_id")
      .notNull()
      .references(() => workflowRuns.id, { onDelete: "cascade" }),
    stepKey: text("step_key").notNull(),
    sequence: integer("sequence").notNull(),
    status: text("status").notNull(),
    inputReference: jsonb("input_reference").$type<Record<string, unknown>>(),
    outputReference: jsonb("output_reference").$type<Record<string, unknown>>(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("workflow_steps_run_key_unique").on(table.workflowRunId, table.stepKey),
  ],
);

export const artifacts = mimi.table(
  "artifacts",
  {
    id: uuid("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "restrict" }),
    chamber: text("chamber").notNull(),
    artifactType: text("artifact_type").notNull(),
    title: text("title").notNull(),
    status: text("status").$type<"draft" | "approved" | "archived">().notNull(),
    currentVersionId: uuid("current_version_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("artifacts_owner_updated_idx").on(table.ownerId, table.updatedAt)],
);

export const artifactVersions = mimi.table(
  "artifact_versions",
  {
    id: uuid("id").primaryKey(),
    artifactId: uuid("artifact_id")
      .notNull()
      .references(() => artifacts.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    createdBy: text("created_by").notNull(),
    workflowRunId: uuid("workflow_run_id").references(() => workflowRuns.id, {
      onDelete: "restrict",
    }),
    aiRunId: uuid("ai_run_id").references(() => aiRuns.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("artifact_versions_artifact_version_unique").on(
      table.artifactId,
      table.version,
    ),
  ],
);

export const sources = mimi.table(
  "sources",
  {
    id: uuid("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    projectId: text("project_id"),
    sourceType: text("source_type").notNull(),
    storageReference: jsonb("storage_reference").$type<Record<string, unknown>>().notNull(),
    contentHash: text("content_hash").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("sources_owner_hash_unique").on(table.ownerId, table.contentHash),
    index("sources_owner_created_idx").on(table.ownerId, table.createdAt),
  ],
);

export const memoryProposals = mimi.table(
  "memory_proposals",
  {
    id: uuid("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    projectId: text("project_id"),
    sourceId: uuid("source_id").references(() => sources.id, { onDelete: "restrict" }),
    aiRunId: uuid("ai_run_id")
      .notNull()
      .references(() => aiRuns.id, { onDelete: "restrict" }),
    proposalType: text("proposal_type").notNull(),
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    status: text("status")
      .$type<"proposed" | "approved" | "rejected" | "superseded">()
      .notNull()
      .default("proposed"),
    createdAt: createdAt(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [
    index("memory_proposals_owner_status_idx").on(
      table.ownerId,
      table.status,
      table.createdAt,
    ),
  ],
);

export const memoryAtoms = mimi.table(
  "memory_atoms",
  {
    id: uuid("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    projectId: text("project_id"),
    proposalId: uuid("proposal_id").references(() => memoryProposals.id, {
      onDelete: "restrict",
    }),
    atomType: text("atom_type").notNull(),
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    confidence: numeric("confidence", { precision: 5, scale: 4 }),
    status: text("status").$type<"active" | "archived" | "superseded">().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("memory_atoms_proposal_unique")
      .on(table.proposalId)
      .where(sql`${table.proposalId} is not null`),
    index("memory_atoms_owner_status_idx").on(table.ownerId, table.status, table.updatedAt),
  ],
);

export const provenanceEdges = mimi.table(
  "provenance_edges",
  {
    id: uuid("id").primaryKey(),
    fromEntityType: text("from_entity_type").notNull(),
    fromEntityId: uuid("from_entity_id").notNull(),
    toEntityType: text("to_entity_type").notNull(),
    toEntityId: uuid("to_entity_id").notNull(),
    relationship: text("relationship").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    index("provenance_edges_from_idx").on(table.fromEntityType, table.fromEntityId),
    index("provenance_edges_to_idx").on(table.toEntityType, table.toEntityId),
  ],
);

export const stripeWebhookEvents = mimi.table("stripe_webhook_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  status: text("status").$type<"processing" | "completed" | "failed">().notNull(),
  payloadReference: jsonb("payload_reference").$type<Record<string, unknown>>().notNull(),
  error: jsonb("error").$type<Record<string, unknown>>(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: updatedAt(),
});

export const memoryApprovalCommands = mimi.table(
  "memory_approval_commands",
  {
    id: uuid("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    projectId: text("project_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    proposalIds: jsonb("proposal_ids").$type<string[]>().notNull(),
    atomIds: jsonb("atom_ids").$type<string[]>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("memory_approval_owner_idempotency_unique").on(
      table.ownerId,
      table.idempotencyKey,
    ),
  ],
);

export const legacyRecordMap = mimi.table(
  "legacy_record_map",
  {
    id: uuid("id").primaryKey(),
    legacySystem: text("legacy_system").notNull(),
    legacyCollection: text("legacy_collection").notNull(),
    legacyId: text("legacy_id").notNull(),
    canonicalTable: text("canonical_table").notNull(),
    canonicalId: uuid("canonical_id").notNull(),
    migrationStatus: text("migration_status").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("legacy_record_map_source_unique").on(
      table.legacySystem,
      table.legacyCollection,
      table.legacyId,
    ),
  ],
);

export const auditEvents = mimi.table(
  "audit_events",
  {
    id: uuid("id").primaryKey(),
    actorId: text("actor_id"),
    workspaceId: uuid("workspace_id"),
    eventType: text("event_type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    reason: text("reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    index("audit_events_entity_idx").on(table.entityType, table.entityId, table.createdAt),
  ],
);

export const tasteCalibrationSessions = mimi.table(
  "taste_calibration_sessions",
  {
    id: uuid("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "set null",
    }),
    projectId: text("project_id"),
    status: text("status")
      .$type<"active" | "paused" | "completed" | "abandoned">()
      .notNull()
      .default("active"),
    targetQuestionCount: integer("target_question_count").notNull().default(10),
    answeredCount: integer("answered_count").notNull().default(0),
    seed: text("seed").notNull(),
    algorithmVersion: text("algorithm_version").notNull(),
    baselineSnapshotId: text("baseline_snapshot_id"),
    currentSnapshotId: text("current_snapshot_id"),
    currentModelState: jsonb("current_model_state").$type<Record<string, unknown>>(),
    scope: text("scope")
      .$type<"persistent" | "project" | "session">()
      .notNull()
      .default("project"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("taste_calibration_sessions_owner_created_idx").on(
      table.ownerId,
      table.createdAt,
    ),
    index("taste_calibration_sessions_project_idx").on(table.projectId),
    index("taste_calibration_sessions_active_idx").on(
      table.ownerId,
      table.status,
      table.projectId,
    ),
    check(
      "taste_calibration_sessions_status_check",
      sql`${table.status} in ('active', 'paused', 'completed', 'abandoned')`,
    ),
    check(
      "taste_calibration_sessions_scope_check",
      sql`${table.scope} in ('persistent', 'project', 'session')`,
    ),
  ],
);

export const tasteCalibrationPairs = mimi.table(
  "taste_calibration_pairs",
  {
    id: uuid("id").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => tasteCalibrationSessions.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    pairIndex: integer("pair_index").notNull(),
    leftCandidateId: text("left_candidate_id").notNull(),
    rightCandidateId: text("right_candidate_id").notNull(),
    isolatedFeatureIds: jsonb("isolated_feature_ids").$type<string[]>().notNull(),
    selectionReason: jsonb("selection_reason").$type<Record<string, unknown>>().notNull(),
    predictedLeftPreference: numeric("predicted_left_preference", {
      precision: 8,
      scale: 6,
    }).notNull(),
    expectedInformationGain: numeric("expected_information_gain", {
      precision: 8,
      scale: 6,
    }).notNull(),
    askedAt: timestamp("asked_at", { withTimezone: true }).notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    index("taste_calibration_pairs_session_idx").on(table.sessionId, table.pairIndex),
    uniqueIndex("taste_calibration_pairs_session_pair_unique").on(
      table.sessionId,
      table.pairIndex,
    ),
  ],
);

export const tastePairwiseJudgments = mimi.table(
  "taste_pairwise_judgments",
  {
    id: uuid("id").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => tasteCalibrationSessions.id, { onDelete: "cascade" }),
    pairId: uuid("pair_id")
      .notNull()
      .references(() => tasteCalibrationPairs.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    choice: text("choice")
      .$type<"left" | "right" | "both" | "neither" | "skip">()
      .notNull(),
    decidingFeatureIds: jsonb("deciding_feature_ids").$type<string[]>().notNull(),
    correctionNote: text("correction_note"),
    scope: text("scope")
      .$type<"persistent" | "project" | "session">()
      .notNull(),
    projectId: text("project_id"),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("taste_pairwise_judgments_session_idx").on(table.sessionId, table.answeredAt),
    uniqueIndex("taste_pairwise_judgments_pair_unique").on(table.pairId),
    check(
      "taste_pairwise_judgments_choice_check",
      sql`${table.choice} in ('left', 'right', 'both', 'neither', 'skip')`,
    ),
    check(
      "taste_pairwise_judgments_scope_check",
      sql`${table.scope} in ('persistent', 'project', 'session')`,
    ),
  ],
);

export const neonSchema = {
  profiles,
  workspaces,
  workspaceMembers,
  memberships,
  entitlementDefinitions,
  planEntitlements,
  entitlementOverrides,
  creditAccounts,
  creditGrantBuckets,
  creditReservations,
  creditLedgerEntries,
  workflowRuns,
  workflowSteps,
  aiRuns,
  aiProviderAttempts,
  operationResults,
  artifacts,
  artifactVersions,
  sources,
  memoryProposals,
  memoryAtoms,
  provenanceEdges,
  stripeWebhookEvents,
  memoryApprovalCommands,
  legacyRecordMap,
  auditEvents,
  tasteCalibrationSessions,
  tasteCalibrationPairs,
  tastePairwiseJudgments,
};
