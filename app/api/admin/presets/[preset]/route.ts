import { NextResponse } from "next/server";
import { jsonError, readBody, requireAdmin, revalidateSite } from "@/lib/admin-api";
import { PresetError, deletePreset, movePreset, presetPrefix, updatePresetDetails } from "@/lib/presets";
import { loadPresets, savePresets } from "@/lib/presets-store";
import { deletePrefix, publicBucket } from "@/lib/r2";
import { isSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

type Ctx = { params: { preset: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isSlug(params.preset)) return jsonError("Unknown preset", 404);

  const body = ((await readBody(req)) ?? {}) as Record<string, unknown>;
  try {
    const current = await loadPresets();
    let next;
    if (typeof body.enabled === "boolean") {
      if (!current.presets.some((preset) => preset.slug === params.preset)) return jsonError("Unknown preset", 404);
      next = { ...current, presets: current.presets.map((preset) => preset.slug === params.preset ? { ...preset, enabled: body.enabled as boolean } : preset) };
    } else if (body.move === -1 || body.move === 1) {
      next = movePreset(current, params.preset, body.move);
    } else if (["name", "description", "price", "buyUrl"].every((k) => typeof body[k] === "string")) {
      next = updatePresetDetails(current, params.preset, body as { name: string; description: string; price: string; buyUrl: string });
    } else {
      return jsonError("Nothing to save");
    }
    await savePresets(next);
    return NextResponse.json({ live: await revalidateSite() });
  } catch (err) {
    if (err instanceof PresetError) return jsonError(err.message, err.message === "Unknown preset" ? 404 : 400);
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isSlug(params.preset)) return jsonError("Unknown preset", 404);

  const current = await loadPresets();
  if (!current.presets.some((p) => p.slug === params.preset)) return jsonError("Unknown preset", 404);
  // Off the page first, then the files, so the site never shows a preset with missing photos.
  await savePresets(deletePreset(current, params.preset));
  const live = await revalidateSite();
  await deletePrefix(publicBucket(), presetPrefix(params.preset));
  return NextResponse.json({ live });
}
