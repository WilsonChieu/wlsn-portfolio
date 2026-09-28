import { NextResponse } from "next/server";
import { jsonError, readBody, requireAdmin, revalidateSite } from "@/lib/admin-api";
import { parsePhotoEntries, parseShootRef } from "@/lib/admin-validate";
import {
  addEventToGenre,
  addPhotos,
  clearGenreCoverIfPhoto,
  emptyEvent,
  removePhoto,
  type EventManifest,
  type SiteManifest,
} from "@/lib/manifest";
import { SITE_MANIFEST_KEY, VARIANT_WIDTHS, eventManifestKey, photoKey, photoPrefix, variantKey } from "@/lib/photo-keys";
import { deletePrefix, getJson, objectExists, publicBucket, putJson } from "@/lib/r2";
import { mapLimit } from "@/lib/pool";
import { isSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

const HEAD_CHECK_CONCURRENCY = 16;

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readBody(req);
  const ref = parseShootRef(body);
  const fields = (body ?? {}) as { title?: unknown; coverId?: unknown; photos?: unknown };
  const photos = parsePhotoEntries(fields.photos);
  if (!ref || !photos) return jsonError("Invalid photos");

  const site = await getJson<SiteManifest>(SITE_MANIFEST_KEY);
  if (!site?.genres.some((g) => g.slug === ref.genre)) return jsonError("Unknown category", 404);

  const complete = await mapLimit(photos, HEAD_CHECK_CONCURRENCY, async (p) => {
    const key = photoKey(ref.genre, ref.event, p.id);
    const present = await Promise.all(VARIANT_WIDTHS.map((w) => objectExists(publicBucket(), variantKey(key, w))));
    return present.every(Boolean);
  });
  const committed = photos.filter((_, i) => complete[i]);
  const missing = photos.filter((_, i) => !complete[i]).map((p) => p.id);

  if (committed.length > 0) {
    const key = eventManifestKey(ref.genre, ref.event);
    const title = typeof fields.title === "string" && fields.title.trim() ? fields.title.trim() : ref.event;
    const requestedCover = typeof fields.coverId === "string" ? fields.coverId : undefined;
    const coverId = committed.some((p) => p.id === requestedCover) ? requestedCover : undefined;
    const current = (await getJson<EventManifest>(key)) ?? emptyEvent(title);
    // Write the shoot before listing it, so the site never points at a shoot with no manifest.
    await putJson(key, addPhotos(current, committed, coverId));
    // Re-read just before writing: another upload may have listed its own shoot since the read above.
    const fresh = (await getJson<SiteManifest>(SITE_MANIFEST_KEY)) ?? site;
    const next = addEventToGenre(fresh, ref.genre, ref.event);
    if (next !== fresh) await putJson(SITE_MANIFEST_KEY, next);
    await revalidateSite();
  }

  return NextResponse.json({ committed: committed.map((p) => p.id), missing });
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readBody(req);
  const ref = parseShootRef(body);
  const id = (body as { id?: unknown } | null)?.id;
  if (!ref || !isSlug(id)) return jsonError("Invalid photo");

  const key = eventManifestKey(ref.genre, ref.event);
  const current = await getJson<EventManifest>(key);
  if (!current) return jsonError("Unknown shoot", 404);

  // Remove from the manifest first so the photo disappears from the site before its files go.
  await putJson(key, removePhoto(current, id));
  const site = await getJson<SiteManifest>(SITE_MANIFEST_KEY);
  if (site) {
    const next = clearGenreCoverIfPhoto(site, ref.genre, ref.event, id);
    if (next !== site) await putJson(SITE_MANIFEST_KEY, next);
  }
  await revalidateSite();

  await deletePrefix(publicBucket(), photoPrefix(photoKey(ref.genre, ref.event, id)));
  return NextResponse.json({ ok: true });
}
