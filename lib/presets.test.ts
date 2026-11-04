import { describe, expect, it } from "vitest";
import {
  PresetError,
  addCollagePhotos,
  addPair,
  bundleSaving,
  createPreset,
  deletePreset,
  duitNowUrl,
  emptyPresets,
  guessPairOrder,
  loadPublicPresets,
  movePreset,
  movePresetPhoto,
  normalizeBuyUrl,
  normalizePresets,
  normalizePrice,
  presetPhotoKey,
  presetPrefix,
  publicPhotoId,
  removePresetPhoto,
  setBundle,
  setIncludes,
  swapPair,
  toPublicPresets,
  updatePresetDetails,
  type PresetsManifest,
} from "@/lib/presets";

const ph = (id: string) => ({ id, width: 3000, height: 2000 });
const withTwo = (): PresetsManifest => {
  let m = createPreset(emptyPresets(), "Pit Red").manifest;
  m = createPreset(m, "Lawn Gold").manifest;
  return m;
};

describe("keys", () => {
  it("keeps preset photos under _presets/<slug>", () => {
    expect(presetPhotoKey("pit-red", "a-1")).toBe("_presets/pit-red/a-1");
    expect(presetPrefix("pit-red")).toBe("_presets/pit-red/");
  });
});

describe("normalizePrice", () => {
  it.each([["RM 29", "RM 29"], ["rm29", "RM 29"], ["29", "RM 29"], [" RM 29.90 ", "RM 29.90"], ["RM29.5", "RM 29.50"]])(
    "%j → %j",
    (input, out) => expect(normalizePrice(input)).toBe(out)
  );
  it.each(["", "free", "RM", "RM -5", "RM 1.234", "$29"])("rejects %j", (input) => {
    expect(() => normalizePrice(input)).toThrow(PresetError);
  });
});

describe("normalizeBuyUrl", () => {
  it("accepts https links, trimmed", () => {
    expect(normalizeBuyUrl("  https://crisptakes.gumroad.com/l/pitred ")).toBe("https://crisptakes.gumroad.com/l/pitred");
  });
  it("treats blank as no link yet", () => {
    expect(normalizeBuyUrl("   ")).toBeNull();
  });
  it.each(["http://gumroad.com/l/x", "gumroad.com/l/x", "https://", "javascript:alert(1)", "https://a b.com"])("rejects %j", (input) => {
    expect(() => normalizeBuyUrl(input)).toThrow(PresetError);
  });
});

describe("createPreset", () => {
  it("adds an empty preset with a slug", () => {
    const { manifest, slug } = createPreset(emptyPresets(), "  Pit Red ");
    expect(slug).toBe("pit-red");
    expect(manifest.presets).toEqual([{ slug: "pit-red", name: "Pit Red", description: "", price: "RM 29", buyUrl: null, collage: [], pairs: [] }]);
  });
  it("rejects duplicates and names without letters", () => {
    expect(() => createPreset(withTwo(), "pit red")).toThrow(PresetError);
    expect(() => createPreset(emptyPresets(), "!!!")).toThrow(PresetError);
  });
  it("does not mutate the input", () => {
    const m = emptyPresets();
    createPreset(m, "Pit Red");
    expect(m.presets).toEqual([]);
  });
});

describe("updatePresetDetails", () => {
  it("saves cleaned details and keeps the slug", () => {
    const m = updatePresetDetails(withTwo(), "pit-red", { name: " Pit Red II ", description: " Punchy reds. ", price: "35", buyUrl: "https://g.co/x" });
    expect(m.presets[0]).toMatchObject({ slug: "pit-red", name: "Pit Red II", description: "Punchy reds.", price: "RM 35", buyUrl: "https://g.co/x" });
  });
  it("refuses an empty name, a bad price or link, or an unknown preset", () => {
    const d = { name: "X", description: "", price: "RM 29", buyUrl: "" };
    expect(() => updatePresetDetails(withTwo(), "pit-red", { ...d, name: " " })).toThrow(PresetError);
    expect(() => updatePresetDetails(withTwo(), "pit-red", { ...d, price: "lots" })).toThrow(PresetError);
    expect(() => updatePresetDetails(withTwo(), "pit-red", { ...d, buyUrl: "http://x.com" })).toThrow(PresetError);
    expect(() => updatePresetDetails(withTwo(), "nope", d)).toThrow(PresetError);
  });
});

describe("movePreset / deletePreset", () => {
  it("moves within bounds", () => {
    expect(movePreset(withTwo(), "lawn-gold", -1).presets.map((p) => p.slug)).toEqual(["lawn-gold", "pit-red"]);
    expect(movePreset(withTwo(), "pit-red", -1).presets.map((p) => p.slug)).toEqual(["pit-red", "lawn-gold"]);
  });
  it("deletes", () => {
    expect(deletePreset(withTwo(), "pit-red").presets.map((p) => p.slug)).toEqual(["lawn-gold"]);
  });
});

describe("bundle", () => {
  it("saves price and link, and works out the saving", () => {
    const m = setBundle(withTwo(), { price: "45", buyUrl: "" });
    expect(m.bundle).toEqual({ price: "RM 45", buyUrl: null });
    expect(bundleSaving(m)).toBe("RM 13");
  });
  it("shows no saving when the bundle isn't cheaper", () => {
    expect(bundleSaving(setBundle(withTwo(), { price: "58", buyUrl: "" }))).toBeNull();
  });
  it("keeps cents in the saving when there are any", () => {
    const m = updatePresetDetails(setBundle(withTwo(), { price: "40", buyUrl: "" }), "pit-red", { name: "Pit Red", description: "", price: "29.90", buyUrl: "" });
    expect(bundleSaving(m)).toBe("RM 18.90");
  });
  it("cleans the what-you-get lines", () => {
    expect(setIncludes(emptyPresets(), [" a ", "", "  ", "b"]).includes).toEqual(["a", "b"]);
  });
});

describe("photos", () => {
  it("adds collage photos, replacing a re-uploaded id in place", () => {
    let m = addCollagePhotos(withTwo(), "pit-red", [ph("a"), ph("b")]);
    m = addCollagePhotos(m, "pit-red", [{ id: "a", width: 10, height: 20 }]);
    expect(m.presets[0].collage).toEqual([{ id: "a", width: 10, height: 20 }, ph("b")]);
  });
  it("adds a pair, refusing ids already used in the preset", () => {
    const m = addPair(withTwo(), "pit-red", { before: ph("x-before"), after: ph("x-after") });
    expect(m.presets[0].pairs).toHaveLength(1);
    expect(() => addPair(m, "pit-red", { before: ph("x-before"), after: ph("y") })).toThrow(PresetError);
    expect(() => addPair(m, "pit-red", { before: ph("z"), after: ph("z") })).toThrow(PresetError);
  });
  it("removes a collage photo or a whole pair by either id", () => {
    let m = addCollagePhotos(withTwo(), "pit-red", [ph("a")]);
    m = addPair(m, "pit-red", { before: ph("b1"), after: ph("a1") });
    const one = removePresetPhoto(m, "pit-red", "a");
    expect(one.removed).toEqual(["a"]);
    const pair = removePresetPhoto(one.manifest, "pit-red", "b1");
    expect(pair.removed).toEqual(["b1", "a1"]);
    expect(pair.manifest.presets[0]).toMatchObject({ collage: [], pairs: [] });
    expect(removePresetPhoto(m, "pit-red", "missing").removed).toEqual([]);
  });
  it("moves and swaps", () => {
    let m = addCollagePhotos(withTwo(), "pit-red", [ph("a"), ph("b")]);
    m = addPair(m, "pit-red", { before: ph("p1b"), after: ph("p1a") });
    m = addPair(m, "pit-red", { before: ph("p2b"), after: ph("p2a") });
    expect(movePresetPhoto(m, "pit-red", "b", -1).presets[0].collage.map((p) => p.id)).toEqual(["b", "a"]);
    expect(movePresetPhoto(m, "pit-red", "p2a", -1).presets[0].pairs.map((p) => p.after.id)).toEqual(["p2a", "p1a"]);
    expect(swapPair(m, "pit-red", "p1b").presets[0].pairs[0]).toEqual({ before: ph("p1a"), after: ph("p1b") });
  });
});

describe("guessPairOrder", () => {
  it("uses before/after in the file names", () => {
    expect(guessPairOrder(["street-AFTER.jpg", "street-before.jpg"])).toEqual([1, 0]);
    expect(guessPairOrder(["street_before.jpg", "street_after.jpg"])).toEqual([0, 1]);
  });
  it("falls back to the order they were picked", () => {
    expect(guessPairOrder(["dsc1.jpg", "dsc2.jpg"])).toEqual([0, 1]);
  });
});

describe("duitNowUrl", () => {
  it("opens WhatsApp with the item named", () => {
    expect(duitNowUrl("Pit Red preset")).toBe(
      `https://wa.me/60183875215?text=${encodeURIComponent("Hi Wilson, I'd like the Pit Red preset (paying by DuitNow).")}`
    );
  });
});

describe("normalizePresets", () => {
  it("returns an empty manifest for missing or junk data", () => {
    expect(normalizePresets(null)).toEqual(emptyPresets());
    expect(normalizePresets("nope")).toEqual(emptyPresets());
  });
  it("skips broken presets and photos, and duplicate slugs", () => {
    const m = normalizePresets({
      bundle: { price: "RM 45", buyUrl: 7 },
      includes: ["a", 3],
      presets: [
        { slug: "pit-red", name: "Pit Red", description: "d", price: "RM 29", buyUrl: "https://g.co/x", collage: [ph("a"), { id: "BAD" }], pairs: [{ before: ph("b"), after: { id: "c" } }] },
        { slug: "pit-red", name: "Dup" },
        { slug: "Bad Slug", name: "x" },
        { name: "no slug" },
      ],
    });
    expect(m.bundle).toEqual({ price: "RM 45", buyUrl: null });
    expect(m.includes).toEqual(["a"]);
    expect(m.presets).toEqual([
      { slug: "pit-red", name: "Pit Red", description: "d", price: "RM 29", buyUrl: "https://g.co/x", collage: [ph("a")], pairs: [] },
    ]);
  });
});

describe("toPublicPresets", () => {
  it("numbers presets, builds photo sources and namespaced ids", () => {
    const m = addCollagePhotos(withTwo(), "pit-red", [ph("dsc-1")]);
    const pub = toPublicPresets(m);
    expect(pub.presets[0]).toMatchObject({ number: "01", slug: "pit-red" });
    expect(pub.presets[1].number).toBe("02");
    expect(pub.presets[0].collage[0]).toEqual({ id: publicPhotoId("pit-red", "dsc-1"), src: "_presets/pit-red/dsc-1", width: 3000, height: 2000 });
    expect(publicPhotoId("pit-red", "dsc-1")).toBe("pit-red.dsc-1");
  });
  it("offers the bundle only with two or more presets", () => {
    expect(toPublicPresets(createPreset(emptyPresets(), "Pit Red").manifest).bundle).toBeNull();
    expect(toPublicPresets(setBundle(withTwo(), { price: "45", buyUrl: "" })).bundle).toEqual({ price: "RM 45", buyUrl: null, saving: "RM 13" });
  });
});

describe("loadPublicPresets", () => {
  it("hides the whole section without removing the stored preset data", () => {
    const manifest = { ...withTwo(), enabled: false };
    const normalized = normalizePresets(manifest);
    expect(normalized.presets).toHaveLength(2);
    expect(toPublicPresets(normalized).presets).toEqual([]);
    expect(toPublicPresets(normalized).bundle).toBeNull();
  });
  it("omits hidden listings from the public page and bundle calculation", () => {
    const manifest = withTwo();
    manifest.presets[0].enabled = false;
    const normalized = normalizePresets(manifest);
    expect(normalized.presets).toHaveLength(2);
    expect(toPublicPresets(normalized).presets.map((preset) => preset.slug)).toEqual(["lawn-gold"]);
    expect(toPublicPresets(normalized).bundle).toBeNull();
  });
  it("treats an unreadable presets file as no presets instead of failing the page", async () => {
    const pub = await loadPublicPresets(async () => {
      throw new SyntaxError("Unexpected token } in JSON");
    });
    expect(pub.presets).toEqual([]);
    expect(pub.bundle).toBeNull();
  });
  it("normalises what it reads", async () => {
    const pub = await loadPublicPresets(async () => ({ presets: [{ slug: "pit-red", name: "Pit Red" }] }));
    expect(pub.presets.map((p) => p.slug)).toEqual(["pit-red"]);
  });
});
