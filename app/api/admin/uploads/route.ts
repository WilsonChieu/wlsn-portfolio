import { NextResponse } from "next/server";
import { jsonError, readBody, requireAdmin } from "@/lib/admin-api";
import { parseShootRef, parseUploadPhotos } from "@/lib/admin-validate";
import { VARIANT_WIDTHS, photoKey, variantKey } from "@/lib/photo-keys";
import { bucketUsageBytes, presignPut, publicBucket } from "@/lib/r2";
import { STORAGE_LIMIT_BYTES, canStore, formatGB } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readBody(req);
  const ref = parseShootRef(body);
  const photos = parseUploadPhotos((body as { photos?: unknown } | null)?.photos);
  if (!ref || !photos) return jsonError("Invalid upload request");

  const used = await bucketUsageBytes();
  const incoming = photos.reduce((sum, p) => sum + p.sizes.reduce((a, b) => a + b, 0), 0);
  if (!canStore(used, incoming)) {
    return jsonError(
      `Storage limit reached: ${formatGB(used)} used, uploads stop at ${formatGB(STORAGE_LIMIT_BYTES)} to stay free. Delete photos to make room.`,
      507
    );
  }

  const signed = await Promise.all(
    photos.map(async (p) => {
      const key = photoKey(ref.genre, ref.event, p.id);
      const variants = await Promise.all(
        VARIANT_WIDTHS.map(async (width, i) => ({
          width,
          url: await presignPut(publicBucket(), variantKey(key, width), "image/jpeg", p.sizes[i]),
        }))
      );
      return { id: p.id, variants };
    })
  );
  return NextResponse.json({ photos: signed });
}
