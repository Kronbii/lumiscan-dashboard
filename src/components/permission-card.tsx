import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PermissionCard({
  title = "Permission required",
  message = "Your current session cannot access this clinical workspace.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-700" />
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
