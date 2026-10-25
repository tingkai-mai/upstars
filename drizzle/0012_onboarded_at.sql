ALTER TABLE "user" ADD COLUMN "onboarded_at" timestamp;--> statement-breakpoint
-- The guide is for first logins, so people who already use the app aren't shown it
UPDATE "user" SET "onboarded_at" = now();
