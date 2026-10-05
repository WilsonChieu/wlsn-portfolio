import { describe, expect, it } from "vitest";
import { desktopRows, mobileRows, orientationOf, type Orientation } from "@/lib/editorial";

const cols = (rows: ReturnType<typeof desktopRows>) => rows.map((r) => r.items.map((i) => `${i.start}/${i.span}:${i.ratio}`));

describe("orientationOf", () => {
  it("is portrait only when taller than wide", () => {
    expect(orientationOf(4000, 6000)).toBe("P");
    expect(orientationOf(6000, 4000)).toBe("L");
    expect(orientationOf(3000, 3000)).toBe("L");
  });
});

describe("desktopRows", () => {
  it("lays three portraits side by side", () => {
    expect(cols(desktopRows(["P", "P", "P"]))).toEqual([["1/4:2/3", "5/4:2/3", "9/4:2/3"]]);
  });
  it("opens with a full-width landscape and offsets the next lone landscape", () => {
    expect(cols(desktopRows(["L", "L"]))).toEqual([["1/12:16/10"], ["4/9:3/2"]]);
  });
  it("staggers portrait pairs by row parity", () => {
    expect(cols(desktopRows(["P", "P"]))).toEqual([["1/5:2/3", "8/4:2/3"]]);
    expect(cols(desktopRows(["L", "P", "P"]))).toEqual([["1/12:16/10"], ["2/4:2/3", "7/5:2/3"]]);
  });
  it("pairs a portrait with a following landscape", () => {
    expect(cols(desktopRows(["P", "L"]))).toEqual([["1/4:2/3", "6/7:3/2"]]);
  });
  it("centres a trailing lone portrait", () => {
    expect(cols(desktopRows(["L", "P"]))).toEqual([["1/12:16/10"], ["4/5:2/3"]]);
  });
  it("returns no rows for no photos", () => {
    expect(desktopRows([])).toEqual([]);
  });
  it("uses every photo exactly once, in order, within 12 columns", () => {
    const seq: Orientation[] = [..."LPPPLPLLPPLPPPLPLLLLLLLLLLLLLPPPPPPLPLPP"] as Orientation[];
    const rows = desktopRows(seq);
    expect(rows.flatMap((r) => r.items.map((i) => i.index))).toEqual(seq.map((_, i) => i));
    for (const r of rows) for (const i of r.items) expect(i.start + i.span - 1).toBeLessThanOrEqual(12);
  });
});

describe("mobileRows", () => {
  it("pairs portraits and gives singles their own row", () => {
    expect(mobileRows(["P", "P", "L", "P"]).map((r) => r.items.map((i) => `${i.index}:${i.ratio}`))).toEqual([
      ["0:2/3", "1:2/3"],
      ["2:3/2"],
      ["3:4/5"],
    ]);
  });
  it("returns no rows for no photos", () => {
    expect(mobileRows([])).toEqual([]);
  });
});
