import { describe, expect, it } from "vitest";
import { parsePhotoEntries, parseShootRef, parseUploadPhotos } from "@/lib/admin-validate";

describe("parseShootRef", () => {
  it("accepts slugs", () => {
    expect(parseShootRef({ genre: "concerts", event: "off-the-track" })).toEqual({
      genre: "concerts",
      event: "off-the-track",
    });
  });
  it.each([
    null,
    "x",
    {},
    { genre: "../x", event: "a" },
    { genre: "Concerts", event: "a" },
    { genre: "concerts", event: "a/b" },
    { genre: "concerts", event: 5 },
  ])("rejects %j", (body) => {
    expect(parseShootRef(body)).toBeNull();
  });
});

describe("parsePhotoEntries", () => {
  it("accepts valid entries and keeps hidden only when true", () => {
    expect(
      parsePhotoEntries([
        { id: "a", width: 10, height: 20 },
        { id: "cover", width: 10, height: 20, hidden: true },
        { id: "b", width: 10, height: 20, hidden: false },
      ])
    ).toEqual([
      { id: "a", width: 10, height: 20 },
      { id: "cover", width: 10, height: 20, hidden: true },
      { id: "b", width: 10, height: 20 },
    ]);
  });
  it.each([
    [[]],
    ["nope"],
    [[{ id: "A", width: 1, height: 1 }]],
    [[{ id: "a", width: 0, height: 1 }]],
    [[{ id: "a", width: 1.5, height: 1 }]],
    [[{ id: "a", width: 1, height: 200_000 }]],
    [[{ id: "a", width: 1, height: 1, hidden: "yes" }]],
    [[{ id: "a", width: 1, height: 1 }, null]],
  ])("rejects %j", (value) => {
    expect(parsePhotoEntries(value)).toBeNull();
  });
});

describe("parseUploadPhotos", () => {
  const sizes = [100_000, 300_000, 600_000, 1_000_000, 2_000_000];
  it("accepts one byte size per variant", () => {
    expect(parseUploadPhotos([{ id: "ott-1", sizes }])).toEqual([{ id: "ott-1", sizes }]);
  });
  it.each([
    [[]],
    [[{ id: "ott-1" }]],
    [[{ id: "ott-1", sizes: [1, 2, 3, 4] }]],
    [[{ id: "ott-1", sizes: [1, 2, 3, 4, 0] }]],
    [[{ id: "ott-1", sizes: [1, 2, 3, 4, 1.5] }]],
    [[{ id: "ott-1", sizes: [1, 2, 3, 4, 200_000_000] }]],
    [[{ id: "ott-1", sizes: [1, 2, 3, 4, "5"] }]],
    [[{ id: "../ott", sizes }]],
    [Array.from({ length: 51 }, (_, i) => ({ id: `p${i}`, sizes }))],
  ])("rejects %j", (value) => {
    expect(parseUploadPhotos(value)).toBeNull();
  });
});
