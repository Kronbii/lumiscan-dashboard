"use client";

import { useActionState, useEffect } from "react";
import type { ActionState } from "@/app/app/actions";
import { useToast } from "@/components/toast";

/*
  Wraps a server-action form so a successful mutation fires an Instrument Grade
  toast (and a failure shows the returned error), instead of silently
  revalidating. The action returns ActionState ({ ok, error }).
*/
export function ToastForm({
  action,
  success,
  successDetail,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<ActionState>;
  success: string;
  successDetail?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { show } = useToast();
  const [state, dispatch] = useActionState(
    async (_prev: ActionState | null, formData: FormData) => action(formData),
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) show({ tone: "success", title: success, detail: successDetail });
    else if (state.error) show({ tone: "critical", title: "Couldn't save", detail: state.error });
  }, [state, show, success, successDetail]);

  return (
    <form action={dispatch} className={className}>
      {children}
    </form>
  );
}
