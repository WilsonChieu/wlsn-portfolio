import { describe, expect, it } from "vitest";
import { introAction } from "@/lib/intro";

const base = { flag: "play" as string | undefined, seen: false, reducedMotion: false, hidden: false, frames: 5 };

describe("introAction", () => {
  it("plays when the pre-paint script asked for it and nothing rules it out", () => {
    expect(introAction(base)).toBe("play");
  });
  it("waits while the page is hidden (pre-rendered or opened in the background) instead of giving up", () => {
    expect(introAction({ ...base, hidden: true })).toBe("wait");
  });
  it("never plays without the pre-paint flag (no JS script ran, client-side navigation, or it was skipped)", () => {
    expect(introAction({ ...base, flag: undefined })).toBe("skip");
    expect(introAction({ ...base, flag: "skip" })).toBe("skip");
  });
  it("does not replay once seen this session", () => {
    expect(introAction({ ...base, seen: true })).toBe("skip");
  });
  it("respects reduced motion even if the flag says play", () => {
    expect(introAction({ ...base, reducedMotion: true })).toBe("skip");
    expect(introAction({ ...base, reducedMotion: true, hidden: true })).toBe("skip");
  });
  it("skips when there are no slideshow photos to reveal", () => {
    expect(introAction({ ...base, frames: 0 })).toBe("skip");
  });
});
