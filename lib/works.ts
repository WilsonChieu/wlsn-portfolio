import { cache } from "react";
import { resolveEventCover, type EventManifest, type SiteManifest } from "@/lib/manifest";
import { SITE_MANIFEST_KEY, eventManifestKey, photoKey } from "@/lib/photo-keys";
import { getJson } from "@/lib/r2";

export interface WorkImage {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface WorkEvent {
  slug: string;
  title: string;
  genreSlug: string;
  genreTitle: string;
  cover: string;
  images: WorkImage[];
}

export interface WorkGenre {
  slug: string;
  title: string;
  meta: string;
  cover: string;
  events: WorkEvent[];
}

export const getGenres = cache(async (): Promise<WorkGenre[]> => {
  const site = await getJson<SiteManifest>(SITE_MANIFEST_KEY);
  if (!site) return [];

  return Promise.all(
    site.genres.map(async (genre) => {
      const loaded = await Promise.all(
        genre.events.map(async (slug): Promise<WorkEvent | null> => {
          const manifest = await getJson<EventManifest>(eventManifestKey(genre.slug, slug));
          if (!manifest) return null;
          const coverId = resolveEventCover(manifest);
          return {
            slug,
            title: manifest.title,
            genreSlug: genre.slug,
            genreTitle: genre.title,
            cover: coverId ? photoKey(genre.slug, slug, coverId) : "",
            images: manifest.photos
              .filter((p) => !p.hidden)
              .map((p, index) => ({
                id: p.id,
                src: photoKey(genre.slug, slug, p.id),
                alt: `${manifest.title} — ${genre.title.toLowerCase()} photography by Wilson, photo ${index + 1}`,
                width: p.width,
                height: p.height,
              })),
          };
        })
      );
      const events = loaded.filter((e): e is WorkEvent => e !== null);
      const cover = genre.cover ? photoKey(genre.slug, genre.cover.event, genre.cover.photo) : events[0]?.cover ?? "";
      return { slug: genre.slug, title: genre.title, meta: genre.meta, cover, events };
    })
  );
});

export async function getGenre(slug: string): Promise<WorkGenre | undefined> {
  return (await getGenres()).find((g) => g.slug === slug);
}

export async function getEvent(genreSlug: string, eventSlug: string): Promise<WorkEvent | undefined> {
  return (await getGenre(genreSlug))?.events.find((e) => e.slug === eventSlug);
}
