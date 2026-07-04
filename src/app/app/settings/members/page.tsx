import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const members = [
  {
    name: "Prototype Doctor",
    email: "prototype@example.invalid",
    role: "OWNER" as const,
  },
];

export default function MembersSettingsPage() {
  return (
    <div className="grid gap-7">
      <PageHeader
        title="Members"
        description="People with access to this clinical workspace."
      />

      <Card className="overflow-hidden">
        <ul className="divide-y divide-border">
          {members.map((member) => (
            <li
              key={member.email}
              className="flex items-center justify-between gap-3 px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <Avatar name={member.name} size="sm" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {member.name}
                  </p>
                  <p className="text-xs text-faint">{member.email}</p>
                </div>
              </div>
              <Badge tone="teal" dot>
                {member.role}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
