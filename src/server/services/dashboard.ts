import type { OrgContext } from "@/server/auth/org-context";
import { repo } from "@/server/db/scoped-repo";
import { isFlaggedLabel } from "@/lib/enums";

export const dashboardService = {
  async overview(ctx: OrgContext) {
    const scoped = repo(ctx);
    const patients = await scoped.patients.list();
    const flaggedLesions = (
      await Promise.all(
        patients.map(async (patient) => scoped.lesions.listByPatient(patient.id)),
      )
    )
      .flat()
      .filter((lesion) => isFlaggedLabel(lesion.currentRisk));

    const recentScans = (
      await Promise.all(
        flaggedLesions.slice(0, 10).map(async (lesion) =>
          (await scoped.scans.listByLesion(lesion.id)).map((row) => ({
            ...row,
            lesion,
          })),
        ),
      )
    )
      .flat()
      .sort(
        (a, b) =>
          b.scan.capturedAt.getTime() - a.scan.capturedAt.getTime(),
      )
      .slice(0, 6);

    return {
      counts: {
        patients: patients.length,
        flaggedLesions: flaggedLesions.length,
        recentScans: recentScans.length,
      },
      flaggedLesions,
      recentScans,
    };
  },
};
