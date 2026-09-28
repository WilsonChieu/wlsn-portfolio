export const VARIANT_WIDTHS = [640, 1280, 1920, 2560, 3840] as const;
export const JPEG_QUALITY = 0.88;
export const SITE_MANIFEST_KEY = "_site.json";

export function eventPrefix(genre: string, event: string): string {
  return `${genre}/${event}/`;
}

export function eventManifestKey(genre: string, event: string): string {
  return `${eventPrefix(genre, event)}_event.json`;
}

export function photoKey(genre: string, event: string, id: string): string {
  return `${genre}/${event}/${id}`;
}

// The trailing slash matters: deleting by the bare key "…/ott-1" would also match "…/ott-10/…".
export function photoPrefix(key: string): string {
  return `${key}/`;
}

export function variantKey(key: string, width: number): string {
  return `${key}/w${width}.jpg`;
}

export function pickVariantWidth(width: number): number {
  return VARIANT_WIDTHS.find((w) => w >= width) ?? VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1];
}
