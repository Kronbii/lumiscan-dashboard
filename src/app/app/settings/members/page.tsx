import { addMemberAction, removeMemberAction, setMemberRoleAction } from "@/app/app/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAction } from "@/components/confirm-action";
import { Field, inputClass } from "@/components/ui/field";
import { Datum, StatusChip, type StatusTone } from "@/components/ui/instrument";
import { PageHeader } from "@/components/ui/page-header";
import { ToastForm } from "@/components/toast-form";
import { userRoles } from "@/lib/enums";
import { formatDate } from "@/lib/utils";
import { canManageOrg } from "@/server/auth/require-role";
import { getOrgContext } from "@/server/auth/org-context";
import { listOrgMembers } from "@/server/db/system-repo";

export const dynamic = "force-dynamic";

const roleRank: Record<string, number> = { OWNER: 0, ADMIN: 1, DOCTOR: 2, NURSE: 3 };
function roleTone(role: string): StatusTone {
  return role === "OWNER" || role === "ADMIN" ? "accent" : "neutral";
}

export default async function MembersSettingsPage() {
  const ctx = await getOrgContext();
  const canManage = canManageOrg(ctx.role);
  const members = (await listOrgMembers(ctx.orgId)).sort(
    (a, b) =>
      (roleRank[a.membership.role] ?? 9) - (roleRank[b.membership.role] ?? 9) ||
      a.user.displayName.localeCompare(b.user.displayName),
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Members"
        description="People with access to this clinical workspace."
      />

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>01 · Roster</CardTitle>
          <Datum className="text-xs text-faint">
            {members.length} {members.length === 1 ? "member" : "members"}
            {canManage ? "" : " · view only"}
          </Datum>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[0.8125rem]">
            <thead>
              <tr className="border-b border-border-strong">
                <th className="overline h-10 px-4 font-medium">Member</th>
                <th className="overline h-10 px-4 font-medium">Email</th>
                <th className="overline h-10 px-4 font-medium">Role</th>
                <th className="overline h-10 px-4 font-medium">Joined</th>
                {canManage ? (
                  <th className="h-10 px-4">
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {members.map(({ user, membership }) => {
                const isSelf = membership.id === ctx.membershipId;
                return (
                  <tr key={membership.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={user.displayName} size="sm" />
                        <span className="font-medium text-foreground">{user.displayName}</span>
                        {isSelf ? <StatusChip label="YOU" tone="accent" /> : null}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <Datum className="text-xs text-muted">{user.email}</Datum>
                    </td>
                    <td className="px-4 py-2">
                      {canManage && !isSelf ? (
                        <ToastForm
                          action={setMemberRoleAction.bind(null, membership.id)}
                          success="Role updated"
                          className="flex items-center gap-1.5"
                        >
                          <select
                            className={`${inputClass} h-8 py-0 text-xs`}
                            name="role"
                            defaultValue={membership.role}
                          >
                            {userRoles.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" variant="ghost" size="sm">
                            Save
                          </Button>
                        </ToastForm>
                      ) : (
                        <StatusChip label={membership.role} tone={roleTone(membership.role)} />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Datum className="text-xs text-muted">{formatDate(membership.createdAt)}</Datum>
                    </td>
                    {canManage ? (
                      <td className="px-4 py-1.5 text-right">
                        {!isSelf ? (
                          <ConfirmAction
                            action={removeMemberAction.bind(null, membership.id)}
                            label="Remove"
                            message="Removes access for this member."
                            confirmLabel="Remove"
                            pendingLabel="Removing…"
                          />
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>02 · Add member</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <ToastForm
              action={addMemberAction}
              success="Member added"
              className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            >
              <Field label="Display name">
                <input className={inputClass} name="displayName" placeholder="Dr. Jordan Vale" required />
              </Field>
              <Field label="Email">
                <input className={inputClass} name="email" type="email" placeholder="j.vale@clinic" required />
              </Field>
              <Field label="Role">
                <select className={inputClass} name="role" defaultValue="DOCTOR">
                  {userRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-3">
                <Button type="submit">Add member</Button>
              </div>
            </ToastForm>
            <p className="datum text-[0.6875rem] uppercase tracking-[0.08em] text-faint">
              No credentials — simulated identity for the persona switcher.
            </p>
          </CardContent>
        </Card>
      ) : (
        <p className="text-[0.8125rem] text-muted">
          Switch to an owner or admin persona to manage members.
        </p>
      )}
    </div>
  );
}
