"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ClassificationLabel, MetricsScale } from "@/lib/enums";
import { getOrgContext } from "@/server/auth/org-context";
import { patientService } from "@/server/services/patient";
import { lesionService } from "@/server/services/lesion";
import { createFinalizedScan } from "@/server/services/scan-write";
import { managementService } from "@/server/services/management";
import { deviceService } from "@/server/services/device";
import { generateInsight } from "@/server/ai/insights";
import { uploadClinicalImageFromFile } from "@/server/storage/presign";
import type { ScanMetrics } from "@/lib/schemas/metrics";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalNumber(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

export async function createPatientAction(formData: FormData) {
  const ctx = await getOrgContext();
  const patient = await patientService.create(ctx, {
    firstName: text(formData, "firstName"),
    lastName: text(formData, "lastName"),
    dateOfBirth: text(formData, "dateOfBirth"),
    mrn: text(formData, "mrn"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    address: text(formData, "address"),
    notes: text(formData, "notes"),
  });
  revalidatePath("/app/patients");
  redirect(`/app/patients/${patient.id}`);
}

export async function createLesionAction(patientId: string, formData: FormData) {
  const ctx = await getOrgContext();
  const lesion = await lesionService.create(ctx, {
    patientId,
    bodyRegion: text(formData, "bodyRegion") as never,
    bodySide: text(formData, "bodySide") as never,
    bodyLocationNote: text(formData, "bodyLocationNote"),
    description: text(formData, "description"),
  });
  revalidatePath(`/app/patients/${patientId}`);
  redirect(`/app/patients/${patientId}/lesions/${lesion.id}`);
}

export async function createScanAction(
  patientId: string,
  lesionId: string,
  formData: FormData,
) {
  const ctx = await getOrgContext();
  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    throw new Error("A scan image is required.");
  }

  const uploaded = await uploadClinicalImageFromFile(ctx, { lesionId, file: image });
  const metrics: ScanMetrics = {
    diameter_mm: optionalNumber(formData, "diameter_mm"),
    asymmetry_score: optionalNumber(formData, "asymmetry_score"),
    border_irregularity_score: optionalNumber(
      formData,
      "border_irregularity_score",
    ),
    color_variation_score: optionalNumber(formData, "color_variation_score"),
    area_mm2: optionalNumber(formData, "area_mm2"),
  };

  await createFinalizedScan(
    {
      lesionId,
      capturedAt: new Date(text(formData, "capturedAt")),
      source: "MANUAL",
      classification: {
        label: text(formData, "label") as ClassificationLabel,
        confidence: Number(text(formData, "confidence")),
        confidenceLabel: text(formData, "confidenceLabel") as ClassificationLabel,
        metrics,
        metricsScale: text(formData, "metricsScale") as MetricsScale,
      },
      images: [
        {
          objectKey: uploaded.objectKey,
          contentHash: uploaded.contentHash,
          imageType: "DERMOSCOPIC",
          isPrimary: true,
        },
      ],
    },
    ctx,
  );
  revalidatePath(`/app/patients/${patientId}/lesions/${lesionId}`);
  redirect(`/app/patients/${patientId}/lesions/${lesionId}`);
}

export async function setManagementStatusAction(
  patientId: string,
  lesionId: string,
  formData: FormData,
) {
  const ctx = await getOrgContext();
  await managementService.setStatus(ctx, {
    lesionId,
    status: text(formData, "status") as never,
  });
  revalidatePath(`/app/patients/${patientId}/lesions/${lesionId}`);
}

export async function addManagementNoteAction(
  patientId: string,
  lesionId: string,
  formData: FormData,
) {
  const ctx = await getOrgContext();
  await managementService.addNote(ctx, {
    lesionId,
    body: text(formData, "body"),
  });
  revalidatePath(`/app/patients/${patientId}/lesions/${lesionId}`);
}

export async function generateEvolutionInsightAction(
  patientId: string,
  lesionId: string,
) {
  const ctx = await getOrgContext();
  await generateInsight(ctx, {
    subjectType: "LESION",
    subjectId: lesionId,
    kind: "EVOLUTION_NARRATIVE",
  });
  revalidatePath(`/app/patients/${patientId}/lesions/${lesionId}`);
}

export async function createDeviceAction(formData: FormData) {
  const ctx = await getOrgContext();
  const result = await deviceService.create(ctx, {
    name: text(formData, "name"),
    serial: text(formData, "serial"),
  });
  revalidatePath("/app/settings/devices");
  redirect(`/app/settings/devices?newKey=${encodeURIComponent(result.rawKey)}`);
}

export async function revokeDeviceAction(formData: FormData) {
  const ctx = await getOrgContext();
  await deviceService.revoke(ctx, text(formData, "id"));
  revalidatePath("/app/settings/devices");
}
