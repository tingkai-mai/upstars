CREATE TABLE "student_syllabus" (
	"student_id" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_syllabus_student_id_subject_id_pk" PRIMARY KEY("student_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "student_week" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"duration_min" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_week_duration_non_negative" CHECK ("student_week"."duration_min" >= 0)
);
--> statement-breakpoint
CREATE TABLE "student_week_concept" (
	"student_week_id" uuid NOT NULL,
	"concept_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "student_week_concept_student_week_id_concept_id_pk" PRIMARY KEY("student_week_id","concept_id")
);
--> statement-breakpoint
ALTER TABLE "concept" DROP CONSTRAINT "concept_week_id_week_id_fk";
--> statement-breakpoint
ALTER TABLE "concept" ALTER COLUMN "week_id" DROP NOT NULL;--> statement-breakpoint
-- Existing concepts take their week's subject; NOT NULL is added once every row has one
ALTER TABLE "concept" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
UPDATE "concept" SET "subject_id" = "week"."subject_id" FROM "week" WHERE "concept"."week_id" = "week"."id";--> statement-breakpoint
ALTER TABLE "concept" ALTER COLUMN "subject_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "concept" ADD COLUMN "student_id" text;--> statement-breakpoint
ALTER TABLE "student_syllabus" ADD CONSTRAINT "student_syllabus_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_syllabus" ADD CONSTRAINT "student_syllabus_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_week" ADD CONSTRAINT "student_week_syllabus_fk" FOREIGN KEY ("student_id","subject_id") REFERENCES "public"."student_syllabus"("student_id","subject_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_week" ADD CONSTRAINT "student_week_chapter_fk" FOREIGN KEY ("chapter_id","subject_id") REFERENCES "public"."chapter"("id","subject_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_week_concept" ADD CONSTRAINT "student_week_concept_student_week_id_student_week_id_fk" FOREIGN KEY ("student_week_id") REFERENCES "public"."student_week"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_week_concept" ADD CONSTRAINT "student_week_concept_concept_id_concept_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concept"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "student_week_syllabus_idx" ON "student_week" USING btree ("student_id","subject_id","position");--> statement-breakpoint
CREATE INDEX "student_week_concept_concept_id_idx" ON "student_week_concept" USING btree ("concept_id");--> statement-breakpoint
ALTER TABLE "concept" ADD CONSTRAINT "concept_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept" ADD CONSTRAINT "concept_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week" ADD CONSTRAINT "week_id_subject_unique" UNIQUE("id","subject_id");--> statement-breakpoint
ALTER TABLE "concept" ADD CONSTRAINT "concept_week_fk" FOREIGN KEY ("week_id","subject_id") REFERENCES "public"."week"("id","subject_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "concept_subject_id_idx" ON "concept" USING btree ("subject_id");--> statement-breakpoint
ALTER TABLE "concept" ADD CONSTRAINT "concept_standard_or_custom" CHECK (("concept"."week_id" IS NULL) <> ("concept"."student_id" IS NULL));