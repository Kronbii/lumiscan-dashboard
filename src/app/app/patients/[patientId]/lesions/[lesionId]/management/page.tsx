import Link from "next/link";
import { NotebookPen } from "lucide-react";
import {
  addManagementNoteAction,
  setManagementStatusAction,
} from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { managementStatuses } from "@/lib/enums";
import { formatDate, formatLesionSite } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
import { lesionService } from "@/server/services/lesion";
import { managementService } from "@/server/services/management";

export const dynamic = "force-dynamic";

const statusTone = {
  MONITORING: "teal",
  BIOPSY_RECOMMENDED: "amber",
  REFERRED: "amber",
  RESOLVED: "green",
} as const;

export default async function ManagementPage({
  params,
}: {
  params: Promise<{ patientId: string; lesionId: string }>;
}) {
  const { patientId, lesionId } = await params;
  const ctx = await getOrgContext();
  const lesion = await lesionService.getById(ctx, lesionId);
  const plan = await managementService.getPlan(ctx, lesionId);
  const notes = await managementService.listNotes(ctx, lesionId);
  const canManage = ctx.role !== "NURSE";
  const status = plan?.status ?? "MONITORING";
  const setStatusAction = setManagementStatusAction.bind(null, patientId, lesionId);
  const addNoteAction = addManagementNoteAction.bind(null, patientId, lesionId);

  return (
    <div className="mx-auto grid max-w-4xl gap-7">
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
          <CardTitle>Follow-up status</CardTitle>
          <Badge tone={statusTone[status]} dot>
            {status.replaceAll("_", " ")}
          </Badge>
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
              <form action={addNoteAction} className="grid gap-2 border-t border-border pt-5">
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
          <CardTitle>Notes</CardTitle>
          {notes.length > 0 ? (
            <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-muted">
              {notes.length}
            </span>
          ) : null}
        </CardHeader>
        {notes.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title="No follow-up notes yet"
            description="Notes you add appear here as a running clinical record."
          />
        ) : (
          <CardContent className="grid gap-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-lg border border-border bg-surface-2 p-4"
              >
                <p className="text-sm text-foreground">{note.body}</p>
                <p className="mt-2 text-xs text-faint">{formatDate(note.createdAt)}</p>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
