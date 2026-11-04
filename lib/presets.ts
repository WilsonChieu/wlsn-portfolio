import { isSlug, slugify } from "@/lib/slug";

export interface PresetPhoto { id: string; width: number; height: number }
export interface PresetPair { before: PresetPhoto; after: PresetPhoto }
export interface Preset {
  enabled?: boolean;
  slug: string;
  name: string;
  description: string;
  price: string;
  buyUrl: string | null;
  collage: PresetPhoto[];
  pairs: PresetPair[];
}
export interface PresetsManifest {
  enabled?: boolean;
  bundle: { price: string; buyUrl: string | null };
  includes: string[];
  presets: Preset[];
}
export interface PublicPhoto { id: string; src: string; width: number; height: number }
export interface PublicPreset {
  slug: string;
  number: string;
  name: string;
  description: string;
  price: string;
  buyUrl: string | null;
  collage: PublicPhoto[];
  pairs: { before: PublicPhoto; after: PublicPhoto }[];
}
export interface PublicPresets {
  bundle: { price: string; buyUrl: string | null; saving: string | null } | null;
  includes: string[];
  presets: PublicPreset[];
}

export class PresetError extends Error {}

export const PRESETS_MANIFEST_KEY = "_presets.json";
export const PRESET_DUITNOW_PHONE = "60183875215";
export const DEFAULT_INCLUDES = [
  ".xmp for Lightroom desktop + .dng for Lightroom mobile",
  "Instant download link by email",
  "Works best with RAW files",
];
const DEFAULT_PRICE = "RM 29";
const DEFAULT_BUNDLE_PRICE = "RM 69";

export function presetPhotoKey(slug: string, id: string): string {
  return `_presets/${slug}/${id}`;
}

// The trailing slash matters: deleting "_presets/pit" must not also match "_presets/pit-red/".
export function presetPrefix(slug: string): string {
  return `_presets/${slug}/`;
}

export function emptyPresets(): PresetsManifest {
  return { bundle: { price: DEFAULT_BUNDLE_PRICE, buyUrl: null }, includes: [...DEFAULT_INCLUDES], presets: [] };
}

const PRICE = /^(?:rm)?\s*(\d+)(?:\.(\d{1,2}))?$/i;

export function normalizePrice(input: string): string {
  const m = PRICE.exec(input.trim());
  if (!m) throw new PresetError('Price should look like "RM 29" or "RM 29.90"');
  return m[2] ? `RM ${Number(m[1])}.${m[2].padEnd(2, "0")}` : `RM ${Number(m[1])}`;
}

export function priceValue(price: string): number | null {
  const m = PRICE.exec(price.trim());
  return m ? Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0")) : null;
}

function formatSen(sen: number): string {
  const ringgit = Math.floor(sen / 100);
  const rest = sen % 100;
  return rest ? `RM ${ringgit}.${String(rest).padStart(2, "0")}` : `RM ${ringgit}`;
}

export function bundleSaving(m: PresetsManifest): string | null {
  const bundle = priceValue(m.bundle.price);
  const each = m.presets.map((p) => priceValue(p.price));
  if (bundle === null || each.some((v) => v === null)) return null;
  const saving = (each as number[]).reduce((a, b) => a + b, 0) - bundle;
  return saving > 0 ? formatSen(saving) : null;
}

export function normalizeBuyUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PresetError("The buy link should be a full https:// link from Gumroad");
  }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password || /\s/.test(value)) {
    throw new PresetError("The buy link should be a full https:// link from Gumroad");
  }
  return value;
}

function mapPreset(m: PresetsManifest, slug: string, fn: (p: Preset) => Preset): PresetsManifest {
  if (!m.presets.some((p) => p.slug === slug)) throw new PresetError("Unknown preset");
  return { ...m, presets: m.presets.map((p) => (p.slug === slug ? fn(p) : p)) };
}

function move<T>(items: T[], index: number, delta: -1 | 1): T[] {
  const to = index + delta;
  if (index < 0 || to < 0 || to >= items.length) return items;
  const next = [...items];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

export function createPreset(m: PresetsManifest, name: string): { manifest: PresetsManifest; slug: string } {
  const clean = name.trim();
  const slug = slugify(clean);
  if (!slug) throw new PresetError("Preset name needs at least one letter or number");
  if (m.presets.some((p) => p.slug === slug)) throw new PresetError(`A preset called "${clean}" already exists`);
  const preset: Preset = { slug, name: clean, description: "", price: DEFAULT_PRICE, buyUrl: null, collage: [], pairs: [] };
  return { manifest: { ...m, presets: [...m.presets, preset] }, slug };
}

export function updatePresetDetails(
  m: PresetsManifest,
  slug: string,
  d: { name: string; description: string; price: string; buyUrl: string }
): PresetsManifest {
  const name = d.name.trim();
  if (!name) throw new PresetError("Name is required");
  const price = normalizePrice(d.price);
  const buyUrl = normalizeBuyUrl(d.buyUrl);
  return mapPreset(m, slug, (p) => ({ ...p, name, description: d.description.trim(), price, buyUrl }));
}

export function movePreset(m: PresetsManifest, slug: string, delta: -1 | 1): PresetsManifest {
  const index = m.presets.findIndex((p) => p.slug === slug);
  if (index < 0) throw new PresetError("Unknown preset");
  return { ...m, presets: move(m.presets, index, delta) };
}

export function deletePreset(m: PresetsManifest, slug: string): PresetsManifest {
  return { ...m, presets: m.presets.filter((p) => p.slug !== slug) };
}

export function setBundle(m: PresetsManifest, b: { price: string; buyUrl: string }): PresetsManifest {
  return { ...m, bundle: { price: normalizePrice(b.price), buyUrl: normalizeBuyUrl(b.buyUrl) } };
}

export function setIncludes(m: PresetsManifest, lines: string[]): PresetsManifest {
  return { ...m, includes: lines.map((l) => l.trim()).filter(Boolean) };
}

export function presetPhotoIds(p: Preset): string[] {
  return [...p.collage.map((c) => c.id), ...p.pairs.flatMap((pair) => [pair.before.id, pair.after.id])];
}

export function addCollagePhotos(m: PresetsManifest, slug: string, photos: PresetPhoto[]): PresetsManifest {
  return mapPreset(m, slug, (p) => {
    const incoming = new Map(photos.map((ph) => [ph.id, ph]));
    const collage = p.collage.map((c) => incoming.get(c.id) ?? c);
    const existing = new Set(p.collage.map((c) => c.id));
    return { ...p, collage: [...collage, ...photos.filter((ph) => !existing.has(ph.id))] };
  });
}

export function addPair(m: PresetsManifest, slug: string, pair: PresetPair): PresetsManifest {
  return mapPreset(m, slug, (p) => {
    const taken = new Set(presetPhotoIds(p));
    if (pair.before.id === pair.after.id || taken.has(pair.before.id) || taken.has(pair.after.id)) {
      throw new PresetError("These photos are already in this preset");
    }
    return { ...p, pairs: [...p.pairs, pair] };
  });
}

const inPair = (pair: PresetPair, id: string) => pair.before.id === id || pair.after.id === id;

export function removePresetPhoto(m: PresetsManifest, slug: string, id: string): { manifest: PresetsManifest; removed: string[] } {
  let removed: string[] = [];
  const manifest = mapPreset(m, slug, (p) => {
    const pair = p.pairs.find((x) => inPair(x, id));
    if (pair) removed = [pair.before.id, pair.after.id];
    else if (p.collage.some((c) => c.id === id)) removed = [id];
    return { ...p, collage: p.collage.filter((c) => c.id !== id), pairs: p.pairs.filter((x) => x !== pair) };
  });
  return { manifest, removed };
}

export function movePresetPhoto(m: PresetsManifest, slug: string, id: string, delta: -1 | 1): PresetsManifest {
  return mapPreset(m, slug, (p) => ({
    ...p,
    collage: move(p.collage, p.collage.findIndex((c) => c.id === id), delta),
    pairs: move(p.pairs, p.pairs.findIndex((x) => inPair(x, id)), delta),
  }));
}

export function swapPair(m: PresetsManifest, slug: string, id: string): PresetsManifest {
  return mapPreset(m, slug, (p) => ({
    ...p,
    pairs: p.pairs.map((x) => (inPair(x, id) ? { before: x.after, after: x.before } : x)),
  }));
}

export function guessPairOrder(names: [string, string]): [number, number] {
  const isBefore = (n: string) => /before/i.test(n);
  const isAfter = (n: string) => /after/i.test(n);
  if (isAfter(names[0]) || isBefore(names[1])) return [1, 0];
  return [0, 1];
}

export function duitNowUrl(item: string): string {
  return `https://wa.me/${PRESET_DUITNOW_PHONE}?text=${encodeURIComponent(`Hi Wilson, I'd like the ${item} (paying by DuitNow).`)}`;
}

export function publicPhotoId(slug: string, id: string): string {
  return `${slug}.${id}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const isDim = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0 && v <= 100_000;

function readPhoto(v: unknown): PresetPhoto | null {
  if (!isRecord(v) || !isSlug(v.id) || !isDim(v.width) || !isDim(v.height)) return null;
  return { id: v.id, width: v.width, height: v.height };
}

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const safeUrl = (v: unknown) => {
  try {
    return typeof v === "string" ? normalizeBuyUrl(v) : null;
  } catch {
    return null;
  }
};

function readPreset(v: unknown): Preset | null {
  if (!isRecord(v) || !isSlug(v.slug) || typeof v.name !== "string" || !v.name.trim()) return null;
  const collage = (Array.isArray(v.collage) ? v.collage : []).map(readPhoto).filter((p): p is PresetPhoto => p !== null);
  const pairs = (Array.isArray(v.pairs) ? v.pairs : []).flatMap((x): PresetPair[] => {
    if (!isRecord(x)) return [];
    const before = readPhoto(x.before);
    const after = readPhoto(x.after);
    return before && after ? [{ before, after }] : [];
  });
  return { slug: v.slug, name: v.name, description: str(v.description), price: str(v.price, DEFAULT_PRICE), buyUrl: safeUrl(v.buyUrl), collage, pairs, ...(v.enabled === false ? { enabled: false } : {}) };
}

export function normalizePresets(raw: unknown): PresetsManifest {
  const base = emptyPresets();
  if (!isRecord(raw)) return base;
  const bundle = isRecord(raw.bundle) ? { price: str(raw.bundle.price, base.bundle.price), buyUrl: safeUrl(raw.bundle.buyUrl) } : base.bundle;
  const includes = Array.isArray(raw.includes) ? raw.includes.filter((l): l is string => typeof l === "string") : base.includes;
  const seen = new Set<string>();
  const presets = (Array.isArray(raw.presets) ? raw.presets : []).flatMap((v) => {
    const p = readPreset(v);
    if (!p || seen.has(p.slug)) return [];
    seen.add(p.slug);
    return [p];
  });
  return { bundle, includes, presets, ...(raw.enabled === false ? { enabled: false } : {}) };
}

export function toPublicPresets(m: PresetsManifest): PublicPresets {
  m = { ...m, presets: m.enabled === false ? [] : m.presets.filter((preset) => preset.enabled !== false) };
  const photo = (slug: string, p: PresetPhoto): PublicPhoto => ({
    id: publicPhotoId(slug, p.id),
    src: presetPhotoKey(slug, p.id),
    width: p.width,
    height: p.height,
  });
  return {
    bundle: m.presets.length >= 2 ? { ...m.bundle, saving: bundleSaving(m) } : null,
    includes: m.includes,
    presets: m.presets.map((p, i) => ({
      slug: p.slug,
      number: String(i + 1).padStart(2, "0"),
      name: p.name,
      description: p.description,
      price: p.price,
      buyUrl: p.buyUrl,
      collage: p.collage.map((c) => photo(p.slug, c)),
      pairs: p.pairs.map((x) => ({ before: photo(p.slug, x.before), after: photo(p.slug, x.after) })),
    })),
  };
}

// Public pages (and the build) must survive a corrupt or hand-edited _presets.json; the admin keeps
// reading it strictly so a save never silently replaces a broken file with an empty one.
export async function loadPublicPresets(read: () => Promise<unknown>): Promise<PublicPresets> {
  try {
    return toPublicPresets(normalizePresets(await read()));
  } catch (err) {
    console.error("Couldn't read the presets, showing none:", err);
    return toPublicPresets(emptyPresets());
  }
}
