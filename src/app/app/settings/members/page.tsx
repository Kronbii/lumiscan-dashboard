import { Avatar } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Datum, StatusChip, type StatusTone } from "@/components/ui/instrument";
import { PageHeader } from "@/components/ui/page-header";

const members = [
  {
    name: "Prototype Doctor",
    email: "prototype@example.invalid",
    role: "OWNER" as const,
    joined: "2026-01-01",
  },
];

function roleTone(role: string): StatusTone {
  return role === "OWNER" || role === "ADMIN" ? "accent" : "neutral";
}

export default function MembersSettingsPage() {
  return (
    <div className="grid gap-8">
      <PageHeader
        title="Members"
        description="People with access to this clinical workspace."
      />

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>01 · ROSTER</CardTitle>
          <Datum className="text-xs text-faint">
            {members.length} MEMBER{members.length === 1 ? "" : "S"}
          </Datum>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[0.8125rem]">
            <thead>
              <tr className="border-b border-border-strong">
                <th className="overline h-10 px-4 text-left font-medium">
                  Member
                </th>
                <th className="overline h-10 px-4 text-left font-medium">
                  Email
                </th>
                <th className="overline h-10 px-4 text-left font-medium">
                  Role
                </th>
                <th className="overline h-10 px-4 text-right font-medium">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.email}
                  className="h-10 border-b border-border transition-colors duration-100 last:border-0 hover:bg-surface-2"
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={member.name} size="sm" />
                      <span className="font-medium text-foreground">
                        {member.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Datum className="text-xs text-muted">{member.email}</Datum>
                  </td>
                  <td className="px-4 py-2">
                    <StatusChip label={member.role} tone={roleTone(member.role)} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Datum className="text-xs text-muted">{member.joined}</Datum>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
