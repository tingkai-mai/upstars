CREATE TABLE "worksheet_concept" (
	"worksheet_id" uuid NOT NULL,
	"concept_id" uuid NOT NULL,
	CONSTRAINT "worksheet_concept_worksheet_id_concept_id_pk" PRIMARY KEY("worksheet_id","concept_id")
);
--> statement-breakpoint
ALTER TABLE "worksheet_concept" ADD CONSTRAINT "worksheet_concept_worksheet_id_worksheet_id_fk" FOREIGN KEY ("worksheet_id") REFERENCES "public"."worksheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheet_concept" ADD CONSTRAINT "worksheet_concept_concept_id_concept_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concept"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "worksheet_concept_concept_id_idx" ON "worksheet_concept" USING btree ("concept_id");--> statement-breakpoint
-- Hand-written backfill: worksheets move from a week to a subject, keeping the week's concepts
ALTER TABLE "worksheet" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
UPDATE "worksheet" SET "subject_id" = "week"."subject_id" FROM "week" WHERE "week"."id" = "worksheet"."week_id";--> statement-breakpoint
INSERT INTO "worksheet_concept" ("worksheet_id", "concept_id") SELECT "worksheet"."id", "concept"."id" FROM "worksheet" JOIN "concept" ON "concept"."week_id" = "worksheet"."week_id";--> statement-breakpoint
ALTER TABLE "worksheet" ALTER COLUMN "subject_id" SET NOT NULL;--> statement-breakpoint
-- End of backfill
ALTER TABLE "worksheet" DROP CONSTRAINT "worksheet_week_name_unique";--> statement-breakpoint
ALTER TABLE "worksheet" DROP CONSTRAINT "worksheet_week_id_week_id_fk";
--> statement-breakpoint
ALTER TABLE "worksheet" ADD CONSTRAINT "worksheet_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheet" DROP COLUMN "week_id";--> statement-breakpoint
ALTER TABLE "worksheet" ADD CONSTRAINT "worksheet_subject_name_unique" UNIQUE("subject_id","name");
