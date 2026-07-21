import { getOrgContext } from "@/server/auth/org-context";
import { getScanImageObject } from "@/server/storage/presign";
import { renderScanImage } from "@/server/storage/scan-image-fallback";

export const runtime = "nodejs";

// 1×1 seed stubs are ~68 bytes; anything this small is a placeholder, not a scan.
const PLACEHOLDER_MAX_BYTES = 512;

/*
  Org-scoped image proxy with a demo self-heal. next/image fetches this
  same-origin URL and re-encodes to WebP, so the browser only ever talks to
  this app's own origin. When the real object is present it is streamed as-is;
  when it is missing (hosted storage was never populated) or a 1×1 stub (local
  seed) a deterministic synthetic image is rendered in-process so the prototype
  never shows a broken image — in any environment, without syncing bytes.
  See scan-image-fallback.ts for the clinical caveat.
*/
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const objectKey = key.join("/");
  const ctx = await getOrgContext();

  // Prefer the real stored image.
  try {
    const { bytes, contentType } = await getScanImageObject(ctx, objectKey);
    if (bytes.byteLength > PLACEHOLDER_MAX_BYTES) {
      return new Response(new Uint8Array(bytes), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=86400, immutable",
        },
      });
    }
  } catch {
    // missing object or cross-org key — fall through to the org check + fallback
  }

  // Fallback only within the caller's org (getScanImageObject enforces the same
  // prefix; re-check here because the catch above swallows that rejection too).
  if (!objectKey.startsWith(`org_${ctx.orgId}/`)) {
    return new Response("Not found", { status: 404 });
  }

  const webp = objectKey.toLowerCase().endsWith(".webp");
  const buf = await renderScanImage({ seed: objectKey, webp });
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": webp ? "image/webp" : "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
