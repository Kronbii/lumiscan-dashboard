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
      <CardContent className="flex items-start gap-4">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-600/20">
          <ShieldAlert className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
