CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"target" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"purpose" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "email_codes_purpose_check" CHECK ("email_codes"."purpose" in ('verify_email', 'reset_password')),
	CONSTRAINT "email_codes_attempts_check" CHECK ("email_codes"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "oauth_identities" (
	"provider" text NOT NULL,
	"subject" text NOT NULL,
	"user_id" uuid NOT NULL,
	"email" "citext" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_identities_provider_subject_pk" PRIMARY KEY("provider","subject"),
	CONSTRAINT "oauth_identities_provider_check" CHECK ("oauth_identities"."provider" in ('google'))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"user_agent" text,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"email_verified_at" timestamp with time zone,
	"password_hash" text,
	"role" text DEFAULT 'learner' NOT NULL,
	"display_name" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('learner', 'admin')),
	CONSTRAINT "users_status_check" CHECK ("users"."status" in ('active', 'disabled'))
);
--> statement-breakpoint
CREATE TABLE "app_config" (
	"name" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "app_config_name_check" CHECK ("app_config"."name" in ('landing', 'languages', 'learner-profiles')),
	CONSTRAINT "app_config_version_check" CHECK ("app_config"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sha256" text NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"storage_key" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_sha256_unique" UNIQUE("sha256"),
	CONSTRAINT "assets_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "assets_sha256_check" CHECK ("assets"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "assets_mime_check" CHECK ("assets"."mime" in ('image/webp', 'image/png', 'image/jpeg')),
	CONSTRAINT "assets_size_check" CHECK ("assets"."bytes" > 0 and "assets"."width" > 0 and "assets"."height" > 0)
);
--> statement-breakpoint
CREATE TABLE "content_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"ref" text NOT NULL,
	"value" jsonb NOT NULL,
	"version" integer,
	"replaced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"replaced_by" uuid,
	CONSTRAINT "content_history_source_check" CHECK ("content_history"."source" in ('app_config', 'text_override', 'week_content'))
);
--> statement-breakpoint
CREATE TABLE "text_overrides" (
	"scope" text NOT NULL,
	"language" text NOT NULL,
	"key" text NOT NULL,
	"text" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "text_overrides_scope_language_key_pk" PRIMARY KEY("scope","language","key"),
	CONSTRAINT "text_overrides_scope_check" CHECK ("text_overrides"."scope" in ('screen', 'curriculum')),
	CONSTRAINT "text_overrides_language_check" CHECK ("text_overrides"."language" ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
	CONSTRAINT "text_overrides_text_check" CHECK (btrim("text_overrides"."text") <> '')
);
--> statement-breakpoint
CREATE TABLE "week_content" (
	"kind" text NOT NULL,
	"week" integer NOT NULL,
	"value" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "week_content_kind_week_pk" PRIMARY KEY("kind","week"),
	CONSTRAINT "week_content_kind_check" CHECK ("week_content"."kind" in ('picture', 'dialogue', 'vocabulary', 'sentences', 'roleplay', 'challenge', 'quiz', 'review_dialogue', 'review_roleplay', 'scenarios')),
	CONSTRAINT "week_content_week_check" CHECK ("week_content"."week" between 1 and 50),
	CONSTRAINT "week_content_version_check" CHECK ("week_content"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid,
	"session_ref" text,
	"name" text NOT NULL,
	"item_id" text,
	"stage" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learner_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"language" text,
	"age_group" text,
	"tutor_avatar" text,
	"start_week" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learner_profiles_language_check" CHECK ("learner_profiles"."language" ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
	CONSTRAINT "learner_profiles_age_group_check" CHECK ("learner_profiles"."age_group" in ('child', 'teen', 'adult')),
	CONSTRAINT "learner_profiles_tutor_avatar_check" CHECK ("learner_profiles"."tutor_avatar" in ('male', 'female')),
	CONSTRAINT "learner_profiles_start_week_check" CHECK ("learner_profiles"."start_week" between 1 and 50)
);
--> statement-breakpoint
CREATE TABLE "lesson_marks" (
	"user_id" uuid NOT NULL,
	"week" integer NOT NULL,
	"kind" text NOT NULL,
	"ref" text DEFAULT '' NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_marks_user_id_week_kind_ref_pk" PRIMARY KEY("user_id","week","kind","ref"),
	CONSTRAINT "lesson_marks_week_check" CHECK ("lesson_marks"."week" between 1 and 50),
	CONSTRAINT "lesson_marks_ref_check" CHECK (("lesson_marks"."kind" = 'heard' and "lesson_marks"."ref" = '') or ("lesson_marks"."kind" = 'day' and "lesson_marks"."ref" in ('1', '2', '3', '4', '5', '6', '7')) or ("lesson_marks"."kind" = 'review_part' and "lesson_marks"."ref" in ('quiz', 'listening', 'speaking', 'flashcards', 'roleplay')) or ("lesson_marks"."kind" = 'scenario' and "lesson_marks"."ref" in ('0', '1', '2')))
);
--> statement-breakpoint
CREATE TABLE "placement_responses" (
	"session_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"item_id" text NOT NULL,
	"stage" text NOT NULL,
	"level" text NOT NULL,
	"answered_at" timestamp with time zone NOT NULL,
	"time_taken_ms" double precision NOT NULL,
	"answer" integer,
	"correct" boolean,
	"skipped" text,
	"play_count" integer NOT NULL,
	"slow_play_count" integer NOT NULL,
	"help_opened" boolean NOT NULL,
	"transcript_shown" boolean NOT NULL,
	"translation_offered" boolean NOT NULL,
	"translation_used" boolean NOT NULL,
	"model_played" boolean NOT NULL,
	"recording_attempts" integer NOT NULL,
	"recording_duration_ms" double precision NOT NULL,
	CONSTRAINT "placement_responses_session_id_seq_pk" PRIMARY KEY("session_id","seq"),
	CONSTRAINT "placement_responses_stage_check" CHECK ("placement_responses"."stage" in ('LISTEN', 'UNDERSTAND', 'SPEAK')),
	CONSTRAINT "placement_responses_level_check" CHECK ("placement_responses"."level" in ('FOUNDATION', 'A1', 'A2', 'B1', 'B2+')),
	CONSTRAINT "placement_responses_skipped_check" CHECK ("placement_responses"."skipped" in ('notSure', 'audioFailed', 'declined')),
	CONSTRAINT "placement_responses_counts_check" CHECK ("placement_responses"."seq" >= 0 and "placement_responses"."answer" >= 0 and "placement_responses"."time_taken_ms" >= 0 and "placement_responses"."play_count" >= 0 and "placement_responses"."slow_play_count" >= 0 and "placement_responses"."recording_attempts" >= 0 and "placement_responses"."recording_duration_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE "placement_results" (
	"session_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"version" text NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"profile" jsonb NOT NULL,
	"start_level" text NOT NULL,
	"support_level" text NOT NULL,
	"priority_skills" text[] NOT NULL,
	"provisional" boolean NOT NULL,
	CONSTRAINT "placement_results_start_level_check" CHECK ("placement_results"."start_level" in ('FOUNDATION', 'A1', 'A2', 'B1', 'B2+')),
	CONSTRAINT "placement_results_support_level_check" CHECK ("placement_results"."support_level" in ('HIGH', 'MEDIUM', 'LOW')),
	CONSTRAINT "placement_results_priority_skills_check" CHECK ("placement_results"."priority_skills" <@ array['listening', 'understanding', 'speaking'])
);
--> statement-breakpoint
CREATE TABLE "placement_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"version" text NOT NULL,
	"status" text NOT NULL,
	"stage" text NOT NULL,
	"stage_started" boolean NOT NULL,
	"current_item_id" text,
	"language_support" text NOT NULL,
	"device_type" text NOT NULL,
	"not_assessed" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "placement_sessions_user_id_client_id_unique" UNIQUE("user_id","client_id"),
	CONSTRAINT "placement_sessions_status_check" CHECK ("placement_sessions"."status" in ('IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABANDONED')),
	CONSTRAINT "placement_sessions_stage_check" CHECK ("placement_sessions"."stage" in ('LISTEN', 'UNDERSTAND', 'SPEAK')),
	CONSTRAINT "placement_sessions_device_type_check" CHECK ("placement_sessions"."device_type" in ('mobile', 'tablet', 'desktop')),
	CONSTRAINT "placement_sessions_language_support_check" CHECK ("placement_sessions"."language_support" ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
	CONSTRAINT "placement_sessions_completed_check" CHECK ("placement_sessions"."status" <> 'COMPLETED' or "placement_sessions"."completed_at" is not null)
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_identities" ADD CONSTRAINT "oauth_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_config" ADD CONSTRAINT "app_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_history" ADD CONSTRAINT "content_history_replaced_by_users_id_fk" FOREIGN KEY ("replaced_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_overrides" ADD CONSTRAINT "text_overrides_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_content" ADD CONSTRAINT "week_content_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD CONSTRAINT "learner_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_marks" ADD CONSTRAINT "lesson_marks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_responses" ADD CONSTRAINT "placement_responses_session_id_placement_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."placement_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_results" ADD CONSTRAINT "placement_results_session_id_placement_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."placement_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_results" ADD CONSTRAINT "placement_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_sessions" ADD CONSTRAINT "placement_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_actor_user_id_idx" ON "audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "email_codes_email_purpose_idx" ON "email_codes" USING btree ("email","purpose");--> statement-breakpoint
CREATE INDEX "oauth_identities_user_id_idx" ON "oauth_identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "content_history_ref_idx" ON "content_history" USING btree ("source","ref","replaced_at");--> statement-breakpoint
CREATE INDEX "week_content_week_idx" ON "week_content" USING btree ("week");--> statement-breakpoint
CREATE INDEX "events_name_occurred_at_idx" ON "events" USING btree ("name","occurred_at");--> statement-breakpoint
CREATE INDEX "events_user_id_idx" ON "events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "events_session_ref_idx" ON "events" USING btree ("session_ref");--> statement-breakpoint
CREATE INDEX "placement_results_user_id_idx" ON "placement_results" USING btree ("user_id","completed_at");