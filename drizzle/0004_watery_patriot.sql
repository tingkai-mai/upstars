CREATE TYPE "public"."test_type" AS ENUM('capstone', 'monthly');--> statement-breakpoint
CREATE TABLE "test" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "test_type" NOT NULL,
	"duration_min" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "test_subject_name_unique" UNIQUE("subject_id","name"),
	CONSTRAINT "test_duration_non_negative" CHECK ("test"."duration_min" >= 0)
);
--> statement-breakpoint
CREATE TABLE "test_chapter" (
	"test_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	CONSTRAINT "test_chapter_test_id_chapter_id_pk" PRIMARY KEY("test_id","chapter_id")
);
--> statement-breakpoint
ALTER TABLE "worksheet" ALTER COLUMN "duration_min" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "test" ADD CONSTRAINT "test_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_chapter" ADD CONSTRAINT "test_chapter_test_id_test_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."test"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_chapter" ADD CONSTRAINT "test_chapter_chapter_id_chapter_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "test_chapter_chapter_id_idx" ON "test_chapter" USING btree ("chapter_id");