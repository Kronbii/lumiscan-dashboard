import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Overline } from "@/components/ui/instrument";

export function PermissionCard({
  title = "Permission required",
  message = "Your current session cannot access this clinical workspace.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-sm border border-suspicious-border bg-suspicious-soft text-suspicious">
          <ShieldAlert className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <Overline className="text-suspicious-ink">Access control</Overline>
          <h2 className="mt-1 text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-[0.8125rem] text-muted">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
