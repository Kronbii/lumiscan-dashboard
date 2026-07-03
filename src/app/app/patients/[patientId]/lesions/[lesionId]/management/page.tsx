import Link from "next/link";
import {
  addManagementNoteAction,
  setManagementStatusAction,
} from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { managementStatuses } from "@/lib/enums";
import { formatDate } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
import { managementService } from "@/server/services/management";

export const dynamic = "force-dynamic";

export default async function ManagementPage({
  params,
}: {
  params: Promise<{ patientId: string; lesionId: string }>;
}) {
  const { patientId, lesionId } = await params;
  const ctx = await getOrgContext();
  const plan = await managementService.getPlan(ctx, lesionId);
  const notes = await managementService.listNotes(ctx, lesionId);
  const canManage = ctx.role !== "NURSE";
  const setStatusAction = setManagementStatusAction.bind(null, patientId, lesionId);
  const addNoteAction = addManagementNoteAction.bind(null, patientId, lesionId);

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <div>
        <Link
          href={`/app/patients/${patientId}/lesions/${lesionId}`}
          className="text-sm text-teal-800"
        >
          Back to lesion
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Management plan</h1>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Follow-up status</h2>
            <Badge tone="amber">{plan?.status ?? "MONITORING"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
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
                <Button type="submit">Save</Button>
              </form>
              <form action={addNoteAction} className="grid gap-3">
                <Field label="Note">
                  <textarea className={inputClass} name="body" rows={4} required />
                </Field>
                <Button type="submit" variant="outline">
                  Add note
                </Button>
              </form>
            </>
          ) : (
            <p className="text-sm text-muted">Read-only for Assistant role.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Notes</h2>
        </CardHeader>
        <CardContent className="grid gap-3">
          {notes.length === 0 ? (
            <p className="text-sm text-muted">No follow-up notes yet.</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="rounded-md border border-border p-3">
                <p className="text-sm">{note.body}</p>
                <p className="mt-2 text-xs text-muted">{formatDate(note.createdAt)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
