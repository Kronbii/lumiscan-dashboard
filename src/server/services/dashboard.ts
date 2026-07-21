import type { OrgContext } from "@/server/auth/org-context";
import { repo } from "@/server/db/scoped-repo";
import { isFlaggedLabel } from "@/lib/enums";

export type ReviewState = "OVERDUE" | "DUE_SOON" | "SCHEDULED";

function reviewState(nextReviewAt: Date, now: number): ReviewState {
  const days = Math.round((nextReviewAt.getTime() - now) / 86_400_000);
  if (days < 0) return "OVERDUE";
  if (days <= 14) return "DUE_SOON";
  return "SCHEDULED";
}

export const dashboardService = {
  async overview(ctx: OrgContext) {
    const scoped = repo(ctx);
    const now = Date.now();
    const [patients, lesions, reviewRows, awaitingRows] = await Promise.all([
      scoped.patients.list(),
      scoped.lesions.list(),
      scoped.management.reviewQueue(),
      scoped.management.awaitingAction(),
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

    // Review queue: only lesions due within the next ~30 days or overdue, most
    // urgent first; keep the top few for the worklist.
    const reviewDue = reviewRows
      .filter((row) => row.plan.nextReviewAt)
      .map((row) => ({
        lesion: row.lesion,
        nextReviewAt: row.plan.nextReviewAt as Date,
        state: reviewState(row.plan.nextReviewAt as Date, now),
      }))
      .filter((row) => row.state !== "SCHEDULED")
      .slice(0, 6);

    const awaitingAction = awaitingRows
      .map((row) => ({ lesion: row.lesion, status: row.plan.status }))
      .slice(0, 6);

    const overdue = reviewRows.filter(
      (row) => row.plan.nextReviewAt && reviewState(row.plan.nextReviewAt, now) === "OVERDUE",
    ).length;

    return {
      counts: {
        patients: patients.length,
        flaggedLesions: flaggedLesions.length,
        recentScans: recentScans.length,
        reviewOverdue: overdue,
      },
      flaggedLesions,
      recentScans,
      reviewDue,
      awaitingAction,
    };
  },
};
