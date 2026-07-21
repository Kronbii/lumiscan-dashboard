import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-static";

export async function GET() {
  const body = await readFile(
    join(process.cwd(), "docs/device-ingestion-api.md"),
    "utf8",
  );

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
