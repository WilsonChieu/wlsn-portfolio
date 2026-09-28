import { NextResponse } from "next/server";
import { jsonError, readBody, requireAdmin, revalidateSite } from "@/lib/admin-api";
import { parseShootRef } from "@/lib/admin-validate";
import { ManifestError, setCover, type EventManifest } from "@/lib/manifest";
import { eventManifestKey } from "@/lib/photo-keys";
import { getJson, putJson } from "@/lib/r2";
import { isSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readBody(req);
  const ref = parseShootRef(body);
  const id = (body as { id?: unknown } | null)?.id;
  if (!ref || !isSlug(id)) return jsonError("Invalid photo");

  const key = eventManifestKey(ref.genre, ref.event);
  const current = await getJson<EventManifest>(key);
  if (!current) return jsonError("Unknown shoot", 404);
  try {
    await putJson(key, setCover(current, id));
  } catch (err) {
    if (err instanceof ManifestError) return jsonError(err.message, 404);
    throw err;
  }
  revalidateSite();
  return NextResponse.json({ ok: true });
}
