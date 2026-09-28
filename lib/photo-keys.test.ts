import { describe, expect, it } from "vitest";
import {
  eventManifestKey,
  eventPrefix,
  originalKey,
  photoKey,
  photoPrefix,
  pickVariantWidth,
  variantKey,
} from "@/lib/photo-keys";

describe("pickVariantWidth", () => {
  it.each([
    [1, 640],
    [640, 640],
    [641, 1280],
    [1920, 1920],
    [2048, 2560],
    [3840, 3840],
    [7680, 3840],
  ])("%i → %i", (width, expected) => {
    expect(pickVariantWidth(width)).toBe(expected);
  });
});

describe("keys", () => {
  const key = photoKey("concerts", "off-the-track", "ott-1");

  it("builds photo, variant and original keys", () => {
    expect(key).toBe("concerts/off-the-track/ott-1");
    expect(variantKey(key, 1280)).toBe("concerts/off-the-track/ott-1/w1280.jpg");
    expect(originalKey(key, "jpg")).toBe("concerts/off-the-track/ott-1/original.jpg");
  });

  it("builds event keys", () => {
    expect(eventPrefix("concerts", "off-the-track")).toBe("concerts/off-the-track/");
    expect(eventManifestKey("concerts", "off-the-track")).toBe("concerts/off-the-track/_event.json");
  });

  it("photo prefix of ott-1 does not match ott-10", () => {
    const prefix = photoPrefix(key);
    expect(variantKey(key, 640).startsWith(prefix)).toBe(true);
    expect(variantKey(photoKey("concerts", "off-the-track", "ott-10"), 640).startsWith(prefix)).toBe(false);
  });
});
