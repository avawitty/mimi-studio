CREATE SCHEMA IF NOT EXISTS "mimi";
--> statement-breakpoint
CREATE TABLE "mimi"."ai_provider_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ai_run_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"status" text NOT NULL,
	"provider_request_id" text,
	"usage" jsonb,
	"cost_usd" numeric(18, 8),
	"latency_ms" integer,
	"error_code" text,
	"error_metadata" jsonb,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mimi"."ai_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workflow_run_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"workspace_id" uuid,
	"operation_id" text NOT NULL,
	"operation_version" integer NOT NULL,
	"status" text NOT NULL,
	"reservation_id" uuid NOT NULL,
	"routing_policy" text NOT NULL,
	"prompt_id" text NOT NULL,
	"prompt_version" integer NOT NULL,
	"input_reference" jsonb NOT NULL,
	"output_reference" jsonb,
	"normalized_usage" jsonb,
	"charged_credits" bigint,
	"error_code" text,
	"error_metadata" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_runs_status_check" CHECK ("mimi"."ai_runs"."status" in ('queued', 'running', 'awaiting_approval', 'succeeded', 'failed', 'canceled'))
);
--> statement-breakpoint
CREATE TABLE "mimi"."artifact_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"artifact_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"workflow_run_id" uuid,
	"ai_run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mimi"."artifacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"workspace_id" uuid,
	"chamber" text NOT NULL,
	"artifact_type" text NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"current_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mimi"."audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_id" text,
	"workspace_id" uuid,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mimi"."credit_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text,
	"workspace_id" uuid,
	"currency" text DEFAULT 'mimi_credit' NOT NULL,
	"available_balance" bigint DEFAULT 0 NOT NULL,
	"reserved_balance" bigint DEFAULT 0 NOT NULL,
	"version" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_accounts_owner_check" CHECK (num_nonnulls("mimi"."credit_accounts"."user_id", "mimi"."credit_accounts"."workspace_id") = 1),
	CONSTRAINT "credit_accounts_available_nonnegative" CHECK ("mimi"."credit_accounts"."available_balance" >= 0),
	CONSTRAINT "credit_accounts_reserved_nonnegative" CHECK ("mimi"."credit_accounts"."reserved_balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "mimi"."credit_grant_buckets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"source" text NOT NULL,
	"original_amount" bigint NOT NULL,
	"remaining_amount" bigint NOT NULL,
	"expires_at" timestamp with time zone,
	"external_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_grant_original_positive" CHECK ("mimi"."credit_grant_buckets"."original_amount" > 0),
	CONSTRAINT "credit_grant_remaining_nonnegative" CHECK ("mimi"."credit_grant_buckets"."remaining_amount" >= 0),
	CONSTRAINT "credit_grant_remaining_lte_original" CHECK ("mimi"."credit_grant_buckets"."remaining_amount" <= "mimi"."credit_grant_buckets"."original_amount")
);
--> statement-breakpoint
CREATE TABLE "mimi"."credit_ledger_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"entry_type" text NOT NULL,
	"amount" bigint NOT NULL,
	"grant_bucket_id" uuid,
	"reservation_id" uuid,
	"operation_id" text,
	"workflow_run_id" uuid,
	"ai_run_id" uuid,
	"external_reference" text,
	"idempotency_key" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_ledger_entry_type_check" CHECK ("mimi"."credit_ledger_entries"."entry_type" in ('grant', 'purchase', 'reserve', 'release', 'consume', 'refund', 'expire', 'adjustment', 'migration'))
);
--> statement-breakpoint
CREATE TABLE "mimi"."credit_reservations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"operation_id" text NOT NULL,
	"estimated_amount" bigint NOT NULL,
	"committed_amount" bigint,
	"status" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"workflow_run_id" uuid NOT NULL,
	"ai_run_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_reservations_estimate_positive" CHECK ("mimi"."credit_reservations"."estimated_amount" > 0),
	CONSTRAINT "credit_reservations_status_check" CHECK ("mimi"."credit_reservations"."status" in ('active', 'committed', 'released', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "mimi"."entitlement_definitions" (
	"key" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"value_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mimi"."entitlement_overrides" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text,
	"workspace_id" uuid,
	"entitlement_key" text NOT NULL,
	"value" jsonb NOT NULL,
	"reason" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlement_overrides_owner_check" CHECK (num_nonnulls("mimi"."entitlement_overrides"."user_id", "mimi"."entitlement_overrides"."workspace_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "mimi"."legacy_record_map" (
	"id" uuid PRIMARY KEY NOT NULL,
	"legacy_system" text NOT NULL,
	"legacy_collection" text NOT NULL,
	"legacy_id" text NOT NULL,
	"canonical_table" text NOT NULL,
	"canonical_id" uuid NOT NULL,
	"migration_status" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mimi"."memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid,
	"user_id" text,
	"plan" text NOT NULL,
	"status" text NOT NULL,
	"provider" text NOT NULL,
	"provider_customer_id" text,
	"provider_subscription_id" text,
	"provider_event_id" text,
	"provider_event_created_at" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_owner_check" CHECK (num_nonnulls("mimi"."memberships"."user_id", "mimi"."memberships"."workspace_id") = 1),
	CONSTRAINT "memberships_plan_check" CHECK ("mimi"."memberships"."plan" in ('free', 'trial', 'creator', 'studio', 'team')),
	CONSTRAINT "memberships_status_check" CHECK ("mimi"."memberships"."status" in ('active', 'trialing', 'past_due', 'canceled', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "mimi"."memory_approval_commands" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"project_id" text,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"proposal_ids" jsonb NOT NULL,
	"atom_ids" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mimi"."memory_atoms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"project_id" text,
	"proposal_id" uuid,
	"atom_type" text NOT NULL,
	"content" jsonb NOT NULL,
	"confidence" numeric(5, 4),
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mimi"."memory_proposals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"project_id" text,
	"source_id" uuid,
	"ai_run_id" uuid NOT NULL,
	"proposal_type" text NOT NULL,
	"content" jsonb NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mimi"."operation_results" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"workflow_run_id" uuid NOT NULL,
	"ai_run_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mimi"."plan_entitlements" (
	"plan" text NOT NULL,
	"entitlement_key" text NOT NULL,
	"value" jsonb NOT NULL,
	CONSTRAINT "plan_entitlements_plan_entitlement_key_pk" PRIMARY KEY("plan","entitlement_key")
);
--> statement-breakpoint
CREATE TABLE "mimi"."profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mimi"."provenance_edges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_entity_type" text NOT NULL,
	"from_entity_id" uuid NOT NULL,
	"to_entity_type" text NOT NULL,
	"to_entity_id" uuid NOT NULL,
	"relationship" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mimi"."sources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"project_id" text,
	"source_type" text NOT NULL,
	"storage_reference" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mimi"."stripe_webhook_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"status" text NOT NULL,
	"payload_reference" jsonb NOT NULL,
	"error" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mimi"."workflow_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"workspace_id" uuid,
	"chamber" text NOT NULL,
	"workflow_type" text NOT NULL,
	"workflow_version" integer NOT NULL,
	"status" text NOT NULL,
	"current_step" text,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"input_reference" jsonb NOT NULL,
	"result_reference" jsonb,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "workflow_runs_status_check" CHECK ("mimi"."workflow_runs"."status" in ('queued', 'running', 'awaiting_approval', 'succeeded', 'failed', 'canceled'))
);
--> statement-breakpoint
CREATE TABLE "mimi"."workflow_steps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workflow_run_id" uuid NOT NULL,
	"step_key" text NOT NULL,
	"sequence" integer NOT NULL,
	"status" text NOT NULL,
	"input_reference" jsonb,
	"output_reference" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mimi"."workspace_members" (
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id"),
	CONSTRAINT "workspace_members_role_check" CHECK ("mimi"."workspace_members"."role" in ('owner', 'admin', 'editor', 'viewer'))
);
--> statement-breakpoint
CREATE TABLE "mimi"."workspaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mimi"."ai_provider_attempts" ADD CONSTRAINT "ai_provider_attempts_ai_run_id_ai_runs_id_fk" FOREIGN KEY ("ai_run_id") REFERENCES "mimi"."ai_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."ai_runs" ADD CONSTRAINT "ai_runs_workflow_run_id_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "mimi"."workflow_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."ai_runs" ADD CONSTRAINT "ai_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "mimi"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."ai_runs" ADD CONSTRAINT "ai_runs_reservation_id_credit_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "mimi"."credit_reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."artifact_versions" ADD CONSTRAINT "artifact_versions_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "mimi"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."artifact_versions" ADD CONSTRAINT "artifact_versions_workflow_run_id_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "mimi"."workflow_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."artifact_versions" ADD CONSTRAINT "artifact_versions_ai_run_id_ai_runs_id_fk" FOREIGN KEY ("ai_run_id") REFERENCES "mimi"."ai_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."artifacts" ADD CONSTRAINT "artifacts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "mimi"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."credit_accounts" ADD CONSTRAINT "credit_accounts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "mimi"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."credit_accounts" ADD CONSTRAINT "credit_accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "mimi"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."credit_grant_buckets" ADD CONSTRAINT "credit_grant_buckets_account_id_credit_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "mimi"."credit_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_account_id_credit_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "mimi"."credit_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_grant_bucket_id_credit_grant_buckets_id_fk" FOREIGN KEY ("grant_bucket_id") REFERENCES "mimi"."credit_grant_buckets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_reservation_id_credit_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "mimi"."credit_reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_workflow_run_id_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "mimi"."workflow_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_ai_run_id_ai_runs_id_fk" FOREIGN KEY ("ai_run_id") REFERENCES "mimi"."ai_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."credit_reservations" ADD CONSTRAINT "credit_reservations_account_id_credit_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "mimi"."credit_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."credit_reservations" ADD CONSTRAINT "credit_reservations_workflow_run_id_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "mimi"."workflow_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."entitlement_overrides" ADD CONSTRAINT "entitlement_overrides_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "mimi"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."entitlement_overrides" ADD CONSTRAINT "entitlement_overrides_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "mimi"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."entitlement_overrides" ADD CONSTRAINT "entitlement_overrides_entitlement_key_entitlement_definitions_key_fk" FOREIGN KEY ("entitlement_key") REFERENCES "mimi"."entitlement_definitions"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."memberships" ADD CONSTRAINT "memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "mimi"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."memberships" ADD CONSTRAINT "memberships_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "mimi"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."memory_atoms" ADD CONSTRAINT "memory_atoms_proposal_id_memory_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "mimi"."memory_proposals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."memory_proposals" ADD CONSTRAINT "memory_proposals_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "mimi"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."memory_proposals" ADD CONSTRAINT "memory_proposals_ai_run_id_ai_runs_id_fk" FOREIGN KEY ("ai_run_id") REFERENCES "mimi"."ai_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."operation_results" ADD CONSTRAINT "operation_results_workflow_run_id_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "mimi"."workflow_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."operation_results" ADD CONSTRAINT "operation_results_ai_run_id_ai_runs_id_fk" FOREIGN KEY ("ai_run_id") REFERENCES "mimi"."ai_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."plan_entitlements" ADD CONSTRAINT "plan_entitlements_entitlement_key_entitlement_definitions_key_fk" FOREIGN KEY ("entitlement_key") REFERENCES "mimi"."entitlement_definitions"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."workflow_runs" ADD CONSTRAINT "workflow_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "mimi"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_run_id_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "mimi"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "mimi"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."workspace_members" ADD CONSTRAINT "workspace_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "mimi"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mimi"."workspaces" ADD CONSTRAINT "workspaces_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "mimi"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_provider_attempts_run_number_unique" ON "mimi"."ai_provider_attempts" USING btree ("ai_run_id","attempt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_runs_reservation_unique" ON "mimi"."ai_runs" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "ai_runs_workflow_idx" ON "mimi"."ai_runs" USING btree ("workflow_run_id");--> statement-breakpoint
CREATE INDEX "ai_runs_operation_created_idx" ON "mimi"."ai_runs" USING btree ("operation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "artifact_versions_artifact_version_unique" ON "mimi"."artifact_versions" USING btree ("artifact_id","version");--> statement-breakpoint
CREATE INDEX "artifacts_owner_updated_idx" ON "mimi"."artifacts" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "mimi"."audit_events" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_accounts_user_unique" ON "mimi"."credit_accounts" USING btree ("user_id") WHERE "mimi"."credit_accounts"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_accounts_workspace_unique" ON "mimi"."credit_accounts" USING btree ("workspace_id") WHERE "mimi"."credit_accounts"."workspace_id" is not null;--> statement-breakpoint
CREATE INDEX "credit_grant_buckets_spend_idx" ON "mimi"."credit_grant_buckets" USING btree ("account_id","expires_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_ledger_account_idempotency_unique" ON "mimi"."credit_ledger_entries" USING btree ("account_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "credit_ledger_account_created_idx" ON "mimi"."credit_ledger_entries" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_ledger_reservation_idx" ON "mimi"."credit_ledger_entries" USING btree ("reservation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_reservations_account_idempotency_unique" ON "mimi"."credit_reservations" USING btree ("account_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "credit_reservations_active_expiry_idx" ON "mimi"."credit_reservations" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "entitlement_overrides_user_idx" ON "mimi"."entitlement_overrides" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entitlement_overrides_workspace_idx" ON "mimi"."entitlement_overrides" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legacy_record_map_source_unique" ON "mimi"."legacy_record_map" USING btree ("legacy_system","legacy_collection","legacy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_unique" ON "mimi"."memberships" USING btree ("user_id") WHERE "mimi"."memberships"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_workspace_unique" ON "mimi"."memberships" USING btree ("workspace_id") WHERE "mimi"."memberships"."workspace_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_provider_subscription_unique" ON "mimi"."memberships" USING btree ("provider_subscription_id") WHERE "mimi"."memberships"."provider_subscription_id" is not null;--> statement-breakpoint
CREATE INDEX "memberships_provider_customer_idx" ON "mimi"."memberships" USING btree ("provider_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memory_approval_owner_idempotency_unique" ON "mimi"."memory_approval_commands" USING btree ("owner_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "memory_atoms_proposal_unique" ON "mimi"."memory_atoms" USING btree ("proposal_id") WHERE "mimi"."memory_atoms"."proposal_id" is not null;--> statement-breakpoint
CREATE INDEX "memory_atoms_owner_status_idx" ON "mimi"."memory_atoms" USING btree ("owner_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "memory_proposals_owner_status_idx" ON "mimi"."memory_proposals" USING btree ("owner_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "operation_results_workflow_unique" ON "mimi"."operation_results" USING btree ("workflow_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "operation_results_ai_run_unique" ON "mimi"."operation_results" USING btree ("ai_run_id");--> statement-breakpoint
CREATE INDEX "operation_results_owner_created_idx" ON "mimi"."operation_results" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "provenance_edges_from_idx" ON "mimi"."provenance_edges" USING btree ("from_entity_type","from_entity_id");--> statement-breakpoint
CREATE INDEX "provenance_edges_to_idx" ON "mimi"."provenance_edges" USING btree ("to_entity_type","to_entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_owner_hash_unique" ON "mimi"."sources" USING btree ("owner_id","content_hash");--> statement-breakpoint
CREATE INDEX "sources_owner_created_idx" ON "mimi"."sources" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_runs_actor_idempotency_unique" ON "mimi"."workflow_runs" USING btree ("actor_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "workflow_runs_actor_created_idx" ON "mimi"."workflow_runs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_steps_run_key_unique" ON "mimi"."workflow_steps" USING btree ("workflow_run_id","step_key");--> statement-breakpoint
CREATE INDEX "workspace_members_user_idx" ON "mimi"."workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspaces_owner_idx" ON "mimi"."workspaces" USING btree ("owner_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION "mimi"."prevent_credit_ledger_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'credit_ledger_entries is append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "credit_ledger_entries_immutable"
BEFORE UPDATE OR DELETE ON "mimi"."credit_ledger_entries"
FOR EACH ROW EXECUTE FUNCTION "mimi"."prevent_credit_ledger_mutation"();