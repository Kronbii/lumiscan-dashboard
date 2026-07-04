import Link from "next/link";
import { ClipboardList, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  return (
    <div className="grid gap-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <nav className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-faint">
            <Link href={`/app/patients/${patientId}`} className="hover:text-muted">
              {timeline.patient.firstName} {timeline.patient.lastName}
            </Link>
            <span>/</span>
            <span className="text-muted">Lesion</span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {formatLesionSite(timeline.lesion.bodySide, timeline.lesion.bodyRegion)}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">
            {timeline.lesion.bodyLocationNote}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild variant="secondary">
            <Link href={`/app/patients/${patientId}/lesions/${lesionId}/management`}>
              <ClipboardList /> Management
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/app/patients/${patientId}/lesions/${lesionId}/scans/new`}>
              <Plus /> Record scan
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <LesionTimelineClient data={timeline} />

        <aside className="grid h-fit gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Sparkles className="size-4" />
                </span>
                AI insight
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {currentInsight ? (
                <div className="grid gap-3 text-sm">
                  <p className="font-medium text-foreground">
                    {(currentInsight.content as Record<string, string>).overview ??
                      "Evolution narrative"}
                  </p>
                  <p className="leading-relaxed text-muted">
                    {(currentInsight.content as Record<string, string>).narrative ??
                      JSON.stringify(currentInsight.content)}
                  </p>
                  <p className="text-xs text-faint">
                    Generated {formatDate(currentInsight.createdAt)}
                  </p>
                  <p className="rounded-lg bg-surface-2 p-3 text-xs text-faint">
                    {(currentInsight.content as Record<string, string>).disclaimer}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  No evolution narrative generated yet for this scan series.
                </p>
              )}
              {canManage ? (
                <form action={generateAction}>
                  <Button type="submit" variant="soft" className="w-full">
                    <Sparkles /> Generate insight
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
                      className="rounded-lg border border-border bg-surface-2 p-3"
                    >
                      <p className="text-sm text-foreground">{note.body}</p>
                      <p className="mt-2 text-xs text-faint">
                        {formatDate(note.createdAt)}
                      </p>
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
