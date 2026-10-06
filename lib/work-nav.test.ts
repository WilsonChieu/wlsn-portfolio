import { describe, expect, it } from "vitest";
import type { WorkGenre } from "@/lib/works";
import { nextReadyFrame, nextShoot, pad2, photoIndex, plural, slideshowFrames, stepIndex, workSummary } from "@/lib/work-nav";

const ev = (g: string, slug: string, cover = `${g}/${slug}/cover`) => ({
  slug, title: slug.toUpperCase(), genreSlug: g, genreTitle: g, cover, images: [],
});
const genre = (slug: string, events: ReturnType<typeof ev>[]): WorkGenre => ({ slug, title: slug, meta: slug, cover: "", events });

const site = [
  genre("concerts", [ev("concerts", "c1"), ev("concerts", "c2")]),
  genre("events", [ev("events", "e1"), ev("events", "e2", ""), ev("events", "e3")]),
  genre("graduation", [ev("graduation", "g1")]),
];

describe("labels", () => {
  it("pads and pluralises", () => {
    expect(pad2(7)).toBe("07");
    expect(pad2(12)).toBe("12");
    expect(plural(1, "photo")).toBe("1 photo");
    expect(plural(40, "photo")).toBe("40 photos");
    expect(plural(0, "event")).toBe("0 events");
  });
  it("summarises categories and events", () => {
    expect(workSummary(site)).toBe("3 categories · 6 events");
    expect(workSummary([genre("x", [ev("x", "a")])])).toBe("1 category · 1 event");
  });
});

describe("slideshowFrames", () => {
  it("takes shoots round-robin across categories and skips shoots without a cover", () => {
    expect(slideshowFrames(site).map((f) => f.eventSlug)).toEqual(["c1", "e1", "g1", "c2", "e3"]);
  });
  it("stops at the maximum", () => {
    expect(slideshowFrames(site, 2).map((f) => f.eventSlug)).toEqual(["c1", "e1"]);
  });
  it("is empty without categories or shoots", () => {
    expect(slideshowFrames([])).toEqual([]);
    expect(slideshowFrames([genre("x", [])])).toEqual([]);
  });
});

describe("nextShoot", () => {
  it("moves to the next shoot, across categories, wrapping to the first", () => {
    expect(nextShoot(site, "concerts", "c2")?.eventSlug).toBe("e1");
    expect(nextShoot(site, "events", "e1")?.eventSlug).toBe("e2");
    expect(nextShoot(site, "graduation", "g1")?.eventSlug).toBe("c1");
  });
  it("is null when the site has a single shoot or the shoot is unknown", () => {
    expect(nextShoot([genre("x", [ev("x", "a")])], "x", "a")).toBeNull();
    expect(nextShoot(site, "concerts", "nope")).toBeNull();
  });
});

describe("viewer helpers", () => {
  it("steps with wrap-around and stays put with one photo", () => {
    expect(stepIndex(0, -1, 5)).toBe(4);
    expect(stepIndex(4, 1, 5)).toBe(0);
    expect(stepIndex(2, 1, 5)).toBe(3);
    expect(stepIndex(0, 1, 1)).toBe(0);
  });
  it("finds a photo by id and ignores unknown or missing ids", () => {
    const photos = [{ id: "a" }, { id: "b" }];
    expect(photoIndex(photos, "b")).toBe(1);
    expect(photoIndex(photos, "zzz")).toBe(-1);
    expect(photoIndex(photos, null)).toBe(-1);
  });
});

describe("nextReadyFrame", () => {
  it("moves to the next frame whose photo has loaded", () => {
    expect(nextReadyFrame(0, 4, new Set([0, 1, 2, 3]))).toBe(1);
    expect(nextReadyFrame(3, 4, new Set([0, 1, 2, 3]))).toBe(0);
  });
  it("skips frames that are still loading", () => {
    expect(nextReadyFrame(0, 4, new Set([0, 3]))).toBe(3);
  });
  it("stays put when no other frame is ready", () => {
    expect(nextReadyFrame(2, 4, new Set([2]))).toBe(2);
    expect(nextReadyFrame(0, 4, new Set())).toBe(0);
  });
});
