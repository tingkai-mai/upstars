CREATE TABLE "concept_completion" (
	"student_id" text NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"recorded_by" text,
	"concept_id" uuid NOT NULL,
	CONSTRAINT "concept_completion_student_id_concept_id_pk" PRIMARY KEY("student_id","concept_id")
);
--> statement-breakpoint
CREATE TABLE "goal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"quarter" integer GENERATED ALWAYS AS ((month - 1) / 3 + 1) STORED,
	"total_marks" integer NOT NULL,
	"target_marks" integer NOT NULL,
	"actual_marks" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "goal_student_subject_quarter_unique" UNIQUE("student_id","subject_id","year","quarter"),
	CONSTRAINT "goal_month_valid" CHECK ("goal"."month" BETWEEN 1 AND 12),
	CONSTRAINT "goal_year_valid" CHECK ("goal"."year" BETWEEN 2000 AND 2100),
	CONSTRAINT "goal_total_positive" CHECK ("goal"."total_marks" > 0),
	CONSTRAINT "goal_target_in_range" CHECK ("goal"."target_marks" BETWEEN 0 AND "goal"."total_marks"),
	CONSTRAINT "goal_actual_in_range" CHECK ("goal"."actual_marks" BETWEEN 0 AND "goal"."total_marks")
);
--> statement-breakpoint
CREATE TABLE "test_completion" (
	"student_id" text NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"recorded_by" text,
	"test_id" uuid NOT NULL,
	CONSTRAINT "test_completion_student_id_test_id_pk" PRIMARY KEY("student_id","test_id")
);
--> statement-breakpoint
CREATE TABLE "worksheet_completion" (
	"student_id" text NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"recorded_by" text,
	"worksheet_id" uuid NOT NULL,
	CONSTRAINT "worksheet_completion_student_id_worksheet_id_pk" PRIMARY KEY("student_id","worksheet_id")
);
--> statement-breakpoint
ALTER TABLE "concept_completion" ADD CONSTRAINT "concept_completion_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_completion" ADD CONSTRAINT "concept_completion_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_completion" ADD CONSTRAINT "concept_completion_concept_id_concept_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concept"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal" ADD CONSTRAINT "goal_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal" ADD CONSTRAINT "goal_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_completion" ADD CONSTRAINT "test_completion_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_completion" ADD CONSTRAINT "test_completion_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_completion" ADD CONSTRAINT "test_completion_test_id_test_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."test"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheet_completion" ADD CONSTRAINT "worksheet_completion_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheet_completion" ADD CONSTRAINT "worksheet_completion_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheet_completion" ADD CONSTRAINT "worksheet_completion_worksheet_id_worksheet_id_fk" FOREIGN KEY ("worksheet_id") REFERENCES "public"."worksheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "concept_completion_concept_id_idx" ON "concept_completion" USING btree ("concept_id");--> statement-breakpoint
CREATE INDEX "test_completion_test_id_idx" ON "test_completion" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "worksheet_completion_worksheet_id_idx" ON "worksheet_completion" USING btree ("worksheet_id");