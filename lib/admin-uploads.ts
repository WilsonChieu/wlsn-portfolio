import { NextResponse } from "next/server";
import { jsonError } from "@/lib/admin-api";
import type { UploadRequestPhoto } from "@/lib/admin-validate";
import { VARIANT_WIDTHS, variantKey } from "@/lib/photo-keys";
import { bucketUsageBytes, presignPut, publicBucket } from "@/lib/r2";
import { STORAGE_LIMIT_BYTES, canStore, formatGB } from "@/lib/storage";

export interface SignedUpload {
  id: string;
  variants: { width: number; url: string }[];
}

export async function storageRefusal(photos: UploadRequestPhoto[]): Promise<NextResponse | null> {
  const used = await bucketUsageBytes();
  const incoming = photos.reduce((sum, p) => sum + p.sizes.reduce((a, b) => a + b, 0), 0);
  if (canStore(used, incoming)) return null;
  return jsonError(
    `Storage limit reached: ${formatGB(used)} used, uploads stop at ${formatGB(STORAGE_LIMIT_BYTES)} to stay free. Delete photos to make room.`,
    507
  );
}

// Each variant's byte size is signed into its URL, so the storage check above can't be bypassed.
export function signUploads(photos: UploadRequestPhoto[], keyFor: (id: string) => string): Promise<SignedUpload[]> {
  return Promise.all(
    photos.map(async (p) => ({
      id: p.id,
      variants: await Promise.all(
        VARIANT_WIDTHS.map(async (width, i) => ({
          width,
          url: await presignPut(publicBucket(), variantKey(keyFor(p.id), width), "image/jpeg", p.sizes[i]),
        }))
      ),
    }))
  );
}
