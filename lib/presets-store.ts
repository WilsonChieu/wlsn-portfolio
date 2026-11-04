import { cache } from "react";
import { PRESETS_MANIFEST_KEY, loadPublicPresets, normalizePresets, type PresetsManifest, type PublicPresets } from "@/lib/presets";
import { getJson, putJson } from "@/lib/r2";

export async function loadPresets(): Promise<PresetsManifest> {
  return normalizePresets(await getJson<unknown>(PRESETS_MANIFEST_KEY));
}

export function savePresets(m: PresetsManifest): Promise<void> {
  return putJson(PRESETS_MANIFEST_KEY, m);
}

export const getPublicPresets = cache((): Promise<PublicPresets> => loadPublicPresets(() => getJson<unknown>(PRESETS_MANIFEST_KEY)));
