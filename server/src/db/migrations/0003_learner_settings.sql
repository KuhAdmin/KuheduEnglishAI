CREATE TABLE "learner_photos" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"photo" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learner_photos_photo_check" CHECK (starts_with("learner_photos"."photo", 'data:image/'))
);
--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "theme" text;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "voices" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "learner_photos" ADD CONSTRAINT "learner_photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD CONSTRAINT "learner_profiles_theme_check" CHECK ("learner_profiles"."theme" ~ '^[a-z][a-z0-9-]{0,39}$');