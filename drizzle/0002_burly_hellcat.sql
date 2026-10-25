CREATE TABLE "chapter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chapter_subject_name_unique" UNIQUE("subject_id","name"),
	CONSTRAINT "chapter_id_subject_unique" UNIQUE("id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "concept" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subject" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subject_level_name_unique" UNIQUE("level","name")
);
--> statement-breakpoint
CREATE TABLE "week" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"duration_min" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "week_subject_number_unique" UNIQUE("subject_id","number"),
	CONSTRAINT "week_number_positive" CHECK ("week"."number" > 0),
	CONSTRAINT "week_duration_non_negative" CHECK ("week"."duration_min" >= 0)
);
--> statement-breakpoint
CREATE TABLE "worksheet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_id" uuid NOT NULL,
	"name" text NOT NULL,
	"duration_min" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "worksheet_week_name_unique" UNIQUE("week_id","name"),
	CONSTRAINT "worksheet_duration_non_negative" CHECK ("worksheet"."duration_min" >= 0)
);
--> statement-breakpoint
DROP TABLE "syllabus" CASCADE;--> statement-breakpoint
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept" ADD CONSTRAINT "concept_week_id_week_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."week"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week" ADD CONSTRAINT "week_chapter_fk" FOREIGN KEY ("chapter_id","subject_id") REFERENCES "public"."chapter"("id","subject_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheet" ADD CONSTRAINT "worksheet_week_id_week_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."week"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "concept_week_id_position_idx" ON "concept" USING btree ("week_id","position");--> statement-breakpoint
CREATE INDEX "week_chapter_id_idx" ON "week" USING btree ("chapter_id");