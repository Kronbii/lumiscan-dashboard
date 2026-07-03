import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ProfileSettingsPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Prototype Doctor</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">
            Local prototype identity. No external auth provider is configured.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
