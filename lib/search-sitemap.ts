import type { MetadataRoute } from "next";
import photoLoader from "@/lib/image-loader";
import { pageUrl, SITE_URL } from "@/lib/seo";
import { parseSiteMode } from "@/lib/site-mode";
import { getGenres } from "@/lib/works";
import { getPublicPresets } from "@/lib/presets-store";

type SearchEntry = MetadataRoute.Sitemap[number] & { images?: string[] };

export default async function sitemap(): Promise<SearchEntry[]> {
  if (parseSiteMode(process.env.SITE_MODE) === "admin") return [];
  const [genres, presets] = await Promise.all([getGenres(), getPublicPresets()]);
  return [
    { url: SITE_URL, priority: 1 },
    ...(presets.presets.length ? [{ url: pageUrl("presets"), images: presets.presets.flatMap((preset) => [...preset.collage.map((photo) => photoLoader({ src: photo.src, width: 1920 })), ...preset.pairs.flatMap((pair) => [pair.before, pair.after].map((photo) => photoLoader({ src: photo.src, width: 1920 })))]) }] : []),
    ...genres.flatMap((genre) => [
      { url: pageUrl("work", genre.slug), priority: 0.8 },
      ...genre.events.map((event) => ({ url: pageUrl("work", genre.slug, event.slug), priority: 0.7, images: event.images.map((photo) => photoLoader({ src: photo.src, width: 1920 })) })),
    ]),
  ];
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// Next 14's metadata sitemap serializer drops images; preserve the image-search entries explicitly.
export function sitemapXml(entries: SearchEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${entries.map((entry) => `<url><loc>${escapeXml(entry.url)}</loc>${(entry.images ?? []).map((image) => `<image:image><image:loc>${escapeXml(image)}</image:loc></image:image>`).join("")}</url>`).join("")}</urlset>`;
}
