ALTER TABLE "management_plan" ADD COLUMN "next_review_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "management_plan" ADD COLUMN "recall_interval_days" integer;--> statement-breakpoint
CREATE INDEX "ix_management_plan_review" ON "management_plan" USING btree ("org_id","next_review_at");