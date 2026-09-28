import { resolveEventCover, type EventManifest, type SiteManifest } from "@/lib/manifest";
import { SITE_MANIFEST_KEY, eventManifestKey, photoKey } from "@/lib/photo-keys";
import { bucketUsageBytes, getJson } from "@/lib/r2";

export interface AdminShoot {
  slug: string;
  title: string;
  photoCount: number;
  coverKey: string | null;
}

export interface AdminGenre {
  slug: string;
  title: string;
  meta: string;
  shoots: AdminShoot[];
}

export function loadShoot(genre: string, event: string): Promise<EventManifest | null> {
  return getJson<EventManifest>(eventManifestKey(genre, event));
}

export function loadStorageUsage(): Promise<number> {
  return bucketUsageBytes();
}

export async function loadAdminOverview(): Promise<AdminGenre[]> {
  const site = await getJson<SiteManifest>(SITE_MANIFEST_KEY);
  if (!site) return [];
  return Promise.all(
    site.genres.map(async (g) => ({
      slug: g.slug,
      title: g.title,
      meta: g.meta,
      shoots: await Promise.all(
        g.events.map(async (slug) => {
          const manifest = await loadShoot(g.slug, slug);
          const cover = manifest ? resolveEventCover(manifest) : null;
          return {
            slug,
            title: manifest?.title ?? slug,
            photoCount: manifest?.photos.filter((p) => !p.hidden).length ?? 0,
            coverKey: cover ? photoKey(g.slug, slug, cover) : null,
          };
        })
      ),
    }))
  );
}
