import { slugify } from "@/lib/slug";

export interface PhotoEntry {
  id: string;
  width: number;
  height: number;
  hidden?: boolean;
}

export interface EventManifest {
  title: string;
  cover: string | null;
  photos: PhotoEntry[];
}

export interface GenreCover {
  event: string;
  photo: string;
}

export interface GenreEntry {
  slug: string;
  title: string;
  meta: string;
  cover?: GenreCover;
  events: string[];
}

export interface SiteManifest {
  genres: GenreEntry[];
}

export class ManifestError extends Error {}

export function emptySite(): SiteManifest {
  return { genres: [] };
}

export function emptyEvent(title: string): EventManifest {
  return { title, cover: null, photos: [] };
}

export function resolveEventCover(ev: EventManifest): string | null {
  if (ev.cover && ev.photos.some((p) => p.id === ev.cover)) return ev.cover;
  return ev.photos.find((p) => !p.hidden)?.id ?? null;
}

export function addGenre(site: SiteManifest, title: string, meta: string): { site: SiteManifest; slug: string } {
  const name = title.trim();
  const slug = slugify(name);
  if (!slug) throw new ManifestError("Category name needs at least one letter or number");
  if (site.genres.some((g) => g.slug === slug)) throw new ManifestError(`Category "${slug}" already exists`);
  const genre: GenreEntry = { slug, title: name, meta: meta.trim() || name, events: [] };
  return { site: { genres: [...site.genres, genre] }, slug };
}

function mapGenre(site: SiteManifest, genre: string, fn: (g: GenreEntry) => GenreEntry): SiteManifest {
  if (!site.genres.some((g) => g.slug === genre)) throw new ManifestError(`Unknown category "${genre}"`);
  return { genres: site.genres.map((g) => (g.slug === genre ? fn(g) : g)) };
}

export function addEventToGenre(site: SiteManifest, genre: string, event: string): SiteManifest {
  return mapGenre(site, genre, (g) => (g.events.includes(event) ? g : { ...g, events: [...g.events, event] }));
}

function withoutCover(g: GenreEntry): GenreEntry {
  const next = { ...g };
  delete next.cover;
  return next;
}

export function removeEventFromGenre(site: SiteManifest, genre: string, event: string): SiteManifest {
  return mapGenre(site, genre, (g) => {
    const next = { ...g, events: g.events.filter((e) => e !== event) };
    return g.cover?.event === event ? withoutCover(next) : next;
  });
}

export function clearGenreCoverIfPhoto(
  site: SiteManifest,
  genre: string,
  event: string,
  photoId: string
): SiteManifest {
  const target = site.genres.find((g) => g.slug === genre);
  if (!target?.cover || target.cover.event !== event || target.cover.photo !== photoId) return site;
  return mapGenre(site, genre, withoutCover);
}

export function addPhotos(ev: EventManifest, photos: PhotoEntry[], coverId?: string): EventManifest {
  const incoming = new Map(photos.map((p) => [p.id, p]));
  const replaced = ev.photos.map((p) => incoming.get(p.id) ?? p);
  const existing = new Set(ev.photos.map((p) => p.id));
  const appended = photos.filter((p) => !existing.has(p.id));
  return { ...ev, cover: coverId ?? ev.cover, photos: [...replaced, ...appended] };
}

export function removePhoto(ev: EventManifest, id: string): EventManifest {
  return { ...ev, cover: ev.cover === id ? null : ev.cover, photos: ev.photos.filter((p) => p.id !== id) };
}

export function setCover(ev: EventManifest, id: string): EventManifest {
  if (!ev.photos.some((p) => p.id === id)) throw new ManifestError(`No photo "${id}" in this shoot`);
  return { ...ev, cover: id };
}
