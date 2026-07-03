import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function OrgSettingsPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Organization</h1>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Prototype Clinic</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">
            Authentication is disabled for this prototype. All pages use one local
            OWNER workspace.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
