ALTER TABLE "check_in" DROP CONSTRAINT "check_in_tutor_id_user_id_fk";
--> statement-breakpoint
-- Remarks are now required; fill in any check-ins saved without them
UPDATE "check_in" SET "remarks" = '(No remarks)' WHERE "remarks" IS NULL OR btrim("remarks") = '';--> statement-breakpoint
ALTER TABLE "check_in" ALTER COLUMN "remarks" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "check_in" DROP COLUMN "tutor_id";--> statement-breakpoint
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_remarks_not_blank" CHECK (btrim("check_in"."remarks") <> '');