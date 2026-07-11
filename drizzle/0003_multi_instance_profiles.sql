DROP INDEX IF EXISTS "virtual_machine_one_active_per_user";
--> statement-breakpoint
ALTER TABLE "virtual_machine" ADD COLUMN "name" text;
--> statement-breakpoint
ALTER TABLE "virtual_machine" ADD COLUMN "description" text;
--> statement-breakpoint
ALTER TABLE "virtual_machine" ADD COLUMN "instance_type" text;
--> statement-breakpoint
UPDATE "virtual_machine"
SET "name" = 'Workspace ' || left("slug", 24),
    "instance_type" = 't3.micro'
WHERE "name" IS NULL OR "instance_type" IS NULL;
--> statement-breakpoint
ALTER TABLE "virtual_machine" ALTER COLUMN "name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "virtual_machine" ALTER COLUMN "instance_type" SET NOT NULL;
