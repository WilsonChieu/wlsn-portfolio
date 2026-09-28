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
  it("accepts valid requests", () => {
    expect(parseUploadPhotos([{ id: "ott-1", bytes: 2_700_000 }])).toEqual([{ id: "ott-1", bytes: 2_700_000 }]);
  });
  it.each([
    [[]],
    [[{ id: "ott-1" }]],
    [[{ id: "ott-1", bytes: 0 }]],
    [[{ id: "ott-1", bytes: 1.5 }]],
    [[{ id: "ott-1", bytes: 600_000_000 }]],
    [[{ id: "ott-1", bytes: "100" }]],
    [[{ id: "../ott", bytes: 100 }]],
    [Array.from({ length: 51 }, (_, i) => ({ id: `p${i}`, bytes: 100 }))],
  ])("rejects %j", (value) => {
    expect(parseUploadPhotos(value)).toBeNull();
  });
});
