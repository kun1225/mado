ALTER TABLE "feedback" ADD COLUMN "ip_hash" text;--> statement-breakpoint
CREATE INDEX "feedback_ip_hash_created_at_idx" ON "feedback" USING btree ("ip_hash","created_at");