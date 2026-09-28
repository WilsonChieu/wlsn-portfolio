import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { EventManifest, GenreEntry, PhotoEntry, SiteManifest } from "@/lib/manifest";
import { JPEG_QUALITY, SITE_MANIFEST_KEY, VARIANT_WIDTHS, eventManifestKey, photoKey, variantKey } from "@/lib/photo-keys";
import { mapLimit } from "@/lib/pool";
import { bucketUsageBytes, objectExists, publicBucket, putJson, putObject } from "@/lib/r2";
import { slugify, uniqueId } from "@/lib/slug";
import { STORAGE_LIMIT_BYTES, formatGB } from "@/lib/storage";

const DRY_RUN = process.argv.includes("--dry-run");
const WORK_DIR = path.join(process.cwd(), "public", "work");
const IMAGE_FILE = /\.(jpe?g|png|webp|gif)$/i;
const COVER_FILE = /^cover\.(jpe?g|png|webp)$/i;

const GENRE_LABELS: Record<string, { title: string; meta: string }> = {
  concerts: { title: "Concerts", meta: "Live Sets" },
  graduation: { title: "Graduation", meta: "Graduation" },
  events: { title: "Events", meta: "Event" },
};

// Commit 799db5e replaced these covers with upscaled copies. Upscaling added no detail, so upload
// the originals at their true size instead of the inflated files.
const PRE_UPSCALE_REV = "799db5e^";
const PRE_UPSCALE = new Set([
  "concerts/off-the-track/cover.jpg",
  "graduation/kenneth-lea/cover.JPG",
  "graduation/cover.JPG",
]);

const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
const sha = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");
const titleCase = (slug: string) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

function subdirs(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort(natural);
}

function readSource(rel: string): Buffer {
  if (PRE_UPSCALE.has(rel)) {
    return execFileSync("git", ["show", `${PRE_UPSCALE_REV}:public/work/${rel}`], { maxBuffer: 1 << 28 });
  }
  return fs.readFileSync(path.join(WORK_DIR, rel));
}

let uploadedBytes = 0;
let photoCount = 0;

async function uploadPhoto(key: string, buf: Buffer): Promise<{ width: number; height: number }> {
  const meta = await sharp(buf).metadata();
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = rotated ? meta.height! : meta.width!;
  const height = rotated ? meta.width! : meta.height!;
  photoCount++;
  if (DRY_RUN) return { width, height };

  const rendered = new Map<number, Buffer>();
  for (const w of VARIANT_WIDTHS) {
    const vKey = variantKey(key, w);
    if (await objectExists(publicBucket(), vKey)) continue;
    const target = Math.min(w, width);
    let out = rendered.get(target);
    if (!out) {
      out = await sharp(buf)
        .rotate()
        .resize({ width: target, kernel: "lanczos3" })
        .jpeg({ quality: Math.round(JPEG_QUALITY * 100), mozjpeg: true })
        .toBuffer();
      rendered.set(target, out);
    }
    await putObject(publicBucket(), vKey, out, "image/jpeg");
    uploadedBytes += out.length;
  }
  return { width, height };
}

async function migrateEvent(genre: string, event: string): Promise<{ manifest: EventManifest; coverHash: string | null }> {
  const dir = path.join(WORK_DIR, genre, event);
  const files = fs.readdirSync(dir).filter((f) => IMAGE_FILE.test(f)).sort(natural);
  const coverFile = files.find((f) => COVER_FILE.test(f));
  const gallery = files.filter((f) => f !== coverFile);

  const taken = new Set<string>();
  const ids = gallery.map((f) => {
    const id = uniqueId(slugify(path.parse(f).name), taken);
    taken.add(id);
    return id;
  });

  const photos: PhotoEntry[] = await mapLimit(gallery, 4, async (file, i) => {
    const rel = `${genre}/${event}/${file}`;
    const dims = await uploadPhoto(photoKey(genre, event, ids[i]), readSource(rel));
    return { id: ids[i], ...dims };
  });

  let cover: string | null = null;
  let coverHash: string | null = null;
  if (coverFile) {
    const rel = `${genre}/${event}/${coverFile}`;
    coverHash = sha(fs.readFileSync(path.join(dir, coverFile)));
    const duplicateIndex = PRE_UPSCALE.has(rel)
      ? -1
      : gallery.findIndex((f) => sha(fs.readFileSync(path.join(dir, f))) === coverHash);
    if (duplicateIndex >= 0) {
      cover = ids[duplicateIndex];
    } else {
      cover = uniqueId("cover", taken);
      const dims = await uploadPhoto(photoKey(genre, event, cover), readSource(rel));
      photos.push({ id: cover, ...dims, hidden: true });
    }
  }

  return { manifest: { title: titleCase(event), cover, photos }, coverHash };
}

async function main() {
  const site: SiteManifest = { genres: [] };

  for (const genre of subdirs(WORK_DIR)) {
    const label = GENRE_LABELS[genre] ?? { title: titleCase(genre), meta: titleCase(genre) };
    const entry: GenreEntry = { slug: genre, ...label, events: [] };
    const coversByHash = new Map<string, { event: string; photo: string }>();

    for (const event of subdirs(path.join(WORK_DIR, genre))) {
      if (slugify(event) !== event) {
        throw new Error(`Folder "${genre}/${event}" is not a kebab-case slug — rename it first`);
      }
      const { manifest, coverHash } = await migrateEvent(genre, event);
      if (coverHash && manifest.cover) coversByHash.set(coverHash, { event, photo: manifest.cover });
      if (!DRY_RUN) await putJson(eventManifestKey(genre, event), manifest);
      entry.events.push(event);
      console.log(`${genre}/${event}: ${manifest.photos.length} photos, cover=${manifest.cover ?? "(first photo)"}`);
    }

    const genreCover = fs.readdirSync(path.join(WORK_DIR, genre)).find((f) => COVER_FILE.test(f));
    if (genreCover) {
      const match = coversByHash.get(sha(fs.readFileSync(path.join(WORK_DIR, genre, genreCover))));
      if (match) entry.cover = match;
      else console.warn(`${genre}/${genreCover} matches no shoot cover; the category will use its first shoot's cover`);
    }
    site.genres.push(entry);
  }

  if (DRY_RUN) {
    console.log(JSON.stringify(site, null, 2));
    console.log(`Dry run: ${photoCount} photos would be uploaded. Nothing was written.`);
    return;
  }
  await putJson(SITE_MANIFEST_KEY, site);
  console.log(`Done: ${photoCount} photos, ${(uploadedBytes / 1e6).toFixed(1)} MB uploaded this run.`);
  const used = await bucketUsageBytes();
  console.log(`Bucket now uses ${formatGB(used)} (uploads in /admin stop at ${formatGB(STORAGE_LIMIT_BYTES)}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
