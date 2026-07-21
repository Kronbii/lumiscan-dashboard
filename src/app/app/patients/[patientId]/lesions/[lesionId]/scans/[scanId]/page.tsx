import Link from "next/link";
import { ImageOff } from "lucide-react";
import { generateScanInsightAction } from "@/app/app/actions";
import { AbcdePanel } from "@/components/abcde-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Datum,
  Fascia,
  Led,
  Overline,
  SectionLabel,
  StatusChip,
  classificationTone,
} from "@/components/ui/instrument";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate, formatLesionSite, formatPercent, humanize } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
import { repo } from "@/server/db/scoped-repo";
import { lesionService } from "@/server/services/lesion";
import { scanImageProxyPath } from "@/server/storage/presign";
import { notFoundIfMissing } from "@/lib/rsc";
import { GenerateInsightButton } from "@/app/app/patients/[patientId]/lesions/[lesionId]/generate-insight-button";
import { ScanDetailImage } from "@/app/app/patients/[patientId]/lesions/[lesionId]/scans/[scanId]/scan-detail-image";

export const dynamic = "force-dynamic";

function str(content: Record<string, unknown>, key: string) {
  const v = content[key];
  return typeof v === "string" && v.trim() ? v : null;
}
function list(content: Record<string, unknown>, key: string) {
  const v = content[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function InsightBody({
  content,
  fields,
}: {
  content: Record<string, unknown>;
  fields: Array<{ key: string; label?: string; list?: boolean }>;
}) {
  return (
    <div className="grid gap-3 text-[0.8125rem]">
      {fields.map((f) => {
        if (f.list) {
          const items = list(content, f.key);
          if (items.length === 0) return null;
          return (
            <div key={f.key} className="grid gap-1.5">
              {f.label ? <Overline>{f.label}</Overline> : null}
              <ul className="grid gap-1">
                {items.map((item, i) => (
                  <li key={i} className="flex gap-2 text-muted">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-faint" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        const value = str(content, f.key);
        if (!value) return null;
        return (
          <div key={f.key} className="grid gap-1">
            {f.label ? <Overline>{f.label}</Overline> : null}
            <p className={f.key === "disclaimer" ? "rounded-sm border border-border bg-surface-2 p-3 text-xs text-muted" : "leading-relaxed text-muted"}>
              {value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ patientId: string; lesionId: string; scanId: string }>;
}) {
  const { patientId, lesionId, scanId } = await params;
  const ctx = await getOrgContext();
  const scoped = repo(ctx);

  const [record, lesion, summary, handout] = await Promise.all([
    scoped.scans.getById(scanId),
    lesionService.getById(ctx, lesionId),
    scoped.insights.getCurrent({ subjectType: "SCAN", subjectId: scanId, kind: "CLINICAL_SUMMARY" }),
    scoped.insights.getCurrent({ subjectType: "SCAN", subjectId: scanId, kind: "PATIENT_EXPLANATION" }),
  ]).catch(notFoundIfMissing);

  const { scan, classification, images } = record;
  const primary = images.find((i) => i.isPrimary) ?? images[0] ?? null;
  const site = formatLesionSite(lesion.bodySide, lesion.bodyRegion);
  const lesionHref = `/app/patients/${patientId}/lesions/${lesionId}`;
  const canManage = ctx.role !== "NURSE";
  const uncalibrated = classification.metricsScale === "UNCALIBRATED";

  const summaryContent = summary ? (summary.content as Record<string, unknown>) : null;
  const handoutContent = handout ? (handout.content as Record<string, unknown>) : null;

  const provenance = [
    { label: "Source", value: humanize(scan.source) },
    { label: "Captured", value: formatDate(scan.capturedAt) },
    { label: "Confidence basis", value: humanize(classification.confidenceLabel) },
    { label: "Metrics scale", value: humanize(classification.metricsScale), flag: uncalibrated },
  ];

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            <Link href={lesionHref} className="hover:text-foreground">
              ← {site}
            </Link>
            <span aria-hidden>·</span>
            <span>Scan · {formatDate(scan.capturedAt)}</span>
          </span>
        }
        title="Scan detail"
        description="A single dermatoscopic encounter — image, classification, measurements, and AI narratives."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <section className="grid gap-3">
            <SectionLabel index="01" title="Image" />
            {primary ? (
              <ScanDetailImage
                scan={{
                  scanId: scan.id,
                  capturedAt: scan.capturedAt.toISOString(),
                  source: scan.source,
                  label: classification.label,
                  confidence: Number(classification.confidence),
                  primaryImageUrl: scanImageProxyPath(primary.objectKey),
                }}
                site={site}
              />
            ) : (
              <div className="flex aspect-square w-full max-w-md items-center justify-center rounded-sm border border-border bg-surface-3 text-faint">
                <ImageOff className="size-6" strokeWidth={1.5} />
              </div>
            )}
          </section>

          <section className="grid gap-3">
            <SectionLabel index="02" title="Classification" />
            <div className="flex flex-wrap items-center gap-3 rounded-sm border border-border bg-surface px-4 py-3">
              <StatusChip
                label={classification.label}
                tone={classificationTone(classification.label)}
                confidence={formatPercent(classification.confidence)}
              />
              <Datum className="text-xs text-muted">
                {formatPercent(classification.confidence)} confidence
              </Datum>
            </div>
          </section>

          <section className="grid gap-3">
            <SectionLabel index="03" title="ABCDE assessment" />
            <AbcdePanel metrics={classification.metrics} />
          </section>

          <section className="grid gap-3">
            <SectionLabel index="04" title="Provenance" />
            <Fascia className="grid-cols-2 sm:grid-cols-4">
              {provenance.map((p) => (
                <div key={p.label} className="grid gap-1 bg-surface px-3 py-2.5">
                  <Overline className="block truncate">{p.label}</Overline>
                  <div className="flex items-center gap-1.5">
                    {p.flag ? <Led tone="suspicious" /> : null}
                    <Datum
                      className={p.flag ? "text-[0.8125rem] text-suspicious" : "text-[0.8125rem] text-foreground"}
                    >
                      {p.value}
                    </Datum>
                  </div>
                </div>
              ))}
            </Fascia>
            {uncalibrated ? (
              <p className="text-xs text-muted">
                Measurements are uncalibrated — treat absolute values with caution and rely on
                change over time.
              </p>
            ) : null}
          </section>
        </div>

        <aside className="grid h-fit gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Clinician summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {summaryContent ? (
                <InsightBody
                  content={summaryContent}
                  fields={[
                    { key: "summary" },
                    { key: "notableFindings", label: "Notable findings", list: true },
                    { key: "abcdeFlags", label: "ABCDE flags", list: true },
                    { key: "considerations", label: "Considerations", list: true },
                    { key: "confidenceInterpretation", label: "On confidence" },
                    { key: "disclaimer" },
                  ]}
                />
              ) : (
                <p className="text-sm text-muted">
                  No clinician summary generated for this scan yet.
                </p>
              )}
              {canManage ? (
                <GenerateInsightButton
                  action={generateScanInsightAction.bind(null, patientId, lesionId, scanId, "CLINICAL_SUMMARY")}
                  label={summaryContent ? "Regenerate summary" : "Generate summary"}
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Patient handout</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {handoutContent ? (
                <InsightBody
                  content={handoutContent}
                  fields={[
                    { key: "headline" },
                    { key: "whatThisMeans", label: "What this means" },
                    { key: "aboutConfidence", label: "About the score" },
                    { key: "nextSteps", label: "Next steps" },
                    { key: "disclaimer" },
                  ]}
                />
              ) : (
                <p className="text-sm text-muted">
                  No plain-language handout generated for this scan yet.
                </p>
              )}
              {canManage ? (
                <GenerateInsightButton
                  action={generateScanInsightAction.bind(null, patientId, lesionId, scanId, "PATIENT_EXPLANATION")}
                  label={handoutContent ? "Regenerate handout" : "Generate handout"}
                />
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
