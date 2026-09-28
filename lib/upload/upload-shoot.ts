import type { PhotoEntry } from "@/lib/manifest";
import { chunk, mapLimit } from "@/lib/pool";
import { assignPhotoIds } from "@/lib/upload/assign-ids";
import { processPhoto } from "@/lib/upload/process-photo";

export interface ShootJob {
  genre: string;
  event: string;
  title: string;
  files: File[];
}

export interface UploadResult {
  added: number;
  failed: number;
  live: boolean;
}

export type FileState = "processing" | "uploading" | "done" | "failed";

export interface FileStatus {
  state: FileState;
  error?: string;
}

interface SignedPhoto {
  id: string;
  variants: { width: number; url: string }[];
}

const COVER_FILE = /^cover\.[a-z0-9]+$/i;
// Keeps each commit request well under the server's 500-entry limit and the function timeout.
const COMMIT_BATCH_SIZE = 100;
const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err));

async function sendJson<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

async function put(url: string, body: Blob, contentType: string): Promise<void> {
  const res = await fetch(url, { method: "PUT", body, headers: { "Content-Type": contentType } });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
}

export async function uploadShoot(
  job: ShootJob,
  onStatus: (file: File, status: FileStatus) => void,
  knownIds: Map<File, string>
): Promise<UploadResult> {
  const query = `genre=${encodeURIComponent(job.genre)}&event=${encodeURIComponent(job.event)}`;
  const { manifest } = await sendJson<{ manifest: { photos: { id: string }[] } | null }>("GET", `/api/admin/events?${query}`);
  const taken = new Set(manifest?.photos.map((p) => p.id) ?? []);
  const ids = assignPhotoIds(job.files, (file) => file.name, taken, knownIds);
  const planned = job.files.map((file) => {
    const id = ids.get(file)!;
    knownIds.set(file, id);
    return { file, id, isCover: COVER_FILE.test(file.name) };
  });

  // Phones get one photo at a time: two decoded 24-megapixel photos can exhaust mobile browser memory.
  const concurrency = navigator.maxTouchPoints > 0 ? 1 : 2;
  const results = await mapLimit(planned, concurrency, async ({ file, id, isCover }) => {
    try {
      onStatus(file, { state: "processing" });
      const processed = await processPhoto(file);
      onStatus(file, { state: "uploading" });
      const sizes = processed.variants.map((v) => v.blob.size);
      const {
        photos: [signed],
      } = await sendJson<{ photos: SignedPhoto[] }>("POST", "/api/admin/uploads", {
        genre: job.genre,
        event: job.event,
        photos: [{ id, sizes }],
      });
      await Promise.all(
        signed.variants.map((v) => {
          const blob = processed.variants.find((p) => p.width === v.width)?.blob;
          if (!blob) throw new Error(`Missing ${v.width}px version`);
          return put(v.url, blob, "image/jpeg");
        })
      );
      const entry: PhotoEntry = isCover
        ? { id, width: processed.width, height: processed.height, hidden: true }
        : { id, width: processed.width, height: processed.height };
      return { file, entry, isCover };
    } catch (err) {
      onStatus(file, { state: "failed", error: messageOf(err) });
      return null;
    }
  });

  const uploaded = results.filter((r): r is NonNullable<typeof r> => r !== null);
  const outcome: UploadResult = { added: 0, failed: results.length - uploaded.length, live: false };
  if (uploaded.length === 0) return outcome;

  for (const batch of chunk(uploaded, COMMIT_BATCH_SIZE)) {
    try {
      const { missing, live } = await sendJson<{ committed: string[]; missing: string[]; live: boolean }>("POST", "/api/admin/photos", {
        genre: job.genre,
        event: job.event,
        title: job.title,
        coverId: batch.find((r) => r.isCover)?.entry.id ?? null,
        photos: batch.map((r) => r.entry),
      });
      const missingIds = new Set(missing);
      outcome.live = outcome.live || live;
      outcome.added += batch.length - missing.length;
      outcome.failed += missing.length;
      for (const r of batch) {
        onStatus(
          r.file,
          missingIds.has(r.entry.id) ? { state: "failed", error: "Upload didn't arrive in storage" } : { state: "done" }
        );
      }
    } catch (err) {
      outcome.failed += batch.length;
      for (const r of batch) onStatus(r.file, { state: "failed", error: messageOf(err) });
    }
  }
  return outcome;
}
