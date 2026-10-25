DROP INDEX "pairing_student_id_idx";--> statement-breakpoint
ALTER TABLE "pairing" ADD CONSTRAINT "pairing_student_unique" UNIQUE("student_id");