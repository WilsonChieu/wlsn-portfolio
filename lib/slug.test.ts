import { describe, expect, it } from "vitest";
import { isSlug, slugify, uniqueId } from "@/lib/slug";

describe("slugify", () => {
  it.each([
    ["Off The Track", "off-the-track"],
    ["Wei Juin", "wei-juin"],
    ["TEDxAPU 2025", "tedxapu-2025"],
    ["  Café Ñoño!! ", "cafe-nono"],
    ["IMG_0001", "img-0001"],
    ["ICN-1", "icn-1"],
    ["a -- b", "a-b"],
    ["____", ""],
    ["", ""],
  ])("%j → %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("uniqueId", () => {
  it("returns the base when free", () => {
    expect(uniqueId("ott-1", new Set())).toBe("ott-1");
  });
  it("suffixes -2, -3 on collisions", () => {
    expect(uniqueId("icn-1", new Set(["icn-1"]))).toBe("icn-1-2");
    expect(uniqueId("icn-1", new Set(["icn-1", "icn-1-2"]))).toBe("icn-1-3");
  });
  it("uses 'photo' for an empty base", () => {
    expect(uniqueId("", new Set())).toBe("photo");
    expect(uniqueId("", new Set(["photo"]))).toBe("photo-2");
  });
  it("does not mutate the taken set", () => {
    const taken = new Set(["a"]);
    uniqueId("a", taken);
    expect([...taken]).toEqual(["a"]);
  });
});

describe("isSlug", () => {
  it.each(["off-the-track", "wanyi", "tedxapu-2025", "a"])("accepts %j", (v) => {
    expect(isSlug(v)).toBe(true);
  });
  it.each(["", "Off", "../x", "a/b", "a--b", "-a", "a-", "a b", 5, null, undefined])("rejects %j", (v) => {
    expect(isSlug(v)).toBe(false);
  });
});
