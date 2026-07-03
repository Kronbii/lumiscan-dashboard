import { TRPCError } from "@trpc/server";
import { isFlaggedLabel } from "@/lib/enums";
import {
  createFinalizedScanSchema,
  type CreateFinalizedScanInput,
} from "@/lib/schemas/scan";
import type { OrgContext } from "@/server/auth/org-context";
import { audit } from "@/server/audit/audit";
import { repo } from "@/server/db/scoped-repo";

export async function createFinalizedScan(
  input: CreateFinalizedScanInput,
  ctx: OrgContext,
) {
  const parsed = createFinalizedScanSchema.parse(input);
  if (parsed.images.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A finalized scan requires at least one image.",
    });
  }

  const scoped = repo(ctx);
  await scoped.lesions.getById(parsed.lesionId);
  const result = await scoped.scans.insertFinalized(parsed);

  await scoped.lesions.setRiskAndBaseline({
    lesionId: parsed.lesionId,
    currentRisk: parsed.classification.label,
    baselineScanId: result.scan.id,
  });

  if (isFlaggedLabel(parsed.classification.label)) {
    await scoped.management.ensurePlan(parsed.lesionId);
  }

  await audit(ctx, {
    action: "scan.finalize",
    resourceType: "scan",
    resourceId: result.scan.id,
    metadata: {
      source: parsed.source,
    },
  });

  return result;
}
