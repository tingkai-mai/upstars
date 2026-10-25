CREATE TABLE "check_in" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_id" text,
	"student_id" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"lesson_date" date NOT NULL,
	"remarks" text,
	"recorded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "check_in_concept" (
	"check_in_id" uuid NOT NULL,
	"concept_id" uuid NOT NULL,
	CONSTRAINT "check_in_concept_check_in_id_concept_id_pk" PRIMARY KEY("check_in_id","concept_id")
);
--> statement-breakpoint
CREATE TABLE "check_in_test" (
	"check_in_id" uuid NOT NULL,
	"test_id" uuid NOT NULL,
	CONSTRAINT "check_in_test_check_in_id_test_id_pk" PRIMARY KEY("check_in_id","test_id")
);
--> statement-breakpoint
CREATE TABLE "check_in_worksheet" (
	"check_in_id" uuid NOT NULL,
	"worksheet_id" uuid NOT NULL,
	CONSTRAINT "check_in_worksheet_check_in_id_worksheet_id_pk" PRIMARY KEY("check_in_id","worksheet_id")
);
--> statement-breakpoint
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_tutor_id_user_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_concept" ADD CONSTRAINT "check_in_concept_check_in_id_check_in_id_fk" FOREIGN KEY ("check_in_id") REFERENCES "public"."check_in"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_concept" ADD CONSTRAINT "check_in_concept_concept_id_concept_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concept"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_test" ADD CONSTRAINT "check_in_test_check_in_id_check_in_id_fk" FOREIGN KEY ("check_in_id") REFERENCES "public"."check_in"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_test" ADD CONSTRAINT "check_in_test_test_id_test_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."test"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_worksheet" ADD CONSTRAINT "check_in_worksheet_check_in_id_check_in_id_fk" FOREIGN KEY ("check_in_id") REFERENCES "public"."check_in"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_worksheet" ADD CONSTRAINT "check_in_worksheet_worksheet_id_worksheet_id_fk" FOREIGN KEY ("worksheet_id") REFERENCES "public"."worksheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "check_in_student_id_lesson_date_idx" ON "check_in" USING btree ("student_id","lesson_date");--> statement-breakpoint
CREATE INDEX "check_in_concept_concept_id_idx" ON "check_in_concept" USING btree ("concept_id");--> statement-breakpoint
CREATE INDEX "check_in_test_test_id_idx" ON "check_in_test" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "check_in_worksheet_worksheet_id_idx" ON "check_in_worksheet" USING btree ("worksheet_id");