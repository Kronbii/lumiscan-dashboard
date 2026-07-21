import Link from "next/link";
import { NotebookPen } from "lucide-react";
import {
  addManagementNoteAction,
  setManagementStatusAction,
  setRecallAction,
} from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import {
  Datum,
  Overline,
  StatusChip,
  type StatusTone,
} from "@/components/ui/instrument";
import { PageHeader } from "@/components/ui/page-header";
import { ToastForm } from "@/components/toast-form";
import { managementStatuses } from "@/lib/enums";
import { formatDate, formatLesionSite } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
import { managementService } from "@/server/services/management";
import { notFoundIfMissing } from "@/lib/rsc";

export const dynamic = "force-dynamic";

const statusTone: Record<(typeof managementStatuses)[number], StatusTone> = {
  MONITORING: "neutral",
  BIOPSY_RECOMMENDED: "suspicious",
  REFERRED: "accent",
  RESOLVED: "benign",
};

export default async function ManagementPage({
  params,
}: {
  params: Promise<{ patientId: string; lesionId: string }>;
}) {
  const { patientId, lesionId } = await params;
  const ctx = await getOrgContext();
  const { lesion, plan, notes } = await managementService
    .getPlanWithNotes(ctx, lesionId)
    .catch(notFoundIfMissing);
  const canManage = ctx.role !== "NURSE";
  const status = plan?.status ?? "MONITORING";
  const setStatusAction = setManagementStatusAction.bind(null, patientId, lesionId);
  const addNoteAction = addManagementNoteAction.bind(null, patientId, lesionId);
  const setRecall = setRecallAction.bind(null, patientId, lesionId);

  const review = plan?.nextReviewAt
    ? (() => {
        const days = Math.round(
          (new Date(plan.nextReviewAt).getTime() - Date.now()) / 86_400_000,
        );
        return {
          date: plan.nextReviewAt,
          label: days < 0 ? "OVERDUE" : days <= 14 ? "DUE SOON" : "SCHEDULED",
          tone: (days < 0 ? "malignant" : days <= 14 ? "suspicious" : "neutral") as StatusTone,
        };
      })()
    : null;
  const currentInterval = plan?.recallIntervalDays
    ? String(Math.round(plan.recallIntervalDays / 7))
    : "";

  return (
    <div className="mx-auto grid max-w-4xl gap-8">
      <PageHeader
        eyebrow={
          <Link
            href={`/app/patients/${patientId}/lesions/${lesionId}`}
            className="hover:text-muted"
          >
            ← {formatLesionSite(lesion.bodySide, lesion.bodyRegion)}
          </Link>
        }
        title="Management plan"
        description="Track follow-up status and clinical notes for this lesion."
      />

      <Card>
        <CardHeader>
          <CardTitle>01 · Follow-up status</CardTitle>
          <StatusChip label={status.replaceAll("_", " ")} tone={statusTone[status]} />
        </CardHeader>
        <CardContent className="grid gap-5">
          {canManage ? (
            <>
              <ToastForm
                action={setStatusAction}
                success="Status updated"
                className="flex flex-wrap gap-2"
              >
                <select
                  className={`${inputClass} sm:max-w-xs`}
                  name="status"
                  defaultValue={status}
                >
                  {managementStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="secondary">
                  Save status
                </Button>
              </ToastForm>
              <ToastForm
                action={addNoteAction}
                success="Follow-up note added"
                className="grid gap-2 border-t border-border pt-5"
              >
                <Field label="Add a follow-up note">
                  <textarea
                    className={textareaClass}
                    name="body"
                    rows={4}
                    placeholder="Document the clinical decision, plan, or observation…"
                    required
                  />
                </Field>
                <Button type="submit" className="justify-self-start">
                  Add note
                </Button>
              </ToastForm>
            </>
          ) : (
            <p className="text-sm text-muted">Read-only for the Nurse role.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>02 · Recall</CardTitle>
          {review ? <StatusChip label={review.label} tone={review.tone} /> : null}
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-[0.8125rem] text-muted">
            {review
              ? `Next review ${formatDate(review.date)}${currentInterval ? ` · every ${currentInterval} weeks` : ""}.`
              : "No follow-up scheduled for this lesion."}
          </p>
          {canManage ? (
            <ToastForm
              action={setRecall}
              success="Recall updated"
              className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            >
              <Field label="Review interval">
                <select className={inputClass} name="intervalWeeks" defaultValue={currentInterval}>
                  <option value="">No recall</option>
                  <option value="4">Every 4 weeks</option>
                  <option value="8">Every 8 weeks</option>
                  <option value="12">Every 12 weeks</option>
                  <option value="26">Every 26 weeks</option>
                  <option value="52">Every 52 weeks</option>
                </select>
              </Field>
              <Field label="Or exact date">
                <input className={inputClass} type="date" name="reviewDate" />
              </Field>
              <Button type="submit" variant="secondary">
                Set recall
              </Button>
            </ToastForm>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>03 · Notes</CardTitle>
          {notes.length > 0 ? (
            <Datum className="rounded-sm bg-surface-3 px-1.5 py-0.5 text-xs text-muted">
              {notes.length}
            </Datum>
          ) : null}
        </CardHeader>
        {notes.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title="No follow-up notes yet"
            description="Notes you add appear here as a running clinical record."
          />
        ) : (
          <ul className="divide-y divide-border">
            {notes.map((note) => (
              <li key={note.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <Overline className="text-muted">Clinical note</Overline>
                  <Datum className="text-[0.6875rem] text-faint">
                    {formatDate(note.createdAt)}
                  </Datum>
                </div>
                <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-foreground">
                  {note.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
