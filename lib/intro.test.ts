import { describe, expect, it } from "vitest";
import { shouldPlayIntro } from "@/lib/intro";

const base = { flag: "play" as string | undefined, seen: false, reducedMotion: false, hidden: false, frames: 5 };

describe("shouldPlayIntro", () => {
  it("plays only when the pre-paint script asked for it and nothing rules it out", () => {
    expect(shouldPlayIntro(base)).toBe(true);
  });
  it("never plays without the pre-paint flag (no JS script ran, client-side navigation, or it was skipped)", () => {
    expect(shouldPlayIntro({ ...base, flag: undefined })).toBe(false);
    expect(shouldPlayIntro({ ...base, flag: "skip" })).toBe(false);
  });
  it("does not replay once seen this session", () => {
    expect(shouldPlayIntro({ ...base, seen: true })).toBe(false);
  });
  it("respects reduced motion even if the flag says play", () => {
    expect(shouldPlayIntro({ ...base, reducedMotion: true })).toBe(false);
  });
  it("skips in a background tab, where the browser would freeze it", () => {
    expect(shouldPlayIntro({ ...base, hidden: true })).toBe(false);
  });
  it("skips when there are no slideshow photos to reveal", () => {
    expect(shouldPlayIntro({ ...base, frames: 0 })).toBe(false);
  });
});
