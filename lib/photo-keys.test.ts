import { describe, expect, it } from "vitest";
import {
  eventManifestKey,
  eventPrefix,
  photoKey,
  photoPrefix,
  pickVariantWidth,
  variantKey,
  variantTargetWidth,
  MAX_CANVAS_PIXELS,
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

  it("builds photo and variant keys", () => {
    expect(key).toBe("concerts/off-the-track/ott-1");
    expect(variantKey(key, 1280)).toBe("concerts/off-the-track/ott-1/w1280.jpg");
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

describe("variantTargetWidth", () => {
  it("never upscales", () => {
    expect(variantTargetWidth(3840, 2000, 3000)).toBe(2000);
  });
  it("uses the requested width when the canvas stays under the pixel cap", () => {
    expect(variantTargetWidth(3840, 6000, 4000)).toBe(3840);
    expect(variantTargetWidth(1280, 4284, 5712)).toBe(1280);
  });
  it("caps tall portraits so the canvas stays under iOS Safari's ~16.7 MP limit", () => {
    const w = variantTargetWidth(3840, 4284, 5712);
    expect(w).toBeLessThan(3840);
    expect(w * Math.round((5712 * w) / 4284)).toBeLessThanOrEqual(MAX_CANVAS_PIXELS);
  });
});
