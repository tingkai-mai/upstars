-- Existing resources keep their alphabetical order; NOT NULL is added once every row has a position
ALTER TABLE "resource" ADD COLUMN "position" integer;--> statement-breakpoint
UPDATE "resource" SET "position" = ranked.n FROM (SELECT "id", row_number() OVER (ORDER BY "name", "created_at") AS n FROM "resource") AS ranked WHERE "resource"."id" = ranked."id";--> statement-breakpoint
ALTER TABLE "resource" ALTER COLUMN "position" SET NOT NULL;
