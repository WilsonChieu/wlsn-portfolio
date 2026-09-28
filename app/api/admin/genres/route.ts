import { NextResponse } from "next/server";
import { jsonError, readBody, requireAdmin, revalidateSite } from "@/lib/admin-api";
import { ManifestError, addGenre, emptySite, type SiteManifest } from "@/lib/manifest";
import { SITE_MANIFEST_KEY } from "@/lib/photo-keys";
import { getJson, putJson } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { title, meta } = ((await readBody(req)) ?? {}) as { title?: unknown; meta?: unknown };
  if (typeof title !== "string" || !title.trim()) return jsonError("Name is required");

  const site = (await getJson<SiteManifest>(SITE_MANIFEST_KEY)) ?? emptySite();
  try {
    const result = addGenre(site, title, typeof meta === "string" ? meta : "");
    await putJson(SITE_MANIFEST_KEY, result.site);
    const live = await revalidateSite();
    return NextResponse.json({ slug: result.slug, live });
  } catch (err) {
    if (err instanceof ManifestError) return jsonError(err.message, 409);
    throw err;
  }
}
