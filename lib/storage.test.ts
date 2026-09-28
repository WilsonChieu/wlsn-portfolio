import { describe, expect, it } from "vitest";
import { STORAGE_LIMIT_BYTES, canStore, formatGB } from "@/lib/storage";

describe("canStore", () => {
  it("allows uploads that land exactly on the limit", () => {
    expect(canStore(STORAGE_LIMIT_BYTES - 100, 100)).toBe(true);
  });
  it("refuses uploads that would pass the limit", () => {
    expect(canStore(STORAGE_LIMIT_BYTES - 100, 101)).toBe(false);
    expect(canStore(STORAGE_LIMIT_BYTES + 1, 0)).toBe(false);
  });
  it("keeps the limit below the 10 GB free tier", () => {
    expect(STORAGE_LIMIT_BYTES).toBeLessThan(10_000_000_000);
  });
  it("accepts a custom limit", () => {
    expect(canStore(5, 5, 10)).toBe(true);
    expect(canStore(6, 5, 10)).toBe(false);
  });
});

describe("formatGB", () => {
  it("formats decimal gigabytes with two decimals", () => {
    expect(formatGB(2_530_000_000)).toBe("2.53 GB");
    expect(formatGB(0)).toBe("0.00 GB");
  });
});
