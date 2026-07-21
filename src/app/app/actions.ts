"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOrgContext } from "@/server/auth/org-context";
import { patientService } from "@/server/services/patient";
import { lesionService } from "@/server/services/lesion";
import { managementService } from "@/server/services/management";
import { deviceService } from "@/server/services/device";
import { generateInsight } from "@/server/ai/insights";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
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

export type GenerateInsightState = { ok: boolean; error?: string };

export async function generateEvolutionInsightAction(
  patientId: string,
  lesionId: string,
): Promise<GenerateInsightState> {
  const ctx = await getOrgContext();
  try {
    await generateInsight(ctx, {
      subjectType: "LESION",
      subjectId: lesionId,
      kind: "EVOLUTION_NARRATIVE",
    });
  } catch {
    // generateInsight already records a FAILED insight + audit; surface a
    // friendly message instead of crashing the page with a 500.
    return { ok: false, error: "Insight generation failed. Please try again." };
  }
  revalidatePath(`/app/patients/${patientId}/lesions/${lesionId}`);
  return { ok: true };
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
