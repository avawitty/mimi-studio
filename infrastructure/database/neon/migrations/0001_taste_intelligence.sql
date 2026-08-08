CREATE TABLE IF NOT EXISTS "mimi"."taste_learning_events" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"workspace_id" uuid,
	"project_id" text,
	"event_payload" jsonb NOT NULL,
	"idempotency_key" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "taste_learning_events_owner_idempotency_unique" ON "mimi"."taste_learning_events" ("owner_id","idempotency_key") WHERE "idempotency_key" is not null;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "taste_learning_events_owner_occurred_idx" ON "mimi"."taste_learning_events" ("owner_id","occurred_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mimi"."taste_model_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"workspace_id" uuid,
	"project_id" text,
	"scope" text NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"model_version" text NOT NULL,
	"snapshot_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "taste_model_snapshots_owner_updated_idx" ON "mimi"."taste_model_snapshots" ("owner_id","updated_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mimi"."taste_calibration_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"workspace_id" uuid,
	"project_id" text,
	"model_snapshot_id" text NOT NULL,
	"status" text NOT NULL,
	"target_question_count" integer NOT NULL,
	"answered_question_count" integer DEFAULT 0 NOT NULL,
	"algorithm_version" text NOT NULL,
	"idempotency_key" text,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "taste_calibration_sessions_owner_status_idx" ON "mimi"."taste_calibration_sessions" ("owner_id","status","updated_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mimi"."taste_calibration_pairs" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"pair_payload" jsonb NOT NULL,
	"asked_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mimi"."taste_pairwise_judgments" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"pair_id" text NOT NULL,
	"judgment_payload" jsonb NOT NULL,
	"idempotency_key" text,
	"answered_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mimi"."taste_refusals" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"project_id" text,
	"refusal_payload" jsonb NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mimi"."taste_model_edits" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"project_id" text,
	"edit_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mimi"."taste_generation_contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"workspace_id" uuid,
	"project_id" text,
	"contract_payload" jsonb NOT NULL,
	"compiled_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mimi"."taste_critiques" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"contract_id" text NOT NULL,
	"critique_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mimi"."taste_exposure_events" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"project_id" text,
	"event_payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mimi"."taste_experiments" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"project_id" text,
	"experiment_payload" jsonb NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mimi"."taste_passports" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"passport_payload" jsonb NOT NULL,
	"visibility" text NOT NULL,
	"version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mimi"."collaborative_taste_contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" text,
	"contract_payload" jsonb NOT NULL,
	"version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mimi"."taste_evaluation_events" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"workspace_id" uuid,
	"project_id" text,
	"evaluation_type" text NOT NULL,
	"event_payload" jsonb NOT NULL,
	"model_version" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mimi"."sentinel_memory_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"project_id" text,
	"target_object_id" text NOT NULL,
	"policy_payload" jsonb NOT NULL,
	"epistemic_state" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mimi"."saved_reason_hypotheses" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"artifact_id" text NOT NULL,
	"hypothesis_payload" jsonb NOT NULL,
	"user_status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mimi"."cultural_positioning_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"report_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
