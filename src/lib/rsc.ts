import { notFound } from "next/navigation";

/*
  Use in a server component's data-fetch catch: a scoped-repo NOT_FOUND (bad or
  stale id in the URL) becomes a real 404 (renders not-found.tsx) instead of
  bubbling up as an unhandled Server Components error. Anything else re-throws
  to the error boundary.
*/
export function notFoundIfMissing(error: unknown): never {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "NOT_FOUND"
  ) {
    notFound();
  }
  throw error;
}
