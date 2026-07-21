import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { addManagementNoteAction, setManagementStatusAction } from "@/app/app/actions";
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
import { managementStatuses } from "@/lib/enums";
import { formatDate, formatLesionSite } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
import { managementService } from "@/server/services/management";

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
  const { lesion, plan, notes } = await managementService.getPlanWithNotes(
    ctx,
    lesionId,
  );
  const canManage = ctx.role !== "NURSE";
  const status = plan?.status ?? "MONITORING";
  const setStatusAction = setManagementStatusAction.bind(null, patientId, lesionId);
  const addNoteAction = addManagementNoteAction.bind(null, patientId, lesionId);

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
              <form action={setStatusAction} className="flex flex-wrap gap-2">
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
              </form>
              <form
                action={addNoteAction}
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
              </form>
            </>
          ) : (
            <p className="text-sm text-muted">Read-only for the Nurse role.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>02 · Notes</CardTitle>
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
