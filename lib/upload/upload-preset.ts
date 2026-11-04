import type { PresetPhoto } from "@/lib/presets";
import { mapLimit } from "@/lib/pool";
import { assignPhotoIds } from "@/lib/upload/assign-ids";
import { putBlob, sendJson } from "@/lib/upload/http";
import { processPhoto } from "@/lib/upload/process-photo";
import type { FileStatus } from "@/lib/upload/upload-shoot";

export interface UploadedPresetPhoto {
  file: File;
  photo: PresetPhoto;
}

interface SignedPhoto {
  id: string;
  variants: { width: number; url: string }[];
}

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err));

// Resizes and uploads the files only; the caller commits them (as collage photos or as a pair).
export async function uploadPresetPhotos(
  slug: string,
  files: File[],
  taken: Set<string>,
  onStatus: (file: File, status: FileStatus) => void
): Promise<{ uploaded: UploadedPresetPhoto[]; failed: number }> {
  const ids = assignPhotoIds(files, (f) => f.name, taken, new Map());
  const concurrency = navigator.maxTouchPoints > 0 ? 1 : 2;
  const results = await mapLimit(files, concurrency, async (file) => {
    const id = ids.get(file)!;
    try {
      onStatus(file, { state: "processing" });
      const processed = await processPhoto(file);
      onStatus(file, { state: "uploading" });
      const {
        photos: [signed],
      } = await sendJson<{ photos: SignedPhoto[] }>("POST", `/api/admin/presets/${slug}/uploads`, {
        photos: [{ id, sizes: processed.variants.map((v) => v.blob.size) }],
      });
      await Promise.all(
        signed.variants.map((v) => {
          const blob = processed.variants.find((p) => p.width === v.width)?.blob;
          if (!blob) throw new Error(`Missing ${v.width}px version`);
          return putBlob(v.url, blob, "image/jpeg");
        })
      );
      return { file, photo: { id, width: processed.width, height: processed.height } };
    } catch (err) {
      onStatus(file, { state: "failed", error: messageOf(err) });
      return null;
    }
  });
  const uploaded = results.filter((r): r is UploadedPresetPhoto => r !== null);
  return { uploaded, failed: results.length - uploaded.length };
}
