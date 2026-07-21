import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { formatLesionSite } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
import { lesionService } from "@/server/services/lesion";
import { ScanForm } from "./scan-form";

export const dynamic = "force-dynamic";

export default async function NewScanPage({
  params,
}: {
  params: Promise<{ patientId: string; lesionId: string }>;
}) {
  const { patientId, lesionId } = await params;
  const ctx = await getOrgContext();
  const lesion = await lesionService.getById(ctx, lesionId);
  const nowLocal = new Date().toISOString().slice(0, 16);
  const site = formatLesionSite(lesion.bodySide, lesion.bodyRegion);
  const lesionHref = `/app/patients/${patientId}/lesions/${lesionId}`;

  return (
    <div className="mx-auto grid w-full max-w-180 gap-7">
      <PageHeader
        eyebrow={
          <Link href={lesionHref} className="datum hover:text-muted">
            ← {site}
          </Link>
        }
        title="Record scan"
        description="Attach a dermoscopic image and finalize its classification and metrics."
      />

      <ScanForm
        cancelHref={lesionHref}
        lesionId={lesionId}
        nowLocal={nowLocal}
        patientId={patientId}
        site={site}
      />
    </div>
  );
}
