CREATE TYPE "public"."audit_actor" AS ENUM('USER', 'DEVICE', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."body_region" AS ENUM('HEAD', 'NECK', 'CHEST', 'ABDOMEN', 'UPPER_BACK', 'LOWER_BACK', 'LEFT_ARM', 'RIGHT_ARM', 'LEFT_LEG', 'RIGHT_LEG', 'LEFT_HAND', 'RIGHT_HAND', 'LEFT_FOOT', 'RIGHT_FOOT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."body_side" AS ENUM('LEFT', 'RIGHT', 'MIDLINE', 'UNSPECIFIED');--> statement-breakpoint
CREATE TYPE "public"."classification_label" AS ENUM('BENIGN', 'SUSPICIOUS', 'MALIGNANT', 'INCONCLUSIVE');--> statement-breakpoint
CREATE TYPE "public"."device_status" AS ENUM('ACTIVE', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."image_type" AS ENUM('DERMOSCOPIC', 'CLINICAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."ingestion_status" AS ENUM('RECEIVED', 'AUTO_MATCHED', 'NEEDS_RECONCILIATION', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."insight_kind" AS ENUM('PATIENT_EXPLANATION', 'CLINICAL_SUMMARY', 'EVOLUTION_NARRATIVE');--> statement-breakpoint
CREATE TYPE "public"."insight_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."insight_subject" AS ENUM('SCAN', 'LESION');--> statement-breakpoint
CREATE TYPE "public"."management_status" AS ENUM('MONITORING', 'BIOPSY_RECOMMENDED', 'REFERRED', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."metrics_scale" AS ENUM('DERMOSCOPE', 'RULER_REF', 'CLINICIAN_MEASURED', 'UNCALIBRATED');--> statement-breakpoint
CREATE TYPE "public"."scan_source" AS ENUM('MANUAL', 'DEVICE');--> statement-breakpoint
CREATE TYPE "public"."scan_status" AS ENUM('DRAFT', 'FINALIZED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('OWNER', 'ADMIN', 'DOCTOR', 'NURSE');--> statement-breakpoint
CREATE TABLE "ai_insight" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"subject_type" "insight_subject" NOT NULL,
	"subject_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"kind" "insight_kind" NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"input_hash" text NOT NULL,
	"content" jsonb NOT NULL,
	"status" "insight_status" NOT NULL,
	"created_by_user_id" uuid,
	"superseded_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"actor_type" "audit_actor" NOT NULL,
	"actor_user_id" uuid,
	"actor_device_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"ip" text,
	"user_agent_hash" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"scan_id" uuid NOT NULL,
	"label" "classification_label" NOT NULL,
	"confidence" numeric(5, 4) NOT NULL,
	"confidence_label" "classification_label" NOT NULL,
	"metrics" jsonb NOT NULL,
	"metrics_scale" "metrics_scale" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"serial" text NOT NULL,
	"api_key_prefix" text NOT NULL,
	"api_key_hash" text NOT NULL,
	"status" "device_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_serial_unique" UNIQUE("serial")
);
--> statement-breakpoint
CREATE TABLE "ingestion_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"status" "ingestion_status" DEFAULT 'RECEIVED' NOT NULL,
	"resolved_scan_id" uuid,
	"response_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesion" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"body_region" "body_region" NOT NULL,
	"body_side" "body_side" NOT NULL,
	"body_location_note" text NOT NULL,
	"body_map_x" numeric(6, 5),
	"body_map_y" numeric(6, 5),
	"description" text,
	"baseline_scan_id" uuid,
	"current_risk" "classification_label",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "management_note" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"body" text NOT NULL,
	"author_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "management_plan" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"lesion_id" uuid NOT NULL,
	"status" "management_status" DEFAULT 'MONITORING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "membership" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY NOT NULL,
	"clerk_org_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_clerk_org_id_unique" UNIQUE("clerk_org_id")
);
--> statement-breakpoint
CREATE TABLE "patient" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"date_of_birth" text NOT NULL,
	"mrn" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scan_image" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"scan_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"image_type" "image_type" NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"content_hash" text NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scan" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"lesion_id" uuid NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"source" "scan_source" NOT NULL,
	"status" "scan_status" DEFAULT 'FINALIZED' NOT NULL,
	"device_id" uuid,
	"recorded_by_user_id" uuid,
	"ingestion_event_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "ai_insight" ADD CONSTRAINT "ai_insight_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_insight" ADD CONSTRAINT "ai_insight_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_insight" ADD CONSTRAINT "ai_insight_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_device_id_device_id_fk" FOREIGN KEY ("actor_device_id") REFERENCES "public"."device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classification" ADD CONSTRAINT "classification_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classification" ADD CONSTRAINT "classification_scan_id_scan_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device" ADD CONSTRAINT "device_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_event" ADD CONSTRAINT "ingestion_event_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_event" ADD CONSTRAINT "ingestion_event_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesion" ADD CONSTRAINT "lesion_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesion" ADD CONSTRAINT "lesion_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_note" ADD CONSTRAINT "management_note_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_note" ADD CONSTRAINT "management_note_plan_id_management_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."management_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_note" ADD CONSTRAINT "management_note_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_plan" ADD CONSTRAINT "management_plan_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_plan" ADD CONSTRAINT "management_plan_lesion_id_lesion_id_fk" FOREIGN KEY ("lesion_id") REFERENCES "public"."lesion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_image" ADD CONSTRAINT "scan_image_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_image" ADD CONSTRAINT "scan_image_scan_id_scan_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan" ADD CONSTRAINT "scan_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan" ADD CONSTRAINT "scan_lesion_id_lesion_id_fk" FOREIGN KEY ("lesion_id") REFERENCES "public"."lesion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan" ADD CONSTRAINT "scan_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan" ADD CONSTRAINT "scan_recorded_by_user_id_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan" ADD CONSTRAINT "scan_ingestion_event_id_ingestion_event_id_fk" FOREIGN KEY ("ingestion_event_id") REFERENCES "public"."ingestion_event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_insight_current" ON "ai_insight" USING btree ("subject_type","subject_id","kind") WHERE "ai_insight"."superseded_by_id" is null and "ai_insight"."status" = 'COMPLETED';--> statement-breakpoint
CREATE INDEX "ix_insight_cache" ON "ai_insight" USING btree ("org_id","subject_type","subject_id","kind","input_hash","prompt_version","model");--> statement-breakpoint
CREATE INDEX "ix_insight_patient" ON "ai_insight" USING btree ("org_id","patient_id");--> statement-breakpoint
CREATE INDEX "ix_audit_org_created" ON "audit_log" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "ix_audit_resource" ON "audit_log" USING btree ("org_id","resource_type","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_classification_scan" ON "classification" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "ix_classification_org_label" ON "classification" USING btree ("org_id","label");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_device_serial" ON "device" USING btree ("serial");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_device_key_prefix" ON "device" USING btree ("api_key_prefix");--> statement-breakpoint
CREATE INDEX "ix_device_org" ON "device" USING btree ("org_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_ingest_idem" ON "ingestion_event" USING btree ("device_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "ix_ingestion_org" ON "ingestion_event" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "ix_lesion_patient" ON "lesion" USING btree ("org_id","patient_id") WHERE "lesion"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "ix_lesion_org_risk" ON "lesion" USING btree ("org_id","current_risk") WHERE "lesion"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "ix_management_note_plan" ON "management_note" USING btree ("org_id","plan_id","created_at") WHERE "management_note"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_management_plan_lesion" ON "management_plan" USING btree ("org_id","lesion_id") WHERE "management_plan"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_membership_org_user" ON "membership" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "ix_membership_org" ON "membership" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_membership_user" ON "membership" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_patient_org_mrn" ON "patient" USING btree ("org_id","mrn") WHERE "patient"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "ix_patient_org_name" ON "patient" USING btree ("org_id","last_name","first_name") WHERE "patient"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "ix_scan_image_scan" ON "scan_image" USING btree ("org_id","scan_id") WHERE "scan_image"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "ix_scan_image_key" ON "scan_image" USING btree ("org_id","object_key");--> statement-breakpoint
CREATE INDEX "ix_scan_lesion_captured" ON "scan" USING btree ("org_id","lesion_id","captured_at") WHERE "scan"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "ix_scan_org_created" ON "scan" USING btree ("org_id","created_at") WHERE "scan"."deleted_at" is null;