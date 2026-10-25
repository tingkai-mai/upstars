ALTER TABLE "check_in" ADD COLUMN "attendance_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "check_in" ADD COLUMN "behaviour_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "check_in" ADD COLUMN "bonus_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "current_level" text;--> statement-breakpoint
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_attendance_points_valid" CHECK ("check_in"."attendance_points" BETWEEN 0 AND 2);--> statement-breakpoint
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_behaviour_points_valid" CHECK ("check_in"."behaviour_points" BETWEEN 0 AND 2);--> statement-breakpoint
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_bonus_points_valid" CHECK ("check_in"."bonus_points" BETWEEN 0 AND 2);