import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  auditActors,
  bodyRegions,
  bodySides,
  classificationLabels,
  deviceStatuses,
  imageTypes,
  ingestionStatuses,
  insightKinds,
  insightStatuses,
  insightSubjects,
  managementStatuses,
  metricsScales,
  scanSources,
  scanStatuses,
  userRoles,
} from "@/lib/enums";
import type { ScanMetrics } from "@/lib/schemas/metrics";

const id = () => uuid("id").primaryKey();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const deletedAt = () => timestamp("deleted_at", { withTimezone: true });

export const classificationLabelEnum = pgEnum(
  "classification_label",
  classificationLabels,
);
export const userRoleEnum = pgEnum("user_role", userRoles);
export const managementStatusEnum = pgEnum(
  "management_status",
  managementStatuses,
);
export const scanSourceEnum = pgEnum("scan_source", scanSources);
export const scanStatusEnum = pgEnum("scan_status", scanStatuses);
export const metricsScaleEnum = pgEnum("metrics_scale", metricsScales);
export const imageTypeEnum = pgEnum("image_type", imageTypes);
export const insightSubjectEnum = pgEnum("insight_subject", insightSubjects);
export const insightKindEnum = pgEnum("insight_kind", insightKinds);
export const insightStatusEnum = pgEnum("insight_status", insightStatuses);
export const ingestionStatusEnum = pgEnum("ingestion_status", ingestionStatuses);
export const deviceStatusEnum = pgEnum("device_status", deviceStatuses);
export const auditActorEnum = pgEnum("audit_actor", auditActors);
export const bodySideEnum = pgEnum("body_side", bodySides);
export const bodyRegionEnum = pgEnum("body_region", bodyRegions);

export const organizations = pgTable("organization", {
  id: id(),
  clerkOrgId: text("clerk_org_id").notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const users = pgTable("user", {
  id: id(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const memberships = pgTable(
  "membership",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: userRoleEnum("role").notNull(),
    status: text("status").notNull().default("ACTIVE"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("uq_membership_org_user").on(table.orgId, table.userId),
    index("ix_membership_org").on(table.orgId),
    index("ix_membership_user").on(table.userId),
  ],
);

export const patients = pgTable(
  "patient",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dateOfBirth: text("date_of_birth").notNull(),
    mrn: text("mrn").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (table) => [
    uniqueIndex("uq_patient_org_mrn")
      .on(table.orgId, table.mrn)
      .where(sql`${table.deletedAt} is null`),
    index("ix_patient_org_name")
      .on(table.orgId, table.lastName, table.firstName)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const lesions = pgTable(
  "lesion",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    bodyRegion: bodyRegionEnum("body_region").notNull(),
    bodySide: bodySideEnum("body_side").notNull(),
    bodyLocationNote: text("body_location_note").notNull(),
    bodyMapX: numeric("body_map_x", { precision: 6, scale: 5 }).$type<number>(),
    bodyMapY: numeric("body_map_y", { precision: 6, scale: 5 }).$type<number>(),
    description: text("description"),
    baselineScanId: uuid("baseline_scan_id"),
    currentRisk: classificationLabelEnum("current_risk"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (table) => [
    index("ix_lesion_patient")
      .on(table.orgId, table.patientId)
      .where(sql`${table.deletedAt} is null`),
    index("ix_lesion_org_risk")
      .on(table.orgId, table.currentRisk)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const devices = pgTable(
  "device",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    serial: text("serial").notNull().unique(),
    apiKeyPrefix: text("api_key_prefix").notNull(),
    apiKeyHash: text("api_key_hash").notNull(),
    status: deviceStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("uq_device_serial").on(table.serial),
    uniqueIndex("uq_device_key_prefix").on(table.apiKeyPrefix),
    index("ix_device_org").on(table.orgId, table.status),
  ],
);

export const ingestionEvents = pgTable(
  "ingestion_event",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id),
    idempotencyKey: text("idempotency_key").notNull(),
    rawPayload: jsonb("raw_payload").notNull().$type<unknown>(),
    status: ingestionStatusEnum("status").notNull().default("RECEIVED"),
    resolvedScanId: uuid("resolved_scan_id"),
    responsePayload: jsonb("response_payload").$type<unknown>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("uq_ingest_idem").on(table.deviceId, table.idempotencyKey),
    index("ix_ingestion_org").on(table.orgId, table.createdAt),
  ],
);

export const scans = pgTable(
  "scan",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    lesionId: uuid("lesion_id")
      .notNull()
      .references(() => lesions.id),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    source: scanSourceEnum("source").notNull(),
    status: scanStatusEnum("status").notNull().default("FINALIZED"),
    deviceId: uuid("device_id").references(() => devices.id),
    recordedByUserId: uuid("recorded_by_user_id").references(() => users.id),
    ingestionEventId: uuid("ingestion_event_id").references(
      () => ingestionEvents.id,
    ),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (table) => [
    index("ix_scan_lesion_captured")
      .on(table.orgId, table.lesionId, table.capturedAt)
      .where(sql`${table.deletedAt} is null`),
    index("ix_scan_org_created")
      .on(table.orgId, table.createdAt)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const classifications = pgTable(
  "classification",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => scans.id),
    label: classificationLabelEnum("label").notNull(),
    confidence: numeric("confidence", { precision: 5, scale: 4 })
      .notNull()
      .$type<number>(),
    confidenceLabel: classificationLabelEnum("confidence_label").notNull(),
    metrics: jsonb("metrics").notNull().$type<ScanMetrics>(),
    metricsScale: metricsScaleEnum("metrics_scale").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("uq_classification_scan").on(table.scanId),
    index("ix_classification_org_label").on(table.orgId, table.label),
  ],
);

export const scanImages = pgTable(
  "scan_image",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => scans.id),
    objectKey: text("object_key").notNull(),
    imageType: imageTypeEnum("image_type").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    contentHash: text("content_hash").notNull(),
    width: integer("width"),
    height: integer("height"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (table) => [
    index("ix_scan_image_scan")
      .on(table.orgId, table.scanId)
      .where(sql`${table.deletedAt} is null`),
    index("ix_scan_image_key").on(table.orgId, table.objectKey),
  ],
);

export const aiInsights = pgTable(
  "ai_insight",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    subjectType: insightSubjectEnum("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    kind: insightKindEnum("kind").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    inputHash: text("input_hash").notNull(),
    content: jsonb("content").notNull().$type<unknown>(),
    status: insightStatusEnum("status").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    supersededById: uuid("superseded_by_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("uq_insight_current")
      .on(table.subjectType, table.subjectId, table.kind)
      .where(
        sql`${table.supersededById} is null and ${table.status} = 'COMPLETED'`,
      ),
    index("ix_insight_cache").on(
      table.orgId,
      table.subjectType,
      table.subjectId,
      table.kind,
      table.inputHash,
      table.promptVersion,
      table.model,
    ),
    index("ix_insight_patient").on(table.orgId, table.patientId),
  ],
);

export const managementPlans = pgTable(
  "management_plan",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    lesionId: uuid("lesion_id")
      .notNull()
      .references(() => lesions.id),
    status: managementStatusEnum("status").notNull().default("MONITORING"),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    recallIntervalDays: integer("recall_interval_days"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (table) => [
    uniqueIndex("uq_management_plan_lesion")
      .on(table.orgId, table.lesionId)
      .where(sql`${table.deletedAt} is null`),
    index("ix_management_plan_review").on(table.orgId, table.nextReviewAt),
  ],
);

export const managementNotes = pgTable(
  "management_note",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    planId: uuid("plan_id")
      .notNull()
      .references(() => managementPlans.id),
    body: text("body").notNull(),
    authorUserId: uuid("author_user_id").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (table) => [
    index("ix_management_note_plan")
      .on(table.orgId, table.planId, table.createdAt)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const auditLogs = pgTable(
  "audit_log",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    actorType: auditActorEnum("actor_type").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    actorDeviceId: uuid("actor_device_id").references(() => devices.id),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    ip: text("ip"),
    userAgentHash: text("user_agent_hash"),
    metadata: jsonb("metadata").notNull().default({}).$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("ix_audit_org_created").on(table.orgId, table.createdAt),
    index("ix_audit_resource").on(table.orgId, table.resourceType, table.resourceId),
  ],
);

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Lesion = typeof lesions.$inferSelect;
export type Scan = typeof scans.$inferSelect;
export type Classification = typeof classifications.$inferSelect;
export type ScanImage = typeof scanImages.$inferSelect;
export type AiInsight = typeof aiInsights.$inferSelect;
export type ManagementPlan = typeof managementPlans.$inferSelect;
export type ManagementNote = typeof managementNotes.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type IngestionEvent = typeof ingestionEvents.$inferSelect;
