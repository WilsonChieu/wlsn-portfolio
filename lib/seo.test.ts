import { describe, expect, it } from "vitest";
import { breadcrumbs, jsonLd, pageMetadata, pageUrl, SITE_URL } from "@/lib/seo";

describe("search metadata", () => {
  it("encodes each URL segment without allowing a title to change the path", () => {
    expect(pageUrl("work", "events", "show / night?#")).toBe(`${SITE_URL}/work/events/show%20%2F%20night%3F%23`);
  });
  it("uses the page's canonical and image in social previews", () => {
    const url = pageUrl("work", "concerts");
    const metadata = pageMetadata("Concerts", "Live photography", url, "https://photos.example/cover.jpg");
    expect(metadata.alternates?.canonical).toBe(url);
    expect(metadata.openGraph).toMatchObject({ url, images: [{ url: "https://photos.example/cover.jpg" }] });
  });
  it("escapes script-closing content in JSON-LD while preserving the original data", () => {
    const data = { name: "</script><script>alert(1)</script>" };
    const encoded = jsonLd(data);
    expect(encoded).not.toContain("<");
    expect(JSON.parse(encoded)).toEqual(data);
  });
  it("keeps breadcrumb order and canonical destinations", () => {
    expect(breadcrumbs([{ name: "Home", url: SITE_URL }, { name: "Events", url: pageUrl("work", "events") }]).itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Events", item: pageUrl("work", "events") },
    ]);
  });
});
