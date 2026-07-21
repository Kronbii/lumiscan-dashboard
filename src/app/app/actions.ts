"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTOR_COOKIE, getOrgContext } from "@/server/auth/org-context";
import { patientService } from "@/server/services/patient";
import { lesionService } from "@/server/services/lesion";
import { managementService } from "@/server/services/management";
import { deviceService } from "@/server/services/device";
import { generateInsight } from "@/server/ai/insights";

export type ActionState = { ok: boolean; error?: string };

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function num(formData: FormData, key: string): number | undefined {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

// Switch the simulated persona (no real auth). Writes the actor cookie and
// re-renders the whole shell so every screen reflects the chosen identity/role.
export async function setActingPersonaAction(membershipId: string) {
  const store = await cookies();
  store.set(ACTOR_COOKIE, membershipId, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
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

export async function updatePatientAction(patientId: string, formData: FormData) {
  const ctx = await getOrgContext();
  await patientService.update(ctx, {
    id: patientId,
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
  revalidatePath(`/app/patients/${patientId}`);
  redirect(`/app/patients/${patientId}`);
}

export async function deletePatientAction(patientId: string) {
  const ctx = await getOrgContext();
  await patientService.softDelete(ctx, patientId);
  revalidatePath("/app/patients");
  redirect("/app/patients");
}

export async function createLesionAction(patientId: string, formData: FormData) {
  const ctx = await getOrgContext();
  const lesion = await lesionService.create(ctx, {
    patientId,
    bodyRegion: text(formData, "bodyRegion") as never,
    bodySide: text(formData, "bodySide") as never,
    bodyLocationNote: text(formData, "bodyLocationNote"),
    bodyMapX: num(formData, "bodyMapX"),
    bodyMapY: num(formData, "bodyMapY"),
    description: text(formData, "description"),
  });
  revalidatePath(`/app/patients/${patientId}`);
  redirect(`/app/patients/${patientId}/lesions/${lesion.id}`);
}

export async function updateLesionAction(
  patientId: string,
  lesionId: string,
  formData: FormData,
) {
  const ctx = await getOrgContext();
  await lesionService.update(ctx, {
    id: lesionId,
    patientId,
    bodyRegion: text(formData, "bodyRegion") as never,
    bodySide: text(formData, "bodySide") as never,
    bodyLocationNote: text(formData, "bodyLocationNote"),
    bodyMapX: num(formData, "bodyMapX"),
    bodyMapY: num(formData, "bodyMapY"),
    description: text(formData, "description"),
  });
  revalidatePath(`/app/patients/${patientId}`);
  revalidatePath(`/app/patients/${patientId}/lesions/${lesionId}`);
  redirect(`/app/patients/${patientId}/lesions/${lesionId}`);
}

export async function deleteLesionAction(patientId: string, lesionId: string) {
  const ctx = await getOrgContext();
  await lesionService.softDelete(ctx, lesionId);
  revalidatePath(`/app/patients/${patientId}`);
  redirect(`/app/patients/${patientId}`);
}

export async function setManagementStatusAction(
  patientId: string,
  lesionId: string,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getOrgContext();
  try {
    await managementService.setStatus(ctx, {
      lesionId,
      status: text(formData, "status") as never,
    });
  } catch {
    return { ok: false, error: "Couldn't update the status." };
  }
  revalidatePath(`/app/patients/${patientId}/lesions/${lesionId}`);
  return { ok: true };
}

export async function addManagementNoteAction(
  patientId: string,
  lesionId: string,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getOrgContext();
  const body = text(formData, "body");
  if (!body) return { ok: false, error: "Write a note before adding it." };
  try {
    await managementService.addNote(ctx, { lesionId, body });
  } catch {
    return { ok: false, error: "Couldn't add the note." };
  }
  revalidatePath(`/app/patients/${patientId}/lesions/${lesionId}`);
  return { ok: true };
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

export async function generateScanInsightAction(
  patientId: string,
  lesionId: string,
  scanId: string,
  kind: "CLINICAL_SUMMARY" | "PATIENT_EXPLANATION",
): Promise<GenerateInsightState> {
  const ctx = await getOrgContext();
  try {
    await generateInsight(ctx, { subjectType: "SCAN", subjectId: scanId, kind });
  } catch {
    return { ok: false, error: "Insight generation failed. Please try again." };
  }
  revalidatePath(`/app/patients/${patientId}/lesions/${lesionId}/scans/${scanId}`);
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

export async function revokeDeviceAction(formData: FormData): Promise<ActionState> {
  const ctx = await getOrgContext();
  try {
    await deviceService.revoke(ctx, text(formData, "id"));
  } catch {
    return { ok: false, error: "Couldn't revoke the device." };
  }
  revalidatePath("/app/settings/devices");
  return { ok: true };
}
