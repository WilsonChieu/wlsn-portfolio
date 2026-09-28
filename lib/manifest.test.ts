import { describe, expect, it } from "vitest";
import {
  ManifestError,
  addEventToGenre,
  addGenre,
  addPhotos,
  clearGenreCoverIfPhoto,
  emptyEvent,
  emptySite,
  removeEventFromGenre,
  removePhoto,
  resolveEventCover,
  setCover,
  type EventManifest,
  type SiteManifest,
} from "@/lib/manifest";

const p = (id: string, hidden?: boolean) => (hidden ? { id, width: 100, height: 80, hidden } : { id, width: 100, height: 80 });

function site(): SiteManifest {
  return {
    genres: [
      {
        slug: "concerts",
        title: "Concerts",
        meta: "Live Sets",
        cover: { event: "off-the-track", photo: "cover" },
        events: ["icn", "off-the-track"],
      },
    ],
  };
}

describe("resolveEventCover", () => {
  it("uses the explicit cover when it exists", () => {
    expect(resolveEventCover({ title: "t", cover: "b", photos: [p("a"), p("b")] })).toBe("b");
  });
  it("falls back to the first visible photo", () => {
    expect(resolveEventCover({ title: "t", cover: null, photos: [p("h", true), p("a")] })).toBe("a");
    expect(resolveEventCover({ title: "t", cover: "gone", photos: [p("a")] })).toBe("a");
  });
  it("returns null for an empty shoot", () => {
    expect(resolveEventCover(emptyEvent("t"))).toBeNull();
  });
});

describe("addGenre", () => {
  it("appends with a slug and defaults meta to the title", () => {
    const { site: next, slug } = addGenre(emptySite(), "  Weddings ", "");
    expect(slug).toBe("weddings");
    expect(next.genres).toEqual([{ slug: "weddings", title: "Weddings", meta: "Weddings", events: [] }]);
  });
  it("rejects duplicates and empty names", () => {
    expect(() => addGenre(site(), "Concerts", "")).toThrow(ManifestError);
    expect(() => addGenre(site(), "!!!", "")).toThrow(ManifestError);
  });
  it("does not mutate the input", () => {
    const s = emptySite();
    addGenre(s, "Weddings", "");
    expect(s.genres).toEqual([]);
  });
});

describe("addEventToGenre / removeEventFromGenre", () => {
  it("appends a new event once", () => {
    const next = addEventToGenre(addEventToGenre(site(), "concerts", "new"), "concerts", "new");
    expect(next.genres[0].events).toEqual(["icn", "off-the-track", "new"]);
  });
  it("throws for an unknown genre", () => {
    expect(() => addEventToGenre(site(), "nope", "x")).toThrow(ManifestError);
  });
  it("removes the event and clears a genre cover that pointed at it", () => {
    const next = removeEventFromGenre(site(), "concerts", "off-the-track");
    expect(next.genres[0].events).toEqual(["icn"]);
    expect(next.genres[0].cover).toBeUndefined();
  });
  it("keeps the genre cover when another event is removed", () => {
    expect(removeEventFromGenre(site(), "concerts", "icn").genres[0].cover).toEqual({
      event: "off-the-track",
      photo: "cover",
    });
  });
});

describe("clearGenreCoverIfPhoto", () => {
  it("clears the genre cover when its photo is deleted", () => {
    expect(clearGenreCoverIfPhoto(site(), "concerts", "off-the-track", "cover").genres[0].cover).toBeUndefined();
  });
  it("returns the same object when nothing changes", () => {
    const s = site();
    expect(clearGenreCoverIfPhoto(s, "concerts", "off-the-track", "ott-1")).toBe(s);
  });
});

describe("addPhotos", () => {
  it("appends new photos and sets the cover when given", () => {
    const next = addPhotos(emptyEvent("Shoot"), [p("a"), p("b")], "b");
    expect(next.photos.map((x) => x.id)).toEqual(["a", "b"]);
    expect(next.cover).toBe("b");
  });
  it("replaces a photo with the same id instead of duplicating it (retry)", () => {
    const first: EventManifest = { title: "S", cover: null, photos: [p("a"), p("b")] };
    const next = addPhotos(first, [{ id: "a", width: 300, height: 200 }]);
    expect(next.photos).toEqual([{ id: "a", width: 300, height: 200 }, p("b")]);
  });
  it("keeps the existing cover when none is given", () => {
    expect(addPhotos({ title: "S", cover: "a", photos: [p("a")] }, [p("b")]).cover).toBe("a");
  });
});

describe("removePhoto / setCover", () => {
  const ev: EventManifest = { title: "S", cover: "b", photos: [p("a"), p("b")] };

  it("removes a photo and resets the cover if it was the cover", () => {
    const next = removePhoto(ev, "b");
    expect(next.photos.map((x) => x.id)).toEqual(["a"]);
    expect(next.cover).toBeNull();
    expect(resolveEventCover(next)).toBe("a");
  });
  it("keeps the cover when another photo is removed", () => {
    expect(removePhoto(ev, "a").cover).toBe("b");
  });
  it("sets an existing photo as cover and rejects unknown ids", () => {
    expect(setCover(ev, "a").cover).toBe("a");
    expect(() => setCover(ev, "zzz")).toThrow(ManifestError);
  });
});
