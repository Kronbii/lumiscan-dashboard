import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function MembersSettingsPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Members</h1>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Prototype user</h2>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">Prototype Doctor</p>
            <p className="text-sm text-muted">prototype@example.invalid</p>
          </div>
          <Badge tone="teal">OWNER</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
