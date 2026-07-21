import type { OrgContext } from "@/server/auth/org-context";
import { repo } from "@/server/db/scoped-repo";
import { isFlaggedLabel } from "@/lib/enums";

export const dashboardService = {
  async overview(ctx: OrgContext) {
    const scoped = repo(ctx);
    const [patients, lesions] = await Promise.all([
      scoped.patients.list(),
      scoped.lesions.list(),
    ]);
    const flaggedLesions = lesions.filter((lesion) =>
      isFlaggedLabel(lesion.currentRisk),
    );
    const lesionById = new Map(flaggedLesions.map((lesion) => [lesion.id, lesion]));

    const recentScans = (
      await scoped.scans.recentFlagged([...lesionById.keys()], 6)
    )
      .map((row) => {
        const lesion = lesionById.get(row.scan.lesionId);
        return lesion ? { ...row, lesion } : null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

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
