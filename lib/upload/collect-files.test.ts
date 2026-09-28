import { describe, expect, it } from "vitest";
import { groupFiles } from "@/lib/upload/collect-files";

const items = (...paths: string[]) => paths.map((path) => ({ path, file: path }));

describe("groupFiles", () => {
  it("makes one group per top-level folder, including subfolders, naturally sorted", () => {
    const { groups, skipped } = groupFiles(
      items("Kelly/10.jpg", "Kelly/2.JPG", "Kelly/extra/1.png", "Off The Track/a.jpeg"),
      "by-folder"
    );
    expect(groups).toEqual([
      { name: "Kelly", files: ["Kelly/2.JPG", "Kelly/10.jpg", "Kelly/extra/1.png"] },
      { name: "Off The Track", files: ["Off The Track/a.jpeg"] },
    ]);
    expect(skipped).toEqual([]);
  });

  it("skips hidden files, RAW files and non-images", () => {
    const { groups, skipped } = groupFiles(
      items("S/.DS_Store", "S/._1.jpg", "S/1.CR3", "S/1.xmp", "S/Thumbs.db", "S/1.jpg", "S/2.HEIC"),
      "by-folder"
    );
    expect(groups).toEqual([{ name: "S", files: ["S/1.jpg", "S/2.HEIC"] }]);
    expect(skipped).toEqual(["S/._1.jpg", "S/.DS_Store", "S/1.CR3", "S/1.xmp", "S/Thumbs.db"]);
  });

  it("puts loose files in an unnamed group", () => {
    expect(groupFiles(items("a.jpg", "b.jpg"), "by-folder").groups).toEqual([{ name: "", files: ["a.jpg", "b.jpg"] }]);
  });

  it("merges everything into one unnamed group in single mode", () => {
    expect(groupFiles(items("A/1.jpg", "B/1.jpg", "c.jpg"), "single").groups).toEqual([
      { name: "", files: ["A/1.jpg", "B/1.jpg", "c.jpg"] },
    ]);
  });

  it("returns no groups when nothing is a photo", () => {
    expect(groupFiles(items("S/notes.txt"), "by-folder")).toEqual({ groups: [], skipped: ["S/notes.txt"] });
  });
});
