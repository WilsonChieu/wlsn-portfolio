import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";
import sitemap, { sitemapXml } from "@/lib/search-sitemap";
import { SITE_URL } from "@/lib/seo";

vi.mock("@/lib/works", () => ({ getGenres: vi.fn(async () => [{ slug: "concerts", events: [{ slug: "live-set", images: [{ src: "concerts/live-set/photo-1" }] }] }]) }));
vi.mock("@/lib/presets-store", () => ({ getPublicPresets: vi.fn(async () => ({ presets: [] })) }));
afterEach(() => vi.unstubAllEnvs());

describe("search routes", () => {
  it("serializes images and XML-escapes photo URLs", () => {
    const xml = sitemapXml([{ url: `${SITE_URL}/work/events`, images: ["https://photos.example/show?a=1&b=2"] }]);
    expect(xml).toContain('<image:loc>https://photos.example/show?a=1&amp;b=2</image:loc>');
    expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
  });
  it("disallows crawling the admin deployment and omits public sitemap entries", async () => {
    vi.stubEnv("SITE_MODE", "admin");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(await sitemap()).toEqual([]);
  });
  it("allows public crawling and advertises the canonical sitemap", () => {
    vi.stubEnv("SITE_MODE", "public");
    expect(robots()).toMatchObject({ sitemap: `${SITE_URL}/sitemap.xml`, rules: { allow: "/", disallow: ["/admin", "/api/"] } });
  });
  it("lists public genres, events and crawlable image variants without inventing modification dates", async () => {
    vi.stubEnv("SITE_MODE", "public");
    vi.stubEnv("NEXT_PUBLIC_PHOTO_BASE_URL", "https://photos.example");
    const entries = await sitemap();
    expect(entries.map((entry) => entry.url)).toEqual([SITE_URL, `${SITE_URL}/work/concerts`, `${SITE_URL}/work/concerts/live-set`]);
    expect(entries[2].images).toEqual(["https://photos.example/concerts/live-set/photo-1/w1920.jpg"]);
    expect(entries.every((entry) => !entry.lastModified)).toBe(true);
  });
});
