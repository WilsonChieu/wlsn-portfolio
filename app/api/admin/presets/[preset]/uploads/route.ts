import { NextResponse } from "next/server";
import { jsonError, readBody, requireAdmin } from "@/lib/admin-api";
import { signUploads, storageRefusal } from "@/lib/admin-uploads";
import { parseUploadPhotos } from "@/lib/admin-validate";
import { presetPhotoKey } from "@/lib/presets";
import { loadPresets } from "@/lib/presets-store";
import { isSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { preset: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isSlug(params.preset) || !(await loadPresets()).presets.some((p) => p.slug === params.preset)) {
    return jsonError("Unknown preset", 404);
  }
  const photos = parseUploadPhotos(((await readBody(req)) as { photos?: unknown } | null)?.photos);
  if (!photos) return jsonError("Invalid upload request");

  const refused = await storageRefusal(photos);
  if (refused) return refused;
  return NextResponse.json({ photos: await signUploads(photos, (id) => presetPhotoKey(params.preset, id)) });
}
