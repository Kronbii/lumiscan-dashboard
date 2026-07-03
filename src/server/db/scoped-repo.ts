import "server-only";

import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { uuidv7 } from "@/lib/id";
import type { ClassificationLabel, ManagementStatus } from "@/lib/enums";
import type { CreateFinalizedScanInput } from "@/lib/schemas/scan";
import type { PatientCreateInput, PatientUpdateInput } from "@/lib/schemas/patient";
import type { LesionCreateInput, LesionUpdateInput } from "@/lib/schemas/lesion";
import type { OrgContext } from "@/server/auth/org-context";
import { db, type Db } from "@/server/db/client";
import {
  aiInsights,
  classifications,
  devices,
  ingestionEvents,
  lesions,
  managementNotes,
  managementPlans,
  patients,
  scanImages,
  scans,
  type AiInsight,
  type Device,
  type IngestionEvent,
  type Lesion,
  type ManagementPlan,
  type Patient,
  type Scan,
  type ScanImage,
} from "@/server/db/schema";

function notFound(message = "Resource not found.") {
  return new TRPCError({ code: "NOT_FOUND", message });
}

function cleanOptional(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

type ScopedDb = Db;

function createScopedRepo(ctx: OrgContext, client: ScopedDb) {
  const activePatient = (idValue: string) =>
    and(
      eq(patients.orgId, ctx.orgId),
      eq(patients.id, idValue),
      isNull(patients.deletedAt),
    );

  const activeLesion = (idValue: string) =>
    and(
      eq(lesions.orgId, ctx.orgId),
      eq(lesions.id, idValue),
      isNull(lesions.deletedAt),
    );

  const activeScan = (idValue: string) =>
    and(
      eq(scans.orgId, ctx.orgId),
      eq(scans.id, idValue),
      isNull(scans.deletedAt),
    );

  return {
    patients: {
      async list() {
        return client
          .select()
          .from(patients)
          .where(and(eq(patients.orgId, ctx.orgId), isNull(patients.deletedAt)))
          .orderBy(asc(patients.lastName), asc(patients.firstName));
      },

      async getById(idValue: string) {
        const [patient] = await client
          .select()
          .from(patients)
          .where(activePatient(idValue))
          .limit(1);
        if (!patient) throw notFound();
        return patient;
      },

      async findByMrn(mrn: string) {
        const [patient] = await client
          .select()
          .from(patients)
          .where(
            and(
              eq(patients.orgId, ctx.orgId),
              eq(patients.mrn, mrn),
              isNull(patients.deletedAt),
            ),
          )
          .limit(1);
        return patient ?? null;
      },

      async create(input: PatientCreateInput) {
        const [patient] = await client
          .insert(patients)
          .values({
            id: uuidv7(),
            orgId: ctx.orgId,
            firstName: input.firstName,
            lastName: input.lastName,
            dateOfBirth: input.dateOfBirth,
            mrn: input.mrn,
            email: cleanOptional(input.email),
            phone: cleanOptional(input.phone),
            address: cleanOptional(input.address),
            notes: cleanOptional(input.notes),
          })
          .returning();
        if (!patient) throw notFound("Patient was not created.");
        return patient;
      },

      async update(input: PatientUpdateInput) {
        const patch = {
          firstName: input.firstName,
          lastName: input.lastName,
          dateOfBirth: input.dateOfBirth,
          mrn: input.mrn,
          email: input.email === undefined ? undefined : cleanOptional(input.email),
          phone: input.phone === undefined ? undefined : cleanOptional(input.phone),
          address: input.address === undefined ? undefined : cleanOptional(input.address),
          notes: input.notes === undefined ? undefined : cleanOptional(input.notes),
          updatedAt: new Date(),
        };
        const [patient] = await client
          .update(patients)
          .set(patch)
          .where(activePatient(input.id))
          .returning();
        if (!patient) throw notFound();
        return patient;
      },

      async softDelete(idValue: string) {
        const [patient] = await client
          .update(patients)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(activePatient(idValue))
          .returning();
        if (!patient) throw notFound();
        return patient;
      },
    },

    lesions: {
      async listByPatient(patientId: string) {
        await createScopedRepo(ctx, client).patients.getById(patientId);
        return client
          .select()
          .from(lesions)
          .where(
            and(
              eq(lesions.orgId, ctx.orgId),
              eq(lesions.patientId, patientId),
              isNull(lesions.deletedAt),
            ),
          )
          .orderBy(desc(lesions.createdAt));
      },

      async getById(idValue: string) {
        const [lesion] = await client
          .select()
          .from(lesions)
          .where(activeLesion(idValue))
          .limit(1);
        if (!lesion) throw notFound();
        return lesion;
      },

      async create(input: LesionCreateInput) {
        await createScopedRepo(ctx, client).patients.getById(input.patientId);
        const [lesion] = await client
          .insert(lesions)
          .values({
            id: uuidv7(),
            orgId: ctx.orgId,
            patientId: input.patientId,
            bodyRegion: input.bodyRegion,
            bodySide: input.bodySide,
            bodyLocationNote: input.bodyLocationNote,
            bodyMapX: input.bodyMapX,
            bodyMapY: input.bodyMapY,
            description: cleanOptional(input.description),
          })
          .returning();
        if (!lesion) throw notFound("Lesion was not created.");
        return lesion;
      },

      async update(input: LesionUpdateInput) {
        const patch = {
          patientId: input.patientId,
          bodyRegion: input.bodyRegion,
          bodySide: input.bodySide,
          bodyLocationNote: input.bodyLocationNote,
          bodyMapX: input.bodyMapX,
          bodyMapY: input.bodyMapY,
          description:
            input.description === undefined
              ? undefined
              : cleanOptional(input.description),
          updatedAt: new Date(),
        };
        const [lesion] = await client
          .update(lesions)
          .set(patch)
          .where(activeLesion(input.id))
          .returning();
        if (!lesion) throw notFound();
        return lesion;
      },

      async setRiskAndBaseline(input: {
        lesionId: string;
        currentRisk: ClassificationLabel;
        baselineScanId?: string;
      }) {
        const lesion = await createScopedRepo(ctx, client).lesions.getById(
          input.lesionId,
        );
        const [updated] = await client
          .update(lesions)
          .set({
            currentRisk: input.currentRisk,
            baselineScanId: lesion.baselineScanId ?? input.baselineScanId,
            updatedAt: new Date(),
          })
          .where(activeLesion(input.lesionId))
          .returning();
        if (!updated) throw notFound();
        return updated;
      },
    },

    scans: {
      async listByLesion(lesionId: string) {
        await createScopedRepo(ctx, client).lesions.getById(lesionId);
        const rows = await client
          .select({
            scan: scans,
            classification: classifications,
          })
          .from(scans)
          .innerJoin(classifications, eq(classifications.scanId, scans.id))
          .where(
            and(
              eq(scans.orgId, ctx.orgId),
              eq(scans.lesionId, lesionId),
              isNull(scans.deletedAt),
            ),
          )
          .orderBy(asc(scans.capturedAt));

        const scanIds = rows.map((row) => row.scan.id);
        const images =
          scanIds.length === 0
            ? []
            : await client
                .select()
                .from(scanImages)
                .where(
                  and(
                    eq(scanImages.orgId, ctx.orgId),
                    isNull(scanImages.deletedAt),
                    inArray(scanImages.scanId, scanIds),
                  ),
                );

        return rows.map((row) => ({
          ...row,
          images: images.filter((image) => image.scanId === row.scan.id),
        }));
      },

      async getById(idValue: string) {
        const [row] = await client
          .select({
            scan: scans,
            classification: classifications,
          })
          .from(scans)
          .innerJoin(classifications, eq(classifications.scanId, scans.id))
          .where(activeScan(idValue))
          .limit(1);
        if (!row) throw notFound();
        const images = await client
          .select()
          .from(scanImages)
          .where(
            and(
              eq(scanImages.orgId, ctx.orgId),
              eq(scanImages.scanId, idValue),
              isNull(scanImages.deletedAt),
            ),
          );
        return { ...row, images };
      },

      async insertFinalized(input: CreateFinalizedScanInput) {
        const scanId = uuidv7();
        const [scan] = await client
          .insert(scans)
          .values({
            id: scanId,
            orgId: ctx.orgId,
            lesionId: input.lesionId,
            capturedAt: input.capturedAt,
            source: input.source,
            status: "FINALIZED",
            deviceId: input.deviceId ?? null,
            recordedByUserId: ctx.actorType === "USER" ? ctx.userId : null,
            ingestionEventId: input.ingestionEventId ?? null,
          })
          .returning();
        if (!scan) throw notFound("Scan was not created.");

        await client.insert(classifications).values({
          id: uuidv7(),
          orgId: ctx.orgId,
          scanId,
          label: input.classification.label,
          confidence: input.classification.confidence,
          confidenceLabel: input.classification.confidenceLabel,
          metrics: input.classification.metrics,
          metricsScale: input.classification.metricsScale,
        });

        const hasPrimary = input.images.some((image) => image.isPrimary);
        await client.insert(scanImages).values(
          input.images.map((image, index) => ({
            id: uuidv7(),
            orgId: ctx.orgId,
            scanId,
            objectKey: image.objectKey,
            imageType: image.imageType,
            isPrimary: hasPrimary ? image.isPrimary : index === 0,
            contentHash: image.contentHash,
            width: image.width ?? null,
            height: image.height ?? null,
          })),
        );

        return createScopedRepo(ctx, client).scans.getById(scanId);
      },

      async attachImage(input: {
        scanId: string;
        image: CreateFinalizedScanInput["images"][number];
      }) {
        await createScopedRepo(ctx, client).scans.getById(input.scanId);
        const [image] = await client
          .insert(scanImages)
          .values({
            id: uuidv7(),
            orgId: ctx.orgId,
            scanId: input.scanId,
            objectKey: input.image.objectKey,
            imageType: input.image.imageType,
            isPrimary: input.image.isPrimary,
            contentHash: input.image.contentHash,
            width: input.image.width ?? null,
            height: input.image.height ?? null,
          })
          .returning();
        if (!image) throw notFound("Image was not attached.");
        return image;
      },

      async getImage(idValue: string) {
        const [image] = await client
          .select()
          .from(scanImages)
          .where(
            and(
              eq(scanImages.orgId, ctx.orgId),
              eq(scanImages.id, idValue),
              isNull(scanImages.deletedAt),
            ),
          )
          .limit(1);
        if (!image) throw notFound();
        return image;
      },
    },

    management: {
      async getPlan(lesionId: string) {
        await createScopedRepo(ctx, client).lesions.getById(lesionId);
        const [plan] = await client
          .select()
          .from(managementPlans)
          .where(
            and(
              eq(managementPlans.orgId, ctx.orgId),
              eq(managementPlans.lesionId, lesionId),
              isNull(managementPlans.deletedAt),
            ),
          )
          .limit(1);
        return plan ?? null;
      },

      async ensurePlan(lesionId: string, status: ManagementStatus = "MONITORING") {
        const existing = await createScopedRepo(ctx, client).management.getPlan(
          lesionId,
        );
        if (existing) return existing;
        const [plan] = await client
          .insert(managementPlans)
          .values({
            id: uuidv7(),
            orgId: ctx.orgId,
            lesionId,
            status,
          })
          .returning();
        if (!plan) throw notFound("Management plan was not created.");
        return plan;
      },

      async setStatus(lesionId: string, status: ManagementStatus) {
        const plan = await createScopedRepo(ctx, client).management.ensurePlan(
          lesionId,
        );
        const [updated] = await client
          .update(managementPlans)
          .set({ status, updatedAt: new Date() })
          .where(
            and(
              eq(managementPlans.orgId, ctx.orgId),
              eq(managementPlans.id, plan.id),
              isNull(managementPlans.deletedAt),
            ),
          )
          .returning();
        if (!updated) throw notFound();
        return updated;
      },

      async addNote(lesionId: string, body: string) {
        const plan = await createScopedRepo(ctx, client).management.ensurePlan(
          lesionId,
        );
        const [note] = await client
          .insert(managementNotes)
          .values({
            id: uuidv7(),
            orgId: ctx.orgId,
            planId: plan.id,
            body,
            authorUserId: ctx.actorType === "USER" ? ctx.userId : null,
          })
          .returning();
        if (!note) throw notFound("Management note was not created.");
        return note;
      },

      async listNotes(lesionId: string) {
        const plan = await createScopedRepo(ctx, client).management.getPlan(
          lesionId,
        );
        if (!plan) return [];
        return client
          .select()
          .from(managementNotes)
          .where(
            and(
              eq(managementNotes.orgId, ctx.orgId),
              eq(managementNotes.planId, plan.id),
              isNull(managementNotes.deletedAt),
            ),
          )
          .orderBy(desc(managementNotes.createdAt));
      },
    },

    insights: {
      async getCurrent(input: {
        subjectType: "SCAN" | "LESION";
        subjectId: string;
        kind: AiInsight["kind"];
      }) {
        const [insight] = await client
          .select()
          .from(aiInsights)
          .where(
            and(
              eq(aiInsights.orgId, ctx.orgId),
              eq(aiInsights.subjectType, input.subjectType),
              eq(aiInsights.subjectId, input.subjectId),
              eq(aiInsights.kind, input.kind),
              eq(aiInsights.status, "COMPLETED"),
              isNull(aiInsights.supersededById),
            ),
          )
          .limit(1);
        return insight ?? null;
      },

      async findCache(input: {
        subjectType: "SCAN" | "LESION";
        subjectId: string;
        kind: AiInsight["kind"];
        inputHash: string;
        promptVersion: string;
        model: string;
      }) {
        const [insight] = await client
          .select()
          .from(aiInsights)
          .where(
            and(
              eq(aiInsights.orgId, ctx.orgId),
              eq(aiInsights.subjectType, input.subjectType),
              eq(aiInsights.subjectId, input.subjectId),
              eq(aiInsights.kind, input.kind),
              eq(aiInsights.inputHash, input.inputHash),
              eq(aiInsights.promptVersion, input.promptVersion),
              eq(aiInsights.model, input.model),
              eq(aiInsights.status, "COMPLETED"),
            ),
          )
          .limit(1);
        return insight ?? null;
      },

      async supersedeCurrent(input: {
        subjectType: "SCAN" | "LESION";
        subjectId: string;
        kind: AiInsight["kind"];
        supersededById: string;
      }) {
        await client
          .update(aiInsights)
          .set({ supersededById: input.supersededById, updatedAt: new Date() })
          .where(
            and(
              eq(aiInsights.orgId, ctx.orgId),
              eq(aiInsights.subjectType, input.subjectType),
              eq(aiInsights.subjectId, input.subjectId),
              eq(aiInsights.kind, input.kind),
              eq(aiInsights.status, "COMPLETED"),
              isNull(aiInsights.supersededById),
            ),
          );
      },

      async insert(input: {
        id?: string;
        subjectType: "SCAN" | "LESION";
        subjectId: string;
        patientId: string;
        kind: AiInsight["kind"];
        model: string;
        promptVersion: string;
        inputHash: string;
        content: unknown;
        status: AiInsight["status"];
      }) {
        const insightId = input.id ?? uuidv7();
        const [insight] = await client
          .insert(aiInsights)
          .values({
            id: insightId,
            orgId: ctx.orgId,
            subjectType: input.subjectType,
            subjectId: input.subjectId,
            patientId: input.patientId,
            kind: input.kind,
            model: input.model,
            promptVersion: input.promptVersion,
            inputHash: input.inputHash,
            content: input.content,
            status: input.status,
            createdByUserId: ctx.actorType === "USER" ? ctx.userId : null,
          })
          .returning();
        if (!insight) throw notFound("Insight was not persisted.");
        return insight;
      },
    },

    devices: {
      async list() {
        return client
          .select()
          .from(devices)
          .where(eq(devices.orgId, ctx.orgId))
          .orderBy(desc(devices.createdAt));
      },

      async create(input: {
        name: string;
        serial: string;
        apiKeyPrefix: string;
        apiKeyHash: string;
      }) {
        const [device] = await client
          .insert(devices)
          .values({
            id: uuidv7(),
            orgId: ctx.orgId,
            name: input.name,
            serial: input.serial,
            apiKeyPrefix: input.apiKeyPrefix,
            apiKeyHash: input.apiKeyHash,
            status: "ACTIVE",
          })
          .returning();
        if (!device) throw notFound("Device was not created.");
        return device;
      },

      async revoke(idValue: string) {
        const [device] = await client
          .update(devices)
          .set({ status: "REVOKED", updatedAt: new Date() })
          .where(and(eq(devices.orgId, ctx.orgId), eq(devices.id, idValue)))
          .returning();
        if (!device) throw notFound();
        return device;
      },
    },

    ingestion: {
      async createEvent(input: {
        deviceId: string;
        idempotencyKey: string;
        rawPayload: unknown;
      }) {
        const idValue = uuidv7();
        await client
          .insert(ingestionEvents)
          .values({
            id: idValue,
            orgId: ctx.orgId,
            deviceId: input.deviceId,
            idempotencyKey: input.idempotencyKey,
            rawPayload: input.rawPayload,
            status: "RECEIVED",
          })
          .onConflictDoNothing({
            target: [ingestionEvents.deviceId, ingestionEvents.idempotencyKey],
          });

        const [event] = await client
          .select()
          .from(ingestionEvents)
          .where(
            and(
              eq(ingestionEvents.orgId, ctx.orgId),
              eq(ingestionEvents.deviceId, input.deviceId),
              eq(ingestionEvents.idempotencyKey, input.idempotencyKey),
            ),
          )
          .limit(1);
        if (!event) throw notFound("Ingestion event was not created.");
        return event;
      },

      async updateEvent(input: {
        id: string;
        status: IngestionEvent["status"];
        resolvedScanId?: string | null;
        responsePayload?: unknown;
      }) {
        const [event] = await client
          .update(ingestionEvents)
          .set({
            status: input.status,
            resolvedScanId: input.resolvedScanId ?? null,
            responsePayload: input.responsePayload,
            updatedAt: new Date(),
          })
          .where(
            and(eq(ingestionEvents.orgId, ctx.orgId), eq(ingestionEvents.id, input.id)),
          )
          .returning();
        if (!event) throw notFound();
        return event;
      },

      async listEvents() {
        return client
          .select()
          .from(ingestionEvents)
          .where(eq(ingestionEvents.orgId, ctx.orgId))
          .orderBy(desc(ingestionEvents.createdAt));
      },
    },
  };
}

export function repo(ctx: OrgContext) {
  return createScopedRepo(ctx, db);
}

export type ScopedRepo = ReturnType<typeof repo>;
export type TimelineScanRow = Awaited<
  ReturnType<ScopedRepo["scans"]["listByLesion"]>
>[number];

export type PatientRecord = Patient;
export type LesionRecord = Lesion;
export type ScanRecord = Scan;
export type ScanImageRecord = ScanImage;
export type ManagementPlanRecord = ManagementPlan;
export type DeviceRecord = Device;
