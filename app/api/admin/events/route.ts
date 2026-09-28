import { NextResponse } from "next/server";
import { jsonError, readBody, requireAdmin, revalidateSite } from "@/lib/admin-api";
import { parseShootRef } from "@/lib/admin-validate";
import { removeEventFromGenre, type EventManifest, type SiteManifest } from "@/lib/manifest";
import { SITE_MANIFEST_KEY, eventManifestKey, eventPrefix } from "@/lib/photo-keys";
import { deletePrefix, getJson, publicBucket, putJson } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const url = new URL(req.url);
  const ref = parseShootRef({ genre: url.searchParams.get("genre"), event: url.searchParams.get("event") });
  if (!ref) return jsonError("Invalid shoot");
  const manifest = await getJson<EventManifest>(eventManifestKey(ref.genre, ref.event));
  return NextResponse.json({ manifest });
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const ref = parseShootRef(await readBody(req));
  if (!ref) return jsonError("Invalid shoot");

  const site = await getJson<SiteManifest>(SITE_MANIFEST_KEY);
  if (!site?.genres.some((g) => g.slug === ref.genre)) return jsonError("Unknown category", 404);

  await putJson(SITE_MANIFEST_KEY, removeEventFromGenre(site, ref.genre, ref.event));
  await revalidateSite();

  await deletePrefix(publicBucket(), eventPrefix(ref.genre, ref.event));
  return NextResponse.json({ ok: true });
}
