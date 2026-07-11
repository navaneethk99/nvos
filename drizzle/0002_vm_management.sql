CREATE TABLE "virtual_machine" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "slug" text NOT NULL,
  "hostname" text NOT NULL,
  "instance_id" text,
  "private_ip" text,
  "status" text DEFAULT 'provisioning' NOT NULL,
  "failure_reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "stopped_at" timestamp,
  "terminated_at" timestamp,
  CONSTRAINT "virtual_machine_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade,
  CONSTRAINT "virtual_machine_status_check" CHECK ("status" IN ('provisioning','starting','running','stopping','stopped','terminating','terminated','failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "virtual_machine_slug_unique" ON "virtual_machine" USING btree ("slug");
--> statement-breakpoint
CREATE UNIQUE INDEX "virtual_machine_hostname_unique" ON "virtual_machine" USING btree ("hostname");
--> statement-breakpoint
CREATE UNIQUE INDEX "virtual_machine_instance_id_unique" ON "virtual_machine" USING btree ("instance_id");
--> statement-breakpoint
CREATE INDEX "virtual_machine_user_id_idx" ON "virtual_machine" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "virtual_machine_status_idx" ON "virtual_machine" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "virtual_machine_user_status_idx" ON "virtual_machine" USING btree ("user_id", "status");
--> statement-breakpoint
CREATE UNIQUE INDEX "virtual_machine_one_active_per_user" ON "virtual_machine" USING btree ("user_id") WHERE "status" NOT IN ('terminated', 'failed');
