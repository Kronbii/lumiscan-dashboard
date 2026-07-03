import { TRPCError } from "@trpc/server";
import type { DeviceIngestPayload } from "@/lib/schemas/ingest";
import { createDeviceOrgContext } from "@/server/auth/org-context";
import { createFinalizedScan } from "@/server/services/scan-write";
import { repo } from "@/server/db/scoped-repo";
import type { AuthenticatedDevice } from "@/server/services/device";

const deviceRateLimit = new Map<string, { count: number; windowStart: number }>();

export function assertDeviceRateLimit(deviceId: string) {
  const now = Date.now();
  const current = deviceRateLimit.get(deviceId);
  if (!current || now - current.windowStart > 60_000) {
    deviceRateLimit.set(deviceId, { count: 1, windowStart: now });
    return;
  }
  current.count += 1;
  if (current.count > 60) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Device rate limit exceeded.",
    });
  }
}

async function resolveLesionId(
  ctx: ReturnType<typeof createDeviceOrgContext>,
  payload: DeviceIngestPayload,
) {
  const scoped = repo(ctx);
  if (payload.subject) {
    try {
      await scoped.lesions.getById(payload.subject.lesionId);
      return payload.subject.lesionId;
    } catch {
      return null;
    }
  }

  if (!payload.patientRef) return null;
  const patient = await scoped.patients.findByMrn(payload.patientRef.mrn);
  if (!patient) return null;
  const lesions = await scoped.lesions.listByPatient(patient.id);
  const matched = lesions.filter((lesion) => {
    const regionOk =
      !payload.patientRef?.bodyRegionHint ||
      lesion.bodyRegion === payload.patientRef.bodyRegionHint;
    const sideOk =
      !payload.patientRef?.bodySide || lesion.bodySide === payload.patientRef.bodySide;
    return regionOk && sideOk;
  });
  return matched.length === 1 ? matched[0]!.id : null;
}

export const ingestionService = {
  async ingestScan(input: {
    device: AuthenticatedDevice;
    idempotencyKey: string;
    payload: DeviceIngestPayload;
  }) {
    assertDeviceRateLimit(input.device.id);
    const ctx = createDeviceOrgContext({
      orgId: input.device.orgId,
      deviceId: input.device.id,
    });
    const scoped = repo(ctx);
    const event = await scoped.ingestion.createEvent({
      deviceId: input.device.id,
      idempotencyKey: input.idempotencyKey,
      rawPayload: input.payload,
    });

    if (event.responsePayload) {
      return event.responsePayload;
    }

    const lesionId = await resolveLesionId(ctx, input.payload);
    if (!lesionId) {
      const response = {
        status: "NEEDS_RECONCILIATION" as const,
        ingestionEventId: event.id,
      };
      await scoped.ingestion.updateEvent({
        id: event.id,
        status: "NEEDS_RECONCILIATION",
        responsePayload: response,
      });
      return response;
    }

    const scan = await createFinalizedScan(
      {
        lesionId,
        capturedAt: new Date(input.payload.capturedAt),
        source: "DEVICE",
        deviceId: input.device.id,
        ingestionEventId: event.id,
        classification: input.payload.classification,
        images: input.payload.images,
      },
      ctx,
    );

    const response = {
      status: "AUTO_MATCHED" as const,
      ingestionEventId: event.id,
      scanId: scan.scan.id,
    };
    await scoped.ingestion.updateEvent({
      id: event.id,
      status: "AUTO_MATCHED",
      resolvedScanId: scan.scan.id,
      responsePayload: response,
    });
    return response;
  },

  listEvents(ctx: ReturnType<typeof createDeviceOrgContext>) {
    return repo(ctx).ingestion.listEvents();
  },
};
