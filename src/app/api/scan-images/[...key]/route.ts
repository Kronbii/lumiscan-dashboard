import { getOrgContext } from "@/server/auth/org-context";
import { getScanImageObject } from "@/server/storage/presign";

/*
  Org-scoped image proxy. next/image fetches this same-origin URL, streams the
  bytes from object storage server-side, and re-encodes to WebP — so the
  browser only ever talks to this app's own origin. Scan-image object keys are
  content-addressed and immutable, so responses are cached aggressively.
*/
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const objectKey = key.join("/");

  const ctx = await getOrgContext();

  try {
    const { bytes, contentType } = await getScanImageObject(ctx, objectKey);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
