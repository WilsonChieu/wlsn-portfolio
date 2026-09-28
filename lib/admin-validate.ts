import type { PhotoEntry } from "@/lib/manifest";
import { VARIANT_WIDTHS } from "@/lib/photo-keys";
import { isSlug } from "@/lib/slug";

const MAX_DIMENSION = 100_000;
const MAX_ENTRIES_PER_COMMIT = 500;
const MAX_PHOTOS_PER_UPLOAD_REQUEST = 50;
const MAX_VARIANT_BYTES = 100_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDimension(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= MAX_DIMENSION;
}

export interface ShootRef {
  genre: string;
  event: string;
}

export function parseShootRef(body: unknown): ShootRef | null {
  if (!isRecord(body) || !isSlug(body.genre) || !isSlug(body.event)) return null;
  return { genre: body.genre, event: body.event };
}

function parsePhotoEntry(value: unknown): PhotoEntry | null {
  if (!isRecord(value) || !isSlug(value.id)) return null;
  const { width, height, hidden } = value;
  if (!isDimension(width) || !isDimension(height)) return null;
  if (hidden !== undefined && typeof hidden !== "boolean") return null;
  return hidden ? { id: value.id, width, height, hidden: true } : { id: value.id, width, height };
}

export function parsePhotoEntries(value: unknown): PhotoEntry[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ENTRIES_PER_COMMIT) return null;
  const parsed = value.map(parsePhotoEntry);
  return parsed.every((p): p is PhotoEntry => p !== null) ? parsed : null;
}

export interface UploadRequestPhoto {
  id: string;
  sizes: number[];
}

function isVariantSize(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= MAX_VARIANT_BYTES;
}

function parseUploadPhoto(value: unknown): UploadRequestPhoto | null {
  if (!isRecord(value) || !isSlug(value.id)) return null;
  const { sizes } = value;
  if (!Array.isArray(sizes) || sizes.length !== VARIANT_WIDTHS.length || !sizes.every(isVariantSize)) return null;
  return { id: value.id, sizes };
}

export function parseUploadPhotos(value: unknown): UploadRequestPhoto[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_PHOTOS_PER_UPLOAD_REQUEST) return null;
  const parsed = value.map(parseUploadPhoto);
  return parsed.every((p): p is UploadRequestPhoto => p !== null) ? parsed : null;
}
