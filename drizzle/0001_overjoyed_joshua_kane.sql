CREATE TYPE "public"."user_role" AS ENUM('student', 'tutor', 'admin');--> statement-breakpoint
CREATE TABLE "pairing" (
	"tutor_id" text NOT NULL,
	"student_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pairing_tutor_id_student_id_pk" PRIMARY KEY("tutor_id","student_id"),
	CONSTRAINT "pairing_not_self" CHECK ("pairing"."tutor_id" <> "pairing"."student_id")
);
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" "user_role" DEFAULT 'student' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
ALTER TABLE "pairing" ADD CONSTRAINT "pairing_tutor_id_user_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairing" ADD CONSTRAINT "pairing_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pairing_student_id_idx" ON "pairing" USING btree ("student_id");