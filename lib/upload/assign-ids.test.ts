import { describe, expect, it } from "vitest";
import { assignPhotoIds } from "@/lib/upload/assign-ids";

const nameOf = (f: string) => f;

describe("assignPhotoIds", () => {
  it("derives unique ids from filenames, avoiding ids already in the shoot", () => {
    const ids = assignPhotoIds(["IMG_1.jpg", "img-1.png", "cover.jpg"], nameOf, new Set(["img-1"]), new Map());
    expect([...ids.values()]).toEqual(["img-1-2", "img-1-3", "cover"]);
  });

  it("reuses a file's earlier id on retry so a lost commit response can't duplicate it", () => {
    const known = new Map([["a.jpg", "a"]]);
    // The earlier commit actually landed, so "a" is now in the shoot's manifest.
    const ids = assignPhotoIds(["a.jpg", "b.jpg"], nameOf, new Set(["a"]), known);
    expect(ids.get("a.jpg")).toBe("a");
    expect(ids.get("b.jpg")).toBe("b");
  });

  it("never gives a new file an id that a retried file is keeping", () => {
    const known = new Map([["x/a.jpg", "a"]]);
    const ids = assignPhotoIds(["x/a.jpg", "y/a.jpg"], (f) => f.split("/")[1], new Set(), known);
    expect(ids.get("x/a.jpg")).toBe("a");
    expect(ids.get("y/a.jpg")).toBe("a-2");
  });
});
