import { beforeEach, describe, expect, it } from "vitest";
import photoLoader from "@/lib/image-loader";

describe("photoLoader", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_PHOTO_BASE_URL = "https://pub-test.r2.dev";
  });

  it("maps a photo key and width to the nearest larger variant", () => {
    expect(photoLoader({ src: "concerts/off-the-track/ott-1", width: 1080 })).toBe(
      "https://pub-test.r2.dev/concerts/off-the-track/ott-1/w1280.jpg"
    );
  });

  it("caps at the largest variant", () => {
    expect(photoLoader({ src: "a/b/c", width: 5000 })).toBe("https://pub-test.r2.dev/a/b/c/w3840.jpg");
  });

  it("passes local and absolute URLs through untouched", () => {
    expect(photoLoader({ src: "/favicon.ico", width: 64 })).toBe("/favicon.ico");
    expect(photoLoader({ src: "https://example.com/x.jpg", width: 64 })).toBe("https://example.com/x.jpg");
  });
});
