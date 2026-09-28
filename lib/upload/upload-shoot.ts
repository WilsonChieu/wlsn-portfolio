import type { PhotoEntry } from "@/lib/manifest";
import { mapLimit } from "@/lib/pool";
import { slugify, uniqueId } from "@/lib/slug";
import { processPhoto } from "@/lib/upload/process-photo";

export interface ShootJob {
  genre: string;
  event: string;
  title: string;
  files: File[];
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

const baseName = (name: string) => name.replace(/\.[^.]+$/, "");
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

export async function uploadShoot(job: ShootJob, onStatus: (file: File, status: FileStatus) => void): Promise<void> {
  const query = `genre=${encodeURIComponent(job.genre)}&event=${encodeURIComponent(job.event)}`;
  const { manifest } = await sendJson<{ manifest: { photos: { id: string }[] } | null }>("GET", `/api/admin/events?${query}`);
  const taken = new Set(manifest?.photos.map((p) => p.id) ?? []);
  const planned = job.files.map((file) => {
    const id = uniqueId(slugify(baseName(file.name)), taken);
    taken.add(id);
    return { file, id, isCover: COVER_FILE.test(file.name) };
  });

  // Phones get one photo at a time: two decoded 24-megapixel photos can exhaust mobile browser memory.
  const concurrency = navigator.maxTouchPoints > 0 ? 1 : 2;
  const results = await mapLimit(planned, concurrency, async ({ file, id, isCover }) => {
    try {
      onStatus(file, { state: "processing" });
      const processed = await processPhoto(file);
      onStatus(file, { state: "uploading" });
      const bytes = processed.variants.reduce((sum, v) => sum + v.blob.size, 0);
      const {
        photos: [signed],
      } = await sendJson<{ photos: SignedPhoto[] }>("POST", "/api/admin/uploads", {
        genre: job.genre,
        event: job.event,
        photos: [{ id, bytes }],
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
  if (uploaded.length === 0) return;

  try {
    const { missing } = await sendJson<{ committed: string[]; missing: string[] }>("POST", "/api/admin/photos", {
      genre: job.genre,
      event: job.event,
      title: job.title,
      coverId: uploaded.find((r) => r.isCover)?.entry.id ?? null,
      photos: uploaded.map((r) => r.entry),
    });
    const missingIds = new Set(missing);
    for (const r of uploaded) {
      onStatus(
        r.file,
        missingIds.has(r.entry.id) ? { state: "failed", error: "Upload didn't arrive in storage" } : { state: "done" }
      );
    }
  } catch (err) {
    for (const r of uploaded) onStatus(r.file, { state: "failed", error: messageOf(err) });
  }
}
