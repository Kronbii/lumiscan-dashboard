import Link from "next/link";
import { Brain, ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
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
import { Field, inputClass } from "@/components/ui/field";

export const dynamic = "force-dynamic";

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
  const generateAction = generateEvolutionInsightAction.bind(null, patientId, lesionId);
  const setStatusAction = setManagementStatusAction.bind(null, patientId, lesionId);
  const addNoteAction = addManagementNoteAction.bind(null, patientId, lesionId);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            <Link href={`/app/patients/${patientId}`} className="text-teal-800">
              Patient
            </Link>{" "}
            / Lesion
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            {timeline.lesion.bodySide} {timeline.lesion.bodyRegion}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            {timeline.lesion.bodyLocationNote}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/app/patients/${patientId}/lesions/${lesionId}/scans/new`}>
              <Plus className="h-4 w-4" /> Record scan
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/app/patients/${patientId}/lesions/${lesionId}/management`}>
              <ClipboardList className="h-4 w-4" /> Management
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <LesionTimelineClient data={timeline} />

        <aside className="grid h-fit gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-teal-800" />
                <h2 className="font-semibold">AI insight</h2>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              {currentInsight ? (
                <div className="grid gap-3 text-sm">
                  <p className="font-medium">
                    {(currentInsight.content as Record<string, string>).overview ??
                      "Evolution narrative"}
                  </p>
                  <p className="text-muted">
                    {(currentInsight.content as Record<string, string>).narrative ??
                      JSON.stringify(currentInsight.content)}
                  </p>
                  <p className="text-xs text-muted">
                    Generated {formatDate(currentInsight.createdAt)}
                  </p>
                  <p className="rounded-md bg-zinc-50 p-2 text-xs text-muted">
                    {(currentInsight.content as Record<string, string>).disclaimer}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  No stored evolution narrative for this scan series.
                </p>
              )}
              {canManage ? (
                <form action={generateAction}>
                  <Button type="submit" className="w-full">
                    Generate insight
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>

          <Card
            className={
              timeline.flagged ? "border-amber-300 bg-amber-50/40" : undefined
            }
          >
            <CardHeader>
              <h2 className="font-semibold">Management plan</h2>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted">Status</span>
                <Badge tone={timeline.flagged ? "amber" : "grey"}>
                  {plan?.status ?? "MONITORING"}
                </Badge>
              </div>
              {canManage ? (
                <>
                  <form action={setStatusAction} className="flex gap-2">
                    <select className={inputClass} name="status" defaultValue={plan?.status ?? "MONITORING"}>
                      {managementStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" variant="outline">
                      Save
                    </Button>
                  </form>
                  <form action={addNoteAction} className="grid gap-2">
                    <Field label="Follow-up note">
                      <textarea className={inputClass} name="body" rows={3} required />
                    </Field>
                    <Button type="submit" variant="outline">
                      Add note
                    </Button>
                  </form>
                </>
              ) : (
                <p className="text-sm text-muted">Read-only for Assistant role.</p>
              )}
              <div className="grid gap-2">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-md border border-border bg-white p-3">
                    <p className="text-sm">{note.body}</p>
                    <p className="mt-2 text-xs text-muted">{formatDate(note.createdAt)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
