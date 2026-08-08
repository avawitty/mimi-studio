CREATE TABLE "mimi"."taste_calibration_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"workspace_id" uuid,
	"project_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"target_question_count" integer DEFAULT 10 NOT NULL,
	"answered_count" integer DEFAULT 0 NOT NULL,
	"seed" text NOT NULL,
	"algorithm_version" text NOT NULL,
	"baseline_snapshot_id" text,
	"current_snapshot_id" text,
	"current_model_state" jsonb,
	"scope" text DEFAULT 'project' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taste_calibration_sessions_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "mimi"."profiles"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "taste_calibration_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "mimi"."workspaces"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "taste_calibration_sessions_status_check" CHECK ("status" in ('active', 'paused', 'completed', 'abandoned')),
	CONSTRAINT "taste_calibration_sessions_scope_check" CHECK ("scope" in ('persistent', 'project', 'session'))
);
--> statement-breakpoint
CREATE TABLE "mimi"."taste_calibration_pairs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"pair_index" integer NOT NULL,
	"left_candidate_id" text NOT NULL,
	"right_candidate_id" text NOT NULL,
	"isolated_feature_ids" jsonb NOT NULL,
	"selection_reason" jsonb NOT NULL,
	"predicted_left_preference" numeric(8, 6) NOT NULL,
	"expected_information_gain" numeric(8, 6) NOT NULL,
	"asked_at" timestamp with time zone NOT NULL,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taste_calibration_pairs_session_id_taste_calibration_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "mimi"."taste_calibration_sessions"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "taste_calibration_pairs_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "mimi"."profiles"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "mimi"."taste_pairwise_judgments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"pair_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"choice" text NOT NULL,
	"deciding_feature_ids" jsonb NOT NULL,
	"correction_note" text,
	"scope" text NOT NULL,
	"project_id" text,
	"answered_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taste_pairwise_judgments_session_id_taste_calibration_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "mimi"."taste_calibration_sessions"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "taste_pairwise_judgments_pair_id_taste_calibration_pairs_id_fk" FOREIGN KEY ("pair_id") REFERENCES "mimi"."taste_calibration_pairs"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "taste_pairwise_judgments_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "mimi"."profiles"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "taste_pairwise_judgments_choice_check" CHECK ("choice" in ('left', 'right', 'both', 'neither', 'skip')),
	CONSTRAINT "taste_pairwise_judgments_scope_check" CHECK ("scope" in ('persistent', 'project', 'session'))
);
--> statement-breakpoint
CREATE INDEX "taste_calibration_sessions_owner_created_idx" ON "mimi"."taste_calibration_sessions" USING btree ("owner_id","created_at");
--> statement-breakpoint
CREATE INDEX "taste_calibration_sessions_project_idx" ON "mimi"."taste_calibration_sessions" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX "taste_calibration_sessions_active_idx" ON "mimi"."taste_calibration_sessions" USING btree ("owner_id","status","project_id");
--> statement-breakpoint
CREATE INDEX "taste_calibration_pairs_session_idx" ON "mimi"."taste_calibration_pairs" USING btree ("session_id","pair_index");
--> statement-breakpoint
CREATE UNIQUE INDEX "taste_calibration_pairs_session_pair_unique" ON "mimi"."taste_calibration_pairs" USING btree ("session_id","pair_index");
--> statement-breakpoint
CREATE INDEX "taste_pairwise_judgments_session_idx" ON "mimi"."taste_pairwise_judgments" USING btree ("session_id","answered_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "taste_pairwise_judgments_pair_unique" ON "mimi"."taste_pairwise_judgments" USING btree ("pair_id");
