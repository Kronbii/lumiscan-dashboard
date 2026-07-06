import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Datum, Overline } from "@/components/ui/instrument";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate, formatLesionSite } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
import { repo } from "@/server/db/scoped-repo";
import { lesionService } from "@/server/services/lesion";
import { managementService } from "@/server/services/management";
import {
  addManagementNoteAction,
  generateEvolutionInsightAction,
  setManagementStatusAction,
} from "@/app/app/actions";
import { LesionTimelineClient } from "@/app/app/patients/[patientId]/lesions/[lesionId]/timeline-client";
import { managementStatuses } from "@/lib/enums";
import { Field, inputClass, textareaClass } from "@/components/ui/field";

export const dynamic = "force-dynamic";

const statusTone = {
  MONITORING: "teal",
  BIOPSY_RECOMMENDED: "amber",
  REFERRED: "amber",
  RESOLVED: "green",
} as const;

export default async function LesionDetailPage({
  params,
}: {
  params: Promise<{ patientId: string; lesionId: string }>;
}) {
  const { patientId, lesionId } = await params;
  const ctx = await getOrgContext();
  const timelineRaw = await lesionService.timeline(ctx, lesionId);
  const timeline = JSON.parse(JSON.stringify(timelineRaw)) as typeof timelineRaw;
  const currentInsight = await repo(ctx).insights.getCurrent({
    subjectType: "LESION",
    subjectId: lesionId,
    kind: "EVOLUTION_NARRATIVE",
  });
  const plan = await managementService.getPlan(ctx, lesionId);
  const notes = await managementService.listNotes(ctx, lesionId);
  const canManage = ctx.role !== "NURSE";
  const status = plan?.status ?? "MONITORING";
  const generateAction = generateEvolutionInsightAction.bind(null, patientId, lesionId);
  const setStatusAction = setManagementStatusAction.bind(null, patientId, lesionId);
  const addNoteAction = addManagementNoteAction.bind(null, patientId, lesionId);
  const site = formatLesionSite(timeline.lesion.bodySide, timeline.lesion.bodyRegion);
  const insightContent = currentInsight
    ? (currentInsight.content as Record<string, string>)
    : null;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={
          <>
            <Link
              href={`/app/patients/${patientId}`}
              className="transition-colors hover:text-foreground"
            >
              {timeline.patient.firstName} {timeline.patient.lastName}
            </Link>
            <span aria-hidden>/</span>
            <span>Lesion · {site}</span>
          </>
        }
        title={site}
        description={timeline.lesion.bodyLocationNote}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href={`/app/patients/${patientId}/lesions/${lesionId}/management`}>
                <ClipboardList strokeWidth={1.75} /> Management
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/app/patients/${patientId}/lesions/${lesionId}/scans/new`}>
                <Plus strokeWidth={1.75} /> Record scan
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <LesionTimelineClient data={timeline} />

        <aside className="grid h-fit gap-6">
          <Card>
            <CardHeader>
              <CardTitle>AI insight</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {insightContent ? (
                <div className="grid gap-3 text-sm">
                  <p className="font-medium text-foreground">
                    {insightContent.overview ?? "Evolution narrative"}
                  </p>
                  <p className="text-[0.8125rem] leading-relaxed text-muted">
                    {insightContent.narrative ??
                      JSON.stringify(currentInsight?.content)}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-3">
                    <Overline>Generated</Overline>
                    <Datum className="text-xs text-muted">
                      {formatDate(currentInsight!.createdAt)}
                    </Datum>
                  </div>
                  {insightContent.disclaimer ? (
                    <p className="rounded-sm border border-border bg-surface-2 p-3 text-xs text-muted">
                      {insightContent.disclaimer}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted">
                  No evolution narrative generated yet for this scan series.
                </p>
              )}
              {canManage ? (
                <form action={generateAction}>
                  <Button type="submit" variant="soft" className="w-full">
                    Generate insight
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Management plan</CardTitle>
              <Badge tone={statusTone[status]} dot>
                {status.replaceAll("_", " ")}
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-4">
              {canManage ? (
                <>
                  <form action={setStatusAction} className="flex gap-2">
                    <select className={inputClass} name="status" defaultValue={status}>
                      {managementStatuses.map((s) => (
                        <option key={s} value={s}>
                          {s.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" variant="secondary">
                      Save
                    </Button>
                  </form>
                  <form action={addNoteAction} className="grid gap-2">
                    <Field label="Follow-up note">
                      <textarea
                        className={textareaClass}
                        name="body"
                        rows={3}
                        placeholder="Add a clinical follow-up note…"
                        required
                      />
                    </Field>
                    <Button type="submit" variant="secondary" className="justify-self-start">
                      Add note
                    </Button>
                  </form>
                </>
              ) : (
                <p className="text-sm text-muted">Read-only for the Nurse role.</p>
              )}
              {notes.length > 0 ? (
                <div className="grid gap-2 border-t border-border pt-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-sm border border-border bg-surface-2 p-3"
                    >
                      <p className="text-sm text-foreground">{note.body}</p>
                      <Datum className="mt-2 block text-xs text-faint">
                        {formatDate(note.createdAt)}
                      </Datum>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
