import { describe, expect, it } from "vitest";
import { chunk, mapLimit } from "@/lib/pool";

describe("mapLimit", () => {
  it("keeps input order and never exceeds the limit", async () => {
    let active = 0;
    let peak = 0;
    const out = await mapLimit([30, 10, 20, 5], 2, async (ms, i) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, ms));
      active--;
      return i * 10;
    });
    expect(out).toEqual([0, 10, 20, 30]);
    expect(peak).toBe(2);
  });

  it("handles an empty list", async () => {
    expect(await mapLimit([], 3, async () => 1)).toEqual([]);
  });
});

describe("chunk", () => {
  it("splits into groups of at most n, keeping order", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it("returns no groups for an empty list", () => {
    expect(chunk([], 3)).toEqual([]);
  });
});
