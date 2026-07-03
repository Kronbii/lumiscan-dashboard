import { createDeviceOrgContext, type OrgContext } from "@/server/auth/org-context";
import { upsertMembership, upsertOrganization, upsertUser } from "@/server/db/system-repo";
import { repo } from "@/server/db/scoped-repo";
import { patientService } from "@/server/services/patient";
import { lesionService } from "@/server/services/lesion";
import { createFinalizedScan } from "@/server/services/scan-write";
import { deviceService } from "@/server/services/device";

async function makeContext(): Promise<OrgContext> {
  const org = await upsertOrganization({
    clerkOrgId: "org_demo_clinic",
    name: "Lumiscan Demo Clinic",
    slug: "demo-clinic",
  });
  const user = await upsertUser({
    clerkUserId: "user_demo_owner",
    email: "owner@example.invalid",
    displayName: "Demo Owner",
  });
  const membership = await upsertMembership({
    orgId: org.id,
    userId: user.id,
    role: "OWNER",
  });
  return {
    userId: user.id,
    orgId: org.id,
    role: "OWNER",
    membershipId: membership.id,
    actorType: "USER",
  };
}

async function main() {
  const ctx = await makeContext();
  const scoped = repo(ctx);
  const existingPatient = await scoped.patients.findByMrn("DEMO-001");
  const patient =
    existingPatient ??
    (await patientService.create(ctx, {
      firstName: "Avery",
      lastName: "Morgan",
      dateOfBirth: "1982-04-12",
      mrn: "DEMO-001",
      email: "",
      phone: "",
      address: "",
      notes: "Seeded demo patient.",
    }));

  const lesions = await lesionService.listByPatient(ctx, patient.id);
  const lesion =
    lesions.find((item) => item.bodyLocationNote.includes("left scapula")) ??
    (await lesionService.create(ctx, {
      patientId: patient.id,
      bodyRegion: "UPPER_BACK",
      bodySide: "LEFT",
      bodyLocationNote: "4cm below spine of left scapula",
      description: "Seeded lesion for progression demo.",
    }));

  const scans = await scoped.scans.listByLesion(lesion.id);
  if (scans.length < 3) {
    const baseKey = `org_${ctx.orgId}/patient_${patient.id}/lesion_${lesion.id}/seed`;
    await createFinalizedScan(
      {
        lesionId: lesion.id,
        capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120),
        source: "MANUAL",
        classification: {
          label: "BENIGN",
          confidence: 0.76,
          confidenceLabel: "BENIGN",
          metrics: { diameter_mm: 4.1, asymmetry_score: 2.1 },
          metricsScale: "CLINICIAN_MEASURED",
        },
        images: [
          {
            objectKey: `${baseKey}/scan-1.webp`,
            imageType: "DERMOSCOPIC",
            isPrimary: true,
            contentHash: "seedhash000000000000000000000000000001",
          },
        ],
      },
      ctx,
    );
    await createFinalizedScan(
      {
        lesionId: lesion.id,
        capturedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45),
        source: "MANUAL",
        classification: {
          label: "SUSPICIOUS",
          confidence: 0.82,
          confidenceLabel: "SUSPICIOUS",
          metrics: { diameter_mm: 6.8, asymmetry_score: 6.1 },
          metricsScale: "CLINICIAN_MEASURED",
        },
        images: [
          {
            objectKey: `${baseKey}/scan-2.webp`,
            imageType: "DERMOSCOPIC",
            isPrimary: true,
            contentHash: "seedhash000000000000000000000000000002",
          },
        ],
      },
      ctx,
    );
  }

  const devices = await scoped.devices.list();
  if (devices.length === 0) {
    const created = await deviceService.create(ctx, {
      name: "Demo ESP32",
      serial: "DEMO-ESP32-001",
    });
    console.log(`Seeded device key: ${created.rawKey}`);
  }

  const deviceCtx = createDeviceOrgContext({
    orgId: ctx.orgId,
    deviceId: devices[0]?.id ?? "00000000-0000-0000-0000-000000000000",
  });
  void deviceCtx;
  console.log(`Seed complete. Patient ${patient.id}, lesion ${lesion.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
