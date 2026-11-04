import { NextResponse } from "next/server";
import { jsonError, readBody, requireAdmin, revalidateSite } from "@/lib/admin-api";
import { parsePhotoEntries } from "@/lib/admin-validate";
import { mapLimit } from "@/lib/pool";
import { VARIANT_WIDTHS, photoPrefix, variantKey } from "@/lib/photo-keys";
import {
  PresetError,
  addCollagePhotos,
  addPair,
  movePresetPhoto,
  presetPhotoKey,
  removePresetPhoto,
  swapPair,
  type PresetPhoto,
} from "@/lib/presets";
import { loadPresets, savePresets } from "@/lib/presets-store";
import { deletePrefix, objectExists, publicBucket } from "@/lib/r2";
import { isSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

type Ctx = { params: { preset: string } };
const HEAD_CHECK_CONCURRENCY = 16;

const strip = ({ id, width, height }: PresetPhoto): PresetPhoto => ({ id, width, height });

function arrived(slug: string, photos: PresetPhoto[]): Promise<boolean[]> {
  return mapLimit(photos, HEAD_CHECK_CONCURRENCY, async (p) => {
    const key = presetPhotoKey(slug, p.id);
    const present = await Promise.all(VARIANT_WIDTHS.map((w) => objectExists(publicBucket(), variantKey(key, w))));
    return present.every(Boolean);
  });
}

function presetError(err: unknown) {
  if (err instanceof PresetError) return jsonError(err.message, err.message === "Unknown preset" ? 404 : 400);
  throw err;
}

export async function POST(req: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isSlug(params.preset)) return jsonError("Unknown preset", 404);
  const body = ((await readBody(req)) ?? {}) as { collage?: unknown; pair?: unknown };

  try {
    if (body.collage !== undefined) {
      const photos = parsePhotoEntries(body.collage)?.map(strip);
      if (!photos) return jsonError("Invalid photos");
      const ok = await arrived(params.preset, photos);
      const committed = photos.filter((_, i) => ok[i]);
      const missing = photos.filter((_, i) => !ok[i]).map((p) => p.id);
      let live = false;
      if (committed.length) {
        await savePresets(addCollagePhotos(await loadPresets(), params.preset, committed));
        live = await revalidateSite();
      }
      return NextResponse.json({ committed: committed.map((p) => p.id), missing, live });
    }

    const pair = body.pair as { before?: unknown; after?: unknown } | undefined;
    const parsed = pair ? parsePhotoEntries([pair.before, pair.after])?.map(strip) : null;
    if (!parsed) return jsonError("Invalid pair");
    if (!(await arrived(params.preset, parsed)).every(Boolean)) return jsonError("Both photos must finish uploading first");
    await savePresets(addPair(await loadPresets(), params.preset, { before: parsed[0], after: parsed[1] }));
    return NextResponse.json({ live: await revalidateSite() });
  } catch (err) {
    return presetError(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = ((await readBody(req)) ?? {}) as { id?: unknown; move?: unknown; swap?: unknown };
  if (!isSlug(params.preset) || !isSlug(body.id)) return jsonError("Invalid photo");

  try {
    const current = await loadPresets();
    const next =
      body.move === -1 || body.move === 1
        ? movePresetPhoto(current, params.preset, body.id, body.move)
        : body.swap === true
          ? swapPair(current, params.preset, body.id)
          : null;
    if (!next) return jsonError("Nothing to change");
    await savePresets(next);
    return NextResponse.json({ live: await revalidateSite() });
  } catch (err) {
    return presetError(err);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = ((await readBody(req)) as { id?: unknown } | null)?.id;
  if (!isSlug(params.preset) || !isSlug(id)) return jsonError("Invalid photo");

  try {
    const { manifest, removed } = removePresetPhoto(await loadPresets(), params.preset, id);
    if (!removed.length) return jsonError("Photo not found", 404);
    await savePresets(manifest);
    const live = await revalidateSite();
    await Promise.all(removed.map((r) => deletePrefix(publicBucket(), photoPrefix(presetPhotoKey(params.preset, r)))));
    return NextResponse.json({ live, removed });
  } catch (err) {
    return presetError(err);
  }
}
