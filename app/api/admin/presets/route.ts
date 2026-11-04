import { NextResponse } from "next/server";
import { jsonError, readBody, requireAdmin, revalidateSite } from "@/lib/admin-api";
import { PresetError, createPreset, setBundle, setIncludes } from "@/lib/presets";
import { loadPresets, savePresets } from "@/lib/presets-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json({ manifest: await loadPresets() });
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { name } = ((await readBody(req)) ?? {}) as { name?: unknown };
  if (typeof name !== "string" || !name.trim()) return jsonError("Name is required");
  try {
    const { manifest, slug } = createPreset(await loadPresets(), name);
    await savePresets(manifest);
    return NextResponse.json({ slug, live: await revalidateSite() });
  } catch (err) {
    if (err instanceof PresetError) return jsonError(err.message, 409);
    throw err;
  }
}

export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = ((await readBody(req)) ?? {}) as { bundle?: unknown; includes?: unknown; enabled?: unknown };
  try {
    let manifest = await loadPresets();
    if (typeof body.enabled === "boolean") {
      manifest = { ...manifest, enabled: body.enabled };
    } else if (body.bundle !== undefined) {
      const b = body.bundle as { price?: unknown; buyUrl?: unknown } | null;
      if (typeof b?.price !== "string" || typeof b.buyUrl !== "string") return jsonError("Invalid bundle");
      manifest = setBundle(manifest, { price: b.price, buyUrl: b.buyUrl });
    } else if (Array.isArray(body.includes) && body.includes.every((l) => typeof l === "string") && body.includes.length <= 20) {
      manifest = setIncludes(manifest, body.includes as string[]);
    } else {
      return jsonError("Nothing to save");
    }
    await savePresets(manifest);
    return NextResponse.json({ live: await revalidateSite() });
  } catch (err) {
    if (err instanceof PresetError) return jsonError(err.message);
    throw err;
  }
}
