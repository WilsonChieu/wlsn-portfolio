# R2 Photo Storage + Admin Uploads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all portfolio photos from `public/work/` (in git, served through Vercel image optimization) to Cloudflare R2 with pre-sized JPEG variants, and add a password-protected `/admin` where Wilson drags shoot folders in from a browser.

**Architecture:** One public R2 bucket holds resized variants + JSON manifests describing categories/shoots/photos (originals are not stored — amended 2026-09-28 to stay on the free tier). The public site reads the manifests server-side through the S3 API (ISR, revalidated on every admin change) and renders photos through a custom `next/image` loader that points straight at pre-built R2 variants, so Vercel never processes an image. The admin resizes photos in the browser and uploads them directly to R2 via presigned URLs; small API routes sign URLs and edit manifests.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind, Cloudflare R2 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`), `pica` (browser resize), `sharp` (migration script), `tsx` (runs the TS migration script), Vitest (new).

**Spec:** `docs/superpowers/specs/2026-09-28-r2-photo-storage-design.md`

## Global Constraints

- Variant widths are exactly `640, 1280, 1920, 2560, 3840`; every photo has all five keys; a variant wider than the source is stored at the source's native width (never upscaled).
- Variants are JPEG, quality 88 (`0.88` in browser, `88` + mozjpeg in `sharp`), orientation applied, metadata stripped. Keys: `<genre>/<event>/<photoId>/w<width>.jpg`.
- Originals are never stored in R2 (amendment 2026-09-28). Uploads are refused when bucket bytes + incoming bytes would exceed `STORAGE_LIMIT_BYTES = 9_000_000_000` (spec §5a).
- Manifests: `_site.json` and `<genre>/<event>/_event.json` in the public bucket, shapes exactly as in spec §3 (plus optional `hidden: true` on a photo).
- All slugs and photo ids match `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Session cookie `wlsn_admin` = `<expiryUnixSeconds>.<hex HMAC-SHA256(expiry)>`, `httpOnly`, `Secure` in production, `SameSite=Strict`, 7 days.
- Env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BUCKET`, `NEXT_PUBLIC_PHOTO_BASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`. Never committed; never pasted into chat.
- Repo conventions (CLAUDE.md): `@/*` imports after external ones; `"use client"` only where needed; Tailwind only; `.focus-ring` on interactive elements; comments only for non-obvious "why".
- Commits: no `Co-Authored-By` trailer (project memory). Work on branch `claude/code-folder-explanation-ac7d13`; never push to `master` until Task 15.
- Verification per CLAUDE.md: `npm run build` **and** a browser check before claiming anything works. `npm test` runs Vitest.

## Review Focus

- Messy filenames in a dropped folder (spaces, accents, `IMG_0001.JPG` in two subfolders, `____.jpg`, `ICN-1.jpeg` + `ICN-1.jpg`) must still yield unique, valid photo ids — pinned in Task 2 (`slugify` / `uniqueId` tests).
- Deleting the photo that is a shoot's cover, or a shoot that is its category's cover, must fall back to the first photo / first shoot, never a broken image — pinned in Task 4 (`removePhoto`, `removeEventFromGenre`, `clearGenreCoverIfPhoto` tests).
- Retrying a partially failed upload (same photo committed twice) must not duplicate photos — pinned in Task 4 (`addPhotos` upsert test).
- Forged, expired, malformed session cookies or a missing secret must be rejected without throwing — pinned in Task 5 tests.
- An upload that would push storage past 9 GB must be refused with a clear message before any bytes are stored — pinned in Task 7a (`canStore` boundary tests).
- Crafted admin API input (`../x`, uppercase slugs, zero/huge dimensions, empty photo list, bad byte counts) must be rejected, and deleting photo `ott-1` must never touch `ott-10/…` — pinned in Task 6 (validators) and Task 3 (`photoPrefix`).

---

### Task 1: Tidy pending changes

The branch has uncommitted edits from earlier in the session: two folder renames (keep) and `quality={90}`/AVIF edits (drop — superseded, and they increase Vercel cache writes).

**Files:**
- Modify (revert): `next.config.mjs`, `components/WorkList.tsx`, `app/work/[genre]/page.tsx`, `app/work/[genre]/[event]/page.tsx`
- Commit renames: `public/work/graduation/Wanyi` → `wanyi`, `public/work/graduation/Wei-juin` → `wei-juin` (already staged)

**Interfaces:** Consumes nothing. Produces a clean tree where every event folder name is a kebab-case slug (Task 9's migration script refuses non-slug folders).

- [ ] **Step 1: Revert the quality/AVIF edits**

```bash
git checkout -- next.config.mjs components/WorkList.tsx "app/work/[genre]/page.tsx" "app/work/[genre]/[event]/page.tsx"
```

- [ ] **Step 2: Verify only the renames remain**

Run: `git status --short | grep -v "^R "`
Expected: no output except possibly `?? .claude/` (untracked, ignore).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds; route list includes `/work/graduation/wanyi` and `/work/graduation/wei-juin` (may be under "+N more paths").

- [ ] **Step 4: Commit**

```bash
git commit -m "Rename remaining graduation folders to kebab-case slugs"
```

---

### Task 2: Vitest, slugs and a concurrency helper

**Files:**
- Modify: `package.json` (add `test` script, devDependency `vitest`)
- Create: `vitest.config.ts`
- Create: `lib/slug.ts`, `lib/slug.test.ts`
- Create: `lib/pool.ts`, `lib/pool.test.ts`

**Interfaces:**
- Produces:
  - `slugify(input: string): string` — may return `""`.
  - `uniqueId(base: string, taken: Set<string>): string` — does **not** add to `taken`; empty base becomes `"photo"`.
  - `SLUG_PATTERN: RegExp`, `isSlug(value: unknown): value is string`
  - `mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]>` — results in input order; `fn` should catch its own errors (a throw rejects the whole call).

- [ ] **Step 1: Install Vitest and add the script**

```bash
npm install -D vitest
npm pkg set scripts.test="vitest run"
```

Create `vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write the failing tests**

`lib/slug.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isSlug, slugify, uniqueId } from "@/lib/slug";

describe("slugify", () => {
  it.each([
    ["Off The Track", "off-the-track"],
    ["Wei Juin", "wei-juin"],
    ["TEDxAPU 2025", "tedxapu-2025"],
    ["  Café Ñoño!! ", "cafe-nono"],
    ["IMG_0001", "img-0001"],
    ["ICN-1", "icn-1"],
    ["a -- b", "a-b"],
    ["____", ""],
    ["", ""],
  ])("%j → %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("uniqueId", () => {
  it("returns the base when free", () => {
    expect(uniqueId("ott-1", new Set())).toBe("ott-1");
  });
  it("suffixes -2, -3 on collisions", () => {
    expect(uniqueId("icn-1", new Set(["icn-1"]))).toBe("icn-1-2");
    expect(uniqueId("icn-1", new Set(["icn-1", "icn-1-2"]))).toBe("icn-1-3");
  });
  it("uses 'photo' for an empty base", () => {
    expect(uniqueId("", new Set())).toBe("photo");
    expect(uniqueId("", new Set(["photo"]))).toBe("photo-2");
  });
  it("does not mutate the taken set", () => {
    const taken = new Set(["a"]);
    uniqueId("a", taken);
    expect([...taken]).toEqual(["a"]);
  });
});

describe("isSlug", () => {
  it.each(["off-the-track", "wanyi", "tedxapu-2025", "a"])("accepts %j", (v) => {
    expect(isSlug(v)).toBe(true);
  });
  it.each(["", "Off", "../x", "a/b", "a--b", "-a", "a-", "a b", 5, null, undefined])("rejects %j", (v) => {
    expect(isSlug(v)).toBe(false);
  });
});
```

`lib/pool.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mapLimit } from "@/lib/pool";

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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/slug` / `@/lib/pool`.

- [ ] **Step 4: Implement**

`lib/slug.ts`:

```ts
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniqueId(base: string, taken: Set<string>): string {
  const root = base || "photo";
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}

export function isSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG_PATTERN.test(value);
}
```

`lib/pool.ts`:

```ts
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/slug.ts lib/slug.test.ts lib/pool.ts lib/pool.test.ts
git commit -m "Add Vitest, slug helpers and a concurrency-limited map"
```

---

### Task 3: Photo keys and the custom image loader

**Files:**
- Create: `lib/photo-keys.ts`, `lib/photo-keys.test.ts`
- Create: `lib/image-loader.ts`, `lib/image-loader.test.ts`

**Interfaces:**
- Produces (`lib/photo-keys.ts`):
  - `VARIANT_WIDTHS: readonly [640, 1280, 1920, 2560, 3840]`
  - `JPEG_QUALITY = 0.88`
  - `SITE_MANIFEST_KEY = "_site.json"`
  - `eventPrefix(genre, event): string` → `"<genre>/<event>/"`
  - `eventManifestKey(genre, event): string` → `"<genre>/<event>/_event.json"`
  - `photoKey(genre, event, id): string` → `"<genre>/<event>/<id>"`
  - `photoPrefix(key): string` → `"<key>/"`
  - `variantKey(key, width): string` → `"<key>/w<width>.jpg"`
  - `originalKey(key, ext): string` → `"<key>/original.<ext>"`
  - `pickVariantWidth(width: number): number`
- Produces (`lib/image-loader.ts`): default export `photoLoader({ src, width }): string` (Next.js custom loader signature). Wired into `next.config.mjs` in Task 10, not here.

- [ ] **Step 1: Write the failing tests**

`lib/photo-keys.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  eventManifestKey,
  eventPrefix,
  originalKey,
  photoKey,
  photoPrefix,
  pickVariantWidth,
  variantKey,
} from "@/lib/photo-keys";

describe("pickVariantWidth", () => {
  it.each([
    [1, 640],
    [640, 640],
    [641, 1280],
    [1920, 1920],
    [2048, 2560],
    [3840, 3840],
    [7680, 3840],
  ])("%i → %i", (width, expected) => {
    expect(pickVariantWidth(width)).toBe(expected);
  });
});

describe("keys", () => {
  const key = photoKey("concerts", "off-the-track", "ott-1");

  it("builds photo, variant and original keys", () => {
    expect(key).toBe("concerts/off-the-track/ott-1");
    expect(variantKey(key, 1280)).toBe("concerts/off-the-track/ott-1/w1280.jpg");
    expect(originalKey(key, "jpg")).toBe("concerts/off-the-track/ott-1/original.jpg");
  });

  it("builds event keys", () => {
    expect(eventPrefix("concerts", "off-the-track")).toBe("concerts/off-the-track/");
    expect(eventManifestKey("concerts", "off-the-track")).toBe("concerts/off-the-track/_event.json");
  });

  it("photo prefix of ott-1 does not match ott-10", () => {
    const prefix = photoPrefix(key);
    expect(variantKey(key, 640).startsWith(prefix)).toBe(true);
    expect(variantKey(photoKey("concerts", "off-the-track", "ott-10"), 640).startsWith(prefix)).toBe(false);
  });
});
```

`lib/image-loader.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import photoLoader from "@/lib/image-loader";

describe("photoLoader", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_PHOTO_BASE_URL = "https://pub-test.r2.dev";
  });

  it("maps a photo key and width to the nearest larger variant", () => {
    expect(photoLoader({ src: "concerts/off-the-track/ott-1", width: 1080 })).toBe(
      "https://pub-test.r2.dev/concerts/off-the-track/ott-1/w1280.jpg"
    );
  });

  it("caps at the largest variant", () => {
    expect(photoLoader({ src: "a/b/c", width: 5000 })).toBe("https://pub-test.r2.dev/a/b/c/w3840.jpg");
  });

  it("passes local and absolute URLs through untouched", () => {
    expect(photoLoader({ src: "/favicon.ico", width: 64 })).toBe("/favicon.ico");
    expect(photoLoader({ src: "https://example.com/x.jpg", width: 64 })).toBe("https://example.com/x.jpg");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/photo-keys` / `@/lib/image-loader`.

- [ ] **Step 3: Implement**

`lib/photo-keys.ts`:

```ts
export const VARIANT_WIDTHS = [640, 1280, 1920, 2560, 3840] as const;
export const JPEG_QUALITY = 0.88;
export const SITE_MANIFEST_KEY = "_site.json";

export function eventPrefix(genre: string, event: string): string {
  return `${genre}/${event}/`;
}

export function eventManifestKey(genre: string, event: string): string {
  return `${eventPrefix(genre, event)}_event.json`;
}

export function photoKey(genre: string, event: string, id: string): string {
  return `${genre}/${event}/${id}`;
}

// The trailing slash matters: deleting by the bare key "…/ott-1" would also match "…/ott-10/…".
export function photoPrefix(key: string): string {
  return `${key}/`;
}

export function variantKey(key: string, width: number): string {
  return `${key}/w${width}.jpg`;
}

export function originalKey(key: string, ext: string): string {
  return `${key}/original.${ext}`;
}

export function pickVariantWidth(width: number): number {
  return VARIANT_WIDTHS.find((w) => w >= width) ?? VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1];
}
```

`lib/image-loader.ts`:

```ts
import { pickVariantWidth, variantKey } from "@/lib/photo-keys";

export default function photoLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  if (src.startsWith("/") || /^https?:\/\//.test(src)) return src;
  return `${process.env.NEXT_PUBLIC_PHOTO_BASE_URL}/${variantKey(src, pickVariantWidth(width))}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/photo-keys.ts lib/photo-keys.test.ts lib/image-loader.ts lib/image-loader.test.ts
git commit -m "Add R2 photo key helpers and a variant-picking image loader"
```

---

### Task 4: Manifest types and pure update functions

**Files:**
- Create: `lib/manifest.ts`, `lib/manifest.test.ts`

**Interfaces:**
- Consumes: `slugify` (Task 2).
- Produces:

```ts
interface PhotoEntry { id: string; width: number; height: number; hidden?: boolean }
interface EventManifest { title: string; cover: string | null; photos: PhotoEntry[] }
interface GenreCover { event: string; photo: string }
interface GenreEntry { slug: string; title: string; meta: string; cover?: GenreCover; events: string[] }
interface SiteManifest { genres: GenreEntry[] }
class ManifestError extends Error {}
emptySite(): SiteManifest
emptyEvent(title: string): EventManifest
resolveEventCover(ev: EventManifest): string | null
addGenre(site: SiteManifest, title: string, meta: string): { site: SiteManifest; slug: string }   // throws ManifestError
addEventToGenre(site: SiteManifest, genre: string, event: string): SiteManifest                  // throws ManifestError if genre unknown
removeEventFromGenre(site: SiteManifest, genre: string, event: string): SiteManifest
clearGenreCoverIfPhoto(site: SiteManifest, genre: string, event: string, photoId: string): SiteManifest  // returns same object if unchanged
addPhotos(ev: EventManifest, photos: PhotoEntry[], coverId?: string): EventManifest              // upsert by id
removePhoto(ev: EventManifest, id: string): EventManifest
setCover(ev: EventManifest, id: string): EventManifest                                           // throws ManifestError
```

All functions are pure (never mutate their input).

- [ ] **Step 1: Write the failing tests**

`lib/manifest.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  ManifestError,
  addEventToGenre,
  addGenre,
  addPhotos,
  clearGenreCoverIfPhoto,
  emptyEvent,
  emptySite,
  removeEventFromGenre,
  removePhoto,
  resolveEventCover,
  setCover,
  type EventManifest,
  type SiteManifest,
} from "@/lib/manifest";

const p = (id: string, hidden?: boolean) => (hidden ? { id, width: 100, height: 80, hidden } : { id, width: 100, height: 80 });

function site(): SiteManifest {
  return {
    genres: [
      {
        slug: "concerts",
        title: "Concerts",
        meta: "Live Sets",
        cover: { event: "off-the-track", photo: "cover" },
        events: ["icn", "off-the-track"],
      },
    ],
  };
}

describe("resolveEventCover", () => {
  it("uses the explicit cover when it exists", () => {
    expect(resolveEventCover({ title: "t", cover: "b", photos: [p("a"), p("b")] })).toBe("b");
  });
  it("falls back to the first visible photo", () => {
    expect(resolveEventCover({ title: "t", cover: null, photos: [p("h", true), p("a")] })).toBe("a");
    expect(resolveEventCover({ title: "t", cover: "gone", photos: [p("a")] })).toBe("a");
  });
  it("returns null for an empty shoot", () => {
    expect(resolveEventCover(emptyEvent("t"))).toBeNull();
  });
});

describe("addGenre", () => {
  it("appends with a slug and defaults meta to the title", () => {
    const { site: next, slug } = addGenre(emptySite(), "  Weddings ", "");
    expect(slug).toBe("weddings");
    expect(next.genres).toEqual([{ slug: "weddings", title: "Weddings", meta: "Weddings", events: [] }]);
  });
  it("rejects duplicates and empty names", () => {
    expect(() => addGenre(site(), "Concerts", "")).toThrow(ManifestError);
    expect(() => addGenre(site(), "!!!", "")).toThrow(ManifestError);
  });
  it("does not mutate the input", () => {
    const s = emptySite();
    addGenre(s, "Weddings", "");
    expect(s.genres).toEqual([]);
  });
});

describe("addEventToGenre / removeEventFromGenre", () => {
  it("appends a new event once", () => {
    const next = addEventToGenre(addEventToGenre(site(), "concerts", "new"), "concerts", "new");
    expect(next.genres[0].events).toEqual(["icn", "off-the-track", "new"]);
  });
  it("throws for an unknown genre", () => {
    expect(() => addEventToGenre(site(), "nope", "x")).toThrow(ManifestError);
  });
  it("removes the event and clears a genre cover that pointed at it", () => {
    const next = removeEventFromGenre(site(), "concerts", "off-the-track");
    expect(next.genres[0].events).toEqual(["icn"]);
    expect(next.genres[0].cover).toBeUndefined();
  });
  it("keeps the genre cover when another event is removed", () => {
    expect(removeEventFromGenre(site(), "concerts", "icn").genres[0].cover).toEqual({
      event: "off-the-track",
      photo: "cover",
    });
  });
});

describe("clearGenreCoverIfPhoto", () => {
  it("clears the genre cover when its photo is deleted", () => {
    expect(clearGenreCoverIfPhoto(site(), "concerts", "off-the-track", "cover").genres[0].cover).toBeUndefined();
  });
  it("returns the same object when nothing changes", () => {
    const s = site();
    expect(clearGenreCoverIfPhoto(s, "concerts", "off-the-track", "ott-1")).toBe(s);
  });
});

describe("addPhotos", () => {
  it("appends new photos and sets the cover when given", () => {
    const next = addPhotos(emptyEvent("Shoot"), [p("a"), p("b")], "b");
    expect(next.photos.map((x) => x.id)).toEqual(["a", "b"]);
    expect(next.cover).toBe("b");
  });
  it("replaces a photo with the same id instead of duplicating it (retry)", () => {
    const first: EventManifest = { title: "S", cover: null, photos: [p("a"), p("b")] };
    const next = addPhotos(first, [{ id: "a", width: 300, height: 200 }]);
    expect(next.photos).toEqual([{ id: "a", width: 300, height: 200 }, p("b")]);
  });
  it("keeps the existing cover when none is given", () => {
    expect(addPhotos({ title: "S", cover: "a", photos: [p("a")] }, [p("b")]).cover).toBe("a");
  });
});

describe("removePhoto / setCover", () => {
  const ev: EventManifest = { title: "S", cover: "b", photos: [p("a"), p("b")] };

  it("removes a photo and resets the cover if it was the cover", () => {
    const next = removePhoto(ev, "b");
    expect(next.photos.map((x) => x.id)).toEqual(["a"]);
    expect(next.cover).toBeNull();
    expect(resolveEventCover(next)).toBe("a");
  });
  it("keeps the cover when another photo is removed", () => {
    expect(removePhoto(ev, "a").cover).toBe("b");
  });
  it("sets an existing photo as cover and rejects unknown ids", () => {
    expect(setCover(ev, "a").cover).toBe("a");
    expect(() => setCover(ev, "zzz")).toThrow(ManifestError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/manifest`.

- [ ] **Step 3: Implement**

`lib/manifest.ts`:

```ts
import { slugify } from "@/lib/slug";

export interface PhotoEntry {
  id: string;
  width: number;
  height: number;
  hidden?: boolean;
}

export interface EventManifest {
  title: string;
  cover: string | null;
  photos: PhotoEntry[];
}

export interface GenreCover {
  event: string;
  photo: string;
}

export interface GenreEntry {
  slug: string;
  title: string;
  meta: string;
  cover?: GenreCover;
  events: string[];
}

export interface SiteManifest {
  genres: GenreEntry[];
}

export class ManifestError extends Error {}

export function emptySite(): SiteManifest {
  return { genres: [] };
}

export function emptyEvent(title: string): EventManifest {
  return { title, cover: null, photos: [] };
}

export function resolveEventCover(ev: EventManifest): string | null {
  if (ev.cover && ev.photos.some((p) => p.id === ev.cover)) return ev.cover;
  return ev.photos.find((p) => !p.hidden)?.id ?? null;
}

export function addGenre(site: SiteManifest, title: string, meta: string): { site: SiteManifest; slug: string } {
  const name = title.trim();
  const slug = slugify(name);
  if (!slug) throw new ManifestError("Category name needs at least one letter or number");
  if (site.genres.some((g) => g.slug === slug)) throw new ManifestError(`Category "${slug}" already exists`);
  const genre: GenreEntry = { slug, title: name, meta: meta.trim() || name, events: [] };
  return { site: { genres: [...site.genres, genre] }, slug };
}

function mapGenre(site: SiteManifest, genre: string, fn: (g: GenreEntry) => GenreEntry): SiteManifest {
  if (!site.genres.some((g) => g.slug === genre)) throw new ManifestError(`Unknown category "${genre}"`);
  return { genres: site.genres.map((g) => (g.slug === genre ? fn(g) : g)) };
}

export function addEventToGenre(site: SiteManifest, genre: string, event: string): SiteManifest {
  return mapGenre(site, genre, (g) => (g.events.includes(event) ? g : { ...g, events: [...g.events, event] }));
}

function withoutCover(g: GenreEntry): GenreEntry {
  const next = { ...g };
  delete next.cover;
  return next;
}

export function removeEventFromGenre(site: SiteManifest, genre: string, event: string): SiteManifest {
  return mapGenre(site, genre, (g) => {
    const next = { ...g, events: g.events.filter((e) => e !== event) };
    return g.cover?.event === event ? withoutCover(next) : next;
  });
}

export function clearGenreCoverIfPhoto(
  site: SiteManifest,
  genre: string,
  event: string,
  photoId: string
): SiteManifest {
  const target = site.genres.find((g) => g.slug === genre);
  if (!target?.cover || target.cover.event !== event || target.cover.photo !== photoId) return site;
  return mapGenre(site, genre, withoutCover);
}

export function addPhotos(ev: EventManifest, photos: PhotoEntry[], coverId?: string): EventManifest {
  const incoming = new Map(photos.map((p) => [p.id, p]));
  const replaced = ev.photos.map((p) => incoming.get(p.id) ?? p);
  const existing = new Set(ev.photos.map((p) => p.id));
  const appended = photos.filter((p) => !existing.has(p.id));
  return { ...ev, cover: coverId ?? ev.cover, photos: [...replaced, ...appended] };
}

export function removePhoto(ev: EventManifest, id: string): EventManifest {
  return { ...ev, cover: ev.cover === id ? null : ev.cover, photos: ev.photos.filter((p) => p.id !== id) };
}

export function setCover(ev: EventManifest, id: string): EventManifest {
  if (!ev.photos.some((p) => p.id === id)) throw new ManifestError(`No photo "${id}" in this shoot`);
  return { ...ev, cover: id };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/manifest.ts lib/manifest.test.ts
git commit -m "Add photo manifest types and pure update functions"
```

---

### Task 5: Admin session tokens

**Files:**
- Create: `lib/auth.ts`, `lib/auth.test.ts`

**Interfaces:**
- Produces:
  - `SESSION_COOKIE = "wlsn_admin"`, `SESSION_TTL_SECONDS = 604800`
  - `createSessionToken(secret: string, nowMs?: number): Promise<string>`
  - `verifySessionToken(token: string | undefined, secret: string, nowMs?: number): Promise<boolean>` — never throws.
  - `passwordMatches(input: string, expected: string, secret: string): Promise<boolean>` — false if `expected` is empty.
- Uses only Web Crypto (`crypto.subtle`), so it runs in the Edge middleware and in Node 22.

- [ ] **Step 1: Write the failing tests**

`lib/auth.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SESSION_TTL_SECONDS, createSessionToken, passwordMatches, verifySessionToken } from "@/lib/auth";

const SECRET = "test-secret-please-ignore";
const NOW = 1_800_000_000_000;

describe("session tokens", () => {
  it("accepts a fresh token", async () => {
    const token = await createSessionToken(SECRET, NOW);
    expect(await verifySessionToken(token, SECRET, NOW + 1000)).toBe(true);
  });

  it("rejects an expired token", async () => {
    const token = await createSessionToken(SECRET, NOW);
    expect(await verifySessionToken(token, SECRET, NOW + SESSION_TTL_SECONDS * 1000 + 1)).toBe(false);
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken("other", NOW);
    expect(await verifySessionToken(token, SECRET, NOW)).toBe(false);
  });

  it("rejects a token whose expiry was edited", async () => {
    const [, sig] = (await createSessionToken(SECRET, NOW)).split(".");
    expect(await verifySessionToken(`9999999999.${sig}`, SECRET, NOW)).toBe(false);
  });

  it.each([undefined, "", "abc", "1.2.3", "x.y", ".", "123."])("rejects malformed %j", async (token) => {
    expect(await verifySessionToken(token, SECRET, NOW)).toBe(false);
  });

  it("rejects everything when the secret is missing", async () => {
    const token = await createSessionToken(SECRET, NOW);
    expect(await verifySessionToken(token, "", NOW)).toBe(false);
  });
});

describe("passwordMatches", () => {
  it("matches only the exact password", async () => {
    expect(await passwordMatches("hunter2", "hunter2", SECRET)).toBe(true);
    expect(await passwordMatches("hunter3", "hunter2", SECRET)).toBe(false);
    expect(await passwordMatches("", "hunter2", SECRET)).toBe(false);
  });
  it("never matches when no password is configured", async () => {
    expect(await passwordMatches("", "", SECRET)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/auth`.

- [ ] **Step 3: Implement**

`lib/auth.ts`:

```ts
export const SESSION_COOKIE = "wlsn_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(secret: string, nowMs = Date.now()): Promise<string> {
  const expiry = String(Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS);
  return `${expiry}.${await hmacHex(secret, expiry)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string, nowMs = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expiry, sig] = parts;
  if (!/^\d+$/.test(expiry) || !sig) return false;
  if (Number(expiry) * 1000 <= nowMs) return false;
  return safeEqual(sig, await hmacHex(secret, expiry));
}

// Comparing HMACs of both values keeps the comparison constant-length regardless of input length.
export async function passwordMatches(input: string, expected: string, secret: string): Promise<boolean> {
  if (!expected) return false;
  return safeEqual(await hmacHex(secret, input), await hmacHex(secret, expected));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts lib/auth.test.ts
git commit -m "Add signed admin session tokens"
```

---

### Task 6: Admin request validators

**Files:**
- Create: `lib/admin-validate.ts`, `lib/admin-validate.test.ts`

**Interfaces:**
- Consumes: `isSlug` (Task 2), `PhotoEntry` (Task 4).
- Produces:
  - `interface ShootRef { genre: string; event: string }`
  - `parseShootRef(body: unknown): ShootRef | null`
  - `parsePhotoEntries(value: unknown): PhotoEntry[] | null` — non-empty, ≤ 500 entries
  - `interface UploadRequestPhoto { id: string; originalExt: string; originalType: string }`
  - `parseUploadPhotos(value: unknown): UploadRequestPhoto[] | null` — non-empty, ≤ 50 entries

- [ ] **Step 1: Write the failing tests**

`lib/admin-validate.test.ts`:

```ts
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
    expect(parseUploadPhotos([{ id: "ott-1", originalExt: "jpg", originalType: "image/jpeg" }])).toEqual([
      { id: "ott-1", originalExt: "jpg", originalType: "image/jpeg" },
    ]);
  });
  it.each([
    [[]],
    [[{ id: "ott-1", originalExt: "../x", originalType: "image/jpeg" }]],
    [[{ id: "ott-1", originalExt: "JPG", originalType: "image/jpeg" }]],
    [[{ id: "ott-1", originalExt: "jpg", originalType: "not a type" }]],
    [[{ id: "../ott", originalExt: "jpg", originalType: "image/jpeg" }]],
    [Array.from({ length: 51 }, (_, i) => ({ id: `p${i}`, originalExt: "jpg", originalType: "image/jpeg" }))],
  ])("rejects %j", (value) => {
    expect(parseUploadPhotos(value)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/admin-validate`.

- [ ] **Step 3: Implement**

`lib/admin-validate.ts`:

```ts
import type { PhotoEntry } from "@/lib/manifest";
import { isSlug } from "@/lib/slug";

const MAX_DIMENSION = 100_000;
const MAX_ENTRIES_PER_COMMIT = 500;
const MAX_PHOTOS_PER_UPLOAD_REQUEST = 50;
const EXT_PATTERN = /^[a-z0-9]{1,5}$/;
const MIME_PATTERN = /^[\w.+-]+\/[\w.+-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDimension(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= MAX_DIMENSION;
}

export interface ShootRef {
  genre: string;
  event: string;
}

export function parseShootRef(body: unknown): ShootRef | null {
  if (!isRecord(body) || !isSlug(body.genre) || !isSlug(body.event)) return null;
  return { genre: body.genre, event: body.event };
}

function parsePhotoEntry(value: unknown): PhotoEntry | null {
  if (!isRecord(value) || !isSlug(value.id)) return null;
  const { width, height, hidden } = value;
  if (!isDimension(width) || !isDimension(height)) return null;
  if (hidden !== undefined && typeof hidden !== "boolean") return null;
  return hidden ? { id: value.id, width, height, hidden: true } : { id: value.id, width, height };
}

export function parsePhotoEntries(value: unknown): PhotoEntry[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ENTRIES_PER_COMMIT) return null;
  const parsed = value.map(parsePhotoEntry);
  return parsed.every((p): p is PhotoEntry => p !== null) ? parsed : null;
}

export interface UploadRequestPhoto {
  id: string;
  originalExt: string;
  originalType: string;
}

function parseUploadPhoto(value: unknown): UploadRequestPhoto | null {
  if (!isRecord(value) || !isSlug(value.id)) return null;
  const { originalExt, originalType } = value;
  if (typeof originalExt !== "string" || !EXT_PATTERN.test(originalExt)) return null;
  if (typeof originalType !== "string" || originalType.length > 100 || !MIME_PATTERN.test(originalType)) return null;
  return { id: value.id, originalExt, originalType };
}

export function parseUploadPhotos(value: unknown): UploadRequestPhoto[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_PHOTOS_PER_UPLOAD_REQUEST) return null;
  const parsed = value.map(parseUploadPhoto);
  return parsed.every((p): p is UploadRequestPhoto => p !== null) ? parsed : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/admin-validate.ts lib/admin-validate.test.ts
git commit -m "Add admin API request validators"
```

---

### Task 7: R2 client and env template

**Files:**
- Modify: `package.json` (dependencies `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- Create: `lib/r2.ts`
- Create: `.env.example`

**Interfaces:**
- Produces (`lib/r2.ts`, server-only by convention — never import from a `"use client"` file):
  - `publicBucket(): string`, `originalsBucket(): string`
  - `getJson<T>(key: string): Promise<T | null>` — reads from the public bucket; `null` if missing
  - `putJson(key: string, data: unknown): Promise<void>` — writes to the public bucket
  - `putObject(bucket: string, key: string, body: Uint8Array, contentType: string): Promise<void>`
  - `objectExists(bucket: string, key: string): Promise<boolean>`
  - `presignPut(bucket: string, key: string, contentType: string): Promise<string>` — 10-minute URL; the browser must send exactly that `Content-Type`
  - `deletePrefix(bucket: string, prefix: string): Promise<void>`

- [ ] **Step 1: Install the SDK**

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- [ ] **Step 2: Implement `lib/r2.ts`**

```ts
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UPLOAD_URL_TTL_SECONDS = 600;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const publicBucket = () => env("R2_PUBLIC_BUCKET");
export const originalsBucket = () => env("R2_ORIGINALS_BUCKET");

let client: S3Client | undefined;

function r2(): S3Client {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
    // Newer SDKs add CRC32 checksums to every upload by default, which R2 presigned
    // browser uploads can't satisfy; only send them when an operation requires it.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

function isNotFound(err: unknown): boolean {
  return (
    err instanceof S3ServiceException &&
    (err.name === "NoSuchKey" || err.name === "NotFound" || err.$metadata.httpStatusCode === 404)
  );
}

export async function getJson<T>(key: string): Promise<T | null> {
  try {
    const res = await r2().send(new GetObjectCommand({ Bucket: publicBucket(), Key: key }));
    const text = await res.Body?.transformToString();
    return text ? (JSON.parse(text) as T) : null;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function putJson(key: string, data: unknown): Promise<void> {
  await r2().send(
    new PutObjectCommand({
      Bucket: publicBucket(),
      Key: key,
      Body: JSON.stringify(data, null, 2),
      ContentType: "application/json",
      CacheControl: "no-store",
    })
  );
}

export async function putObject(bucket: string, key: string, body: Uint8Array, contentType: string): Promise<void> {
  await r2().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function objectExists(bucket: string, key: string): Promise<boolean> {
  try {
    await r2().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    if (isNotFound(err)) return false;
    throw err;
  }
}

export function presignPut(bucket: string, key: string, contentType: string): Promise<string> {
  return getSignedUrl(r2(), new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  });
}

export async function deletePrefix(bucket: string, prefix: string): Promise<void> {
  for (;;) {
    const page = await r2().send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
    const objects = (page.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
    if (objects.length === 0) return;
    const res = await r2().send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects } }));
    if (res.Errors?.length) throw new Error(`Could not delete ${res.Errors.length} objects under ${prefix}`);
  }
}
```

- [ ] **Step 3: Create `.env.example`**

```
# Copy to .env.local (never commit .env.local) and fill in. Same names go into Vercel → Settings → Environment Variables.
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BUCKET=wlsn-photos
R2_ORIGINALS_BUCKET=wlsn-originals
# The public bucket's r2.dev URL, no trailing slash, e.g. https://pub-xxxxxxxx.r2.dev
NEXT_PUBLIC_PHOTO_BASE_URL=
# Long random strings. Generate the secret with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: no errors; tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json lib/r2.ts .env.example
git commit -m "Add R2 client wrapper and env template"
```

---

### Task 7a: Drop originals, add the free-tier storage guard (amendment 2026-09-28)

Wilson must not pay for R2. This removes the private originals bucket and adds a 9 GB upload limit plus a usage helper for the admin meter. Spec §3 and §5a.

**Files:**
- Create: `lib/storage.ts`, `lib/storage.test.ts`
- Modify: `lib/admin-validate.ts`, `lib/admin-validate.test.ts` (upload photos become `{ id, bytes }`)
- Modify: `lib/photo-keys.ts`, `lib/photo-keys.test.ts` (remove `originalKey`)
- Modify: `lib/r2.ts` (remove `originalsBucket`, add `bucketUsageBytes`)
- Modify: `.env.example` (remove `R2_ORIGINALS_BUCKET`)

**Interfaces:**
- Produces:
  - `FREE_STORAGE_BYTES = 10_000_000_000`, `STORAGE_LIMIT_BYTES = 9_000_000_000`
  - `canStore(usedBytes: number, incomingBytes: number, limit?: number): boolean`
  - `formatGB(bytes: number): string` → e.g. `"2.53 GB"`
  - `interface UploadRequestPhoto { id: string; bytes: number }` (replaces the Task 6 shape); `parseUploadPhotos(value: unknown): UploadRequestPhoto[] | null` — `bytes` a positive integer ≤ 500 MB
  - `bucketUsageBytes(): Promise<number>` in `lib/r2.ts`
- Removes: `originalKey`, `originalsBucket`, `UploadRequestPhoto.originalExt/originalType`.

- [ ] **Step 1: Write the failing tests**

`lib/storage.test.ts`:

```ts
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
```

In `lib/admin-validate.test.ts`, replace the whole `describe("parseUploadPhotos", …)` block with:

```ts
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
```

In `lib/photo-keys.test.ts`, remove `originalKey` from the import, delete its assertion line, and rename that test to "builds photo and variant keys".

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `@/lib/storage` missing; `parseUploadPhotos` "accepts valid requests" fails (returns null for `{ id, bytes }`).

- [ ] **Step 3: Implement**

`lib/storage.ts`:

```ts
export const FREE_STORAGE_BYTES = 10_000_000_000;
// Uploads stop 1 GB short of R2's free 10 GB so a large batch can never tip the bill over.
export const STORAGE_LIMIT_BYTES = 9_000_000_000;

export function canStore(usedBytes: number, incomingBytes: number, limit = STORAGE_LIMIT_BYTES): boolean {
  return usedBytes + incomingBytes <= limit;
}

export function formatGB(bytes: number): string {
  return `${(bytes / 1e9).toFixed(2)} GB`;
}
```

In `lib/admin-validate.ts`, replace the `EXT_PATTERN`/`MIME_PATTERN` constants, the `UploadRequestPhoto` interface and `parseUploadPhoto` with:

```ts
const MAX_PHOTO_BYTES = 500_000_000;

export interface UploadRequestPhoto {
  id: string;
  bytes: number;
}

function parseUploadPhoto(value: unknown): UploadRequestPhoto | null {
  if (!isRecord(value) || !isSlug(value.id)) return null;
  const { bytes } = value;
  if (typeof bytes !== "number" || !Number.isInteger(bytes) || bytes <= 0 || bytes > MAX_PHOTO_BYTES) return null;
  return { id: value.id, bytes };
}
```

In `lib/photo-keys.ts`, delete `originalKey`.

In `lib/r2.ts`, delete `originalsBucket` and add:

```ts
export async function bucketUsageBytes(): Promise<number> {
  let total = 0;
  let token: string | undefined;
  do {
    const page = await r2().send(new ListObjectsV2Command({ Bucket: publicBucket(), ContinuationToken: token }));
    for (const object of page.Contents ?? []) total += object.Size ?? 0;
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return total;
}
```

In `.env.example`, delete the `R2_ORIGINALS_BUCKET=wlsn-originals` line.

- [ ] **Step 4: Run tests, type-check, lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all PASS, no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts lib/storage.test.ts lib/admin-validate.ts lib/admin-validate.test.ts lib/photo-keys.ts lib/photo-keys.test.ts lib/r2.ts .env.example
git commit -m "Drop stored originals and add a 9 GB free-tier upload guard"
```

---

### Task 8: Cloudflare setup (Wilson, in the dashboard)

Manual task. The agent writes out these instructions for Wilson, waits for him to confirm each part, and **never asks for key values in chat** — Wilson pastes them into `.env.local` himself.

**Files:**
- Create (by Wilson, never committed): `.env.local` in the worktree root, based on `.env.example`

- [ ] **Step 1: Create the bucket** — Cloudflare dashboard → R2 → *Create bucket* → `wlsn-photos`. Default location, **Standard** storage class (the free tier doesn't cover Infrequent Access).

- [ ] **Step 2: Make it public** — `wlsn-photos` → *Settings* → *Public Development URL* (r2.dev) → *Enable* → confirm. Copy the `https://pub-….r2.dev` URL into `NEXT_PUBLIC_PHOTO_BASE_URL`.

- [ ] **Step 3: Create an API token** — R2 overview → *Manage API tokens* → *Create API token* → permission **Object Read & Write**, *Apply to specific buckets only* → `wlsn-photos` → create. Copy *Access Key ID*, *Secret Access Key*, and the account ID (from the S3 endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`) into `.env.local`. The secret is shown once.

- [ ] **Step 4: Add CORS** — `wlsn-photos` → *Settings* → *CORS Policy* → *Add CORS policy* → JSON:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

(Vercel origins are added in Task 15.)

- [ ] **Step 5: Set admin secrets** — in `.env.local`, set `ADMIN_PASSWORD` (a long password Wilson will remember) and `ADMIN_SESSION_SECRET` (run the `node -e …` command from `.env.example`).

- [ ] **Step 6: Verify credentials without printing them**

Run:

```bash
node --env-file=.env.local -e "for (const k of ['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_PUBLIC_BUCKET','NEXT_PUBLIC_PHOTO_BASE_URL','ADMIN_PASSWORD','ADMIN_SESSION_SECRET']) console.log(k, process.env[k] ? 'set' : 'MISSING')"
```

Expected: every line says `set`. Confirm `git status` does not list `.env.local` (it's ignored by `.env*.local`).

---

### Task 9: Migration script

**Files:**
- Modify: `package.json` (devDependency `tsx`; script `migrate:r2`)
- Create: `scripts/migrate-to-r2.ts`

**Interfaces:**
- Consumes: `slugify`, `uniqueId` (Task 2); `mapLimit` (Task 2); `VARIANT_WIDTHS`, `JPEG_QUALITY`, `SITE_MANIFEST_KEY`, `eventManifestKey`, `photoKey`, `variantKey` (Task 3); `EventManifest`, `GenreEntry`, `PhotoEntry`, `SiteManifest` (Task 4); `bucketUsageBytes`, `objectExists`, `publicBucket`, `putJson`, `putObject` (Tasks 7/7a); `STORAGE_LIMIT_BYTES`, `formatGB` (Task 7a).
- Produces in R2: `_site.json`, every `_event.json`, all variants (no originals). Photo ids = `slugify(filename without extension)`, de-duplicated. `cover.*` files: if byte-identical to a gallery photo → that photo becomes the cover; otherwise uploaded as a hidden photo (id `cover`). Genre `cover.*` → `{ event, photo }` of the shoot whose cover file is byte-identical.

- [ ] **Step 1: Install tsx and add the script**

```bash
npm install -D tsx
npm pkg set scripts.migrate:r2="node --env-file=.env.local --import tsx scripts/migrate-to-r2.ts"
```

- [ ] **Step 2: Write `scripts/migrate-to-r2.ts`**

```ts
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
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Dry run**

Run: `npm run migrate:r2 -- --dry-run`
Expected: one line per shoot (12 shoots across `concerts`, `events`, `graduation`), a `_site.json` preview where `graduation` has `"cover": { "event": "kenneth-lea", "photo": "cover" }` (or a warning explaining why not), and `Dry run: ~562 photos …`. Nothing uploaded. Show Wilson the summary and wait for his go-ahead.

- [ ] **Step 5: Real run** (after Wilson's go-ahead)

Run: `npm run migrate:r2` (use `run_in_background` — this generates and uploads ~1.5 GB of variants and may take a while).
Expected: `Done: … photos, … MB uploaded` and `Bucket now uses ~1.5 GB`. If it fails midway, re-run the same command: it skips objects that already exist.

- [ ] **Step 6: Spot-check**

Run (reads the base URL from `.env.local`):

```bash
node --env-file=.env.local -e "const b=process.env.NEXT_PUBLIC_PHOTO_BASE_URL; Promise.all(['_site.json','concerts/off-the-track/_event.json','concerts/off-the-track/cover/w3840.jpg'].map(k=>fetch(b+'/'+k).then(r=>console.log(r.status,k))))"
```

Expected: `200` for all three. Wilson also eyeballs a couple of `w3840.jpg` URLs in the browser.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json scripts/migrate-to-r2.ts
git commit -m "Add one-time migration script from public/work to R2"
```

---

### Task 10: Public site reads from R2

**Files:**
- Modify: `next.config.mjs`
- Rewrite: `lib/works.ts`
- Modify: `app/page.tsx`, `app/work/[genre]/page.tsx`, `app/work/[genre]/[event]/page.tsx`, `components/Featured.tsx`

**Interfaces:**
- Consumes: `getJson` (Task 7); `SITE_MANIFEST_KEY`, `eventManifestKey`, `photoKey` (Task 3); `resolveEventCover`, `EventManifest`, `SiteManifest` (Task 4); `photoLoader` (Task 3, via `loaderFile`).
- Produces (`lib/works.ts`):
  - `interface WorkImage { src: string; alt: string; width: number; height: number }` — `src` is a photo key
  - `interface WorkEvent { slug; title; genreSlug; genreTitle: string; cover: string; images: WorkImage[] }` — `cover` is a photo key or `""`
  - `interface WorkGenre { slug; title; meta; cover: string; events: WorkEvent[] }`
  - `getGenres(): Promise<WorkGenre[]>`, `getGenre(slug): Promise<WorkGenre | undefined>`, `getEvent(genre, event): Promise<WorkEvent | undefined>`

- [ ] **Step 1: Point `next/image` at the custom loader**

`next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
  },
};

export default nextConfig;
```

- [ ] **Step 2: Rewrite `lib/works.ts`**

```ts
import { cache } from "react";
import { resolveEventCover, type EventManifest, type SiteManifest } from "@/lib/manifest";
import { SITE_MANIFEST_KEY, eventManifestKey, photoKey } from "@/lib/photo-keys";
import { getJson } from "@/lib/r2";

export interface WorkImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface WorkEvent {
  slug: string;
  title: string;
  genreSlug: string;
  genreTitle: string;
  cover: string;
  images: WorkImage[];
}

export interface WorkGenre {
  slug: string;
  title: string;
  meta: string;
  cover: string;
  events: WorkEvent[];
}

export const getGenres = cache(async (): Promise<WorkGenre[]> => {
  const site = await getJson<SiteManifest>(SITE_MANIFEST_KEY);
  if (!site) return [];

  return Promise.all(
    site.genres.map(async (genre) => {
      const loaded = await Promise.all(
        genre.events.map(async (slug): Promise<WorkEvent | null> => {
          const manifest = await getJson<EventManifest>(eventManifestKey(genre.slug, slug));
          if (!manifest) return null;
          const coverId = resolveEventCover(manifest);
          return {
            slug,
            title: manifest.title,
            genreSlug: genre.slug,
            genreTitle: genre.title,
            cover: coverId ? photoKey(genre.slug, slug, coverId) : "",
            images: manifest.photos
              .filter((p) => !p.hidden)
              .map((p) => ({
                src: photoKey(genre.slug, slug, p.id),
                alt: `${manifest.title} — ${p.id}`,
                width: p.width,
                height: p.height,
              })),
          };
        })
      );
      const events = loaded.filter((e): e is WorkEvent => e !== null);
      const cover = genre.cover ? photoKey(genre.slug, genre.cover.event, genre.cover.photo) : events[0]?.cover ?? "";
      return { slug: genre.slug, title: genre.title, meta: genre.meta, cover, events };
    })
  );
});

export async function getGenre(slug: string): Promise<WorkGenre | undefined> {
  return (await getGenres()).find((g) => g.slug === slug);
}

export async function getEvent(genreSlug: string, eventSlug: string): Promise<WorkEvent | undefined> {
  return (await getGenre(genreSlug))?.events.find((e) => e.slug === eventSlug);
}
```

- [ ] **Step 3: Make the pages async and revalidating**

`app/page.tsx` — add below the imports and change the component signature/first line:

```tsx
export const revalidate = 3600;

export default async function Home() {
  const genres = await getGenres();
```

`app/work/[genre]/page.tsx` — replace the three functions' headers (body markup unchanged):

```tsx
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getGenres()).map((g) => ({ genre: g.slug }));
}

export async function generateMetadata({ params }: { params: { genre: string } }) {
  const genre = await getGenre(params.genre);
  if (!genre) return {};
  return { title: `${genre.title} — WLSN` };
}

export default async function GenrePage({ params }: { params: { genre: string } }) {
  const genre = await getGenre(params.genre);
  if (!genre) notFound();
```

`app/work/[genre]/[event]/page.tsx`:

```tsx
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getGenres()).flatMap((g) => g.events.map((e) => ({ genre: g.slug, event: e.slug })));
}

export async function generateMetadata({ params }: { params: { genre: string; event: string } }) {
  const event = await getEvent(params.genre, params.event);
  if (!event) return {};
  return { title: `${event.title} — WLSN` };
}

export default async function EventPage({ params }: { params: { genre: string; event: string } }) {
  const event = await getEvent(params.genre, params.event);
  if (!event) notFound();

  const genreLabel = event.genreTitle;
```

(`genreLabel` previously capitalised the slug; now it uses the category's real title.)

- [ ] **Step 4: Point the hero at R2**

`components/Featured.tsx`: change `src="/work/concerts/off-the-track/cover.jpg"` to `src="concerts/off-the-track/cover"` and delete the `quality={90}` line (irrelevant with pre-built variants). Keep the 1800px box and its comment.

- [ ] **Step 5: Build**

Run: `npm run build` (reads `.env.local`)
Expected: succeeds; the route table lists the same 3 genres and 12 shoots as before.

- [ ] **Step 6: Browser check**

Start the dev server (`preview_start` with a `.claude/launch.json` entry for `npm run dev`, port 3000). Check: `/` (hero + work list hover covers), `/work/concerts`, `/work/graduation` (cover = kenneth-lea's), `/work/concerts/off-the-track`, `/work/graduation/wei-juin`. In the network panel, every image request goes to `pub-….r2.dev/…/w*.jpg` and none to `/_next/image`. Check at a phone-width viewport too.

- [ ] **Step 7: Commit**

```bash
git add next.config.mjs lib/works.ts app/page.tsx "app/work/[genre]/page.tsx" "app/work/[genre]/[event]/page.tsx" components/Featured.tsx
git commit -m "Serve the portfolio from R2 manifests and pre-sized variants"
```

---

### Task 11: Admin login

**Files:**
- Create: `middleware.ts`
- Create: `lib/admin-api.ts`
- Create: `app/api/admin/login/route.ts`, `app/api/admin/logout/route.ts`
- Create: `app/admin/layout.tsx`, `app/admin/login/page.tsx`, `components/admin/LogoutButton.tsx`
- Create (temporary, replaced in Task 14): `app/admin/page.tsx`

**Interfaces:**
- Consumes: `SESSION_COOKIE`, `SESSION_TTL_SECONDS`, `createSessionToken`, `verifySessionToken`, `passwordMatches` (Task 5).
- Produces (`lib/admin-api.ts`, used by every admin route in Task 12):
  - `requireAdmin(): Promise<NextResponse | null>` — `null` when logged in, else a 401 response to return
  - `jsonError(message: string, status?: number): NextResponse`
  - `readBody(req: Request): Promise<unknown>` — parsed JSON or `null`
  - `revalidateSite(): void`

- [ ] **Step 1: `lib/admin-api.ts`**

```ts
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function requireAdmin(): Promise<NextResponse | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const ok = await verifySessionToken(token, process.env.ADMIN_SESSION_SECRET ?? "");
  return ok ? null : NextResponse.json({ error: "Not logged in" }, { status: 401 });
}

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function readBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function revalidateSite(): void {
  revalidatePath("/", "layout");
}
```

- [ ] **Step 2: `middleware.ts`** (repo root)

```ts
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/admin/login", "/api/admin/login"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value, process.env.ADMIN_SESSION_SECRET ?? "");
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
```

- [ ] **Step 3: Login and logout routes**

`app/api/admin/login/route.ts`:

```ts
import { NextResponse } from "next/server";
import { readBody } from "@/lib/admin-api";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken, passwordMatches } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FAILED_LOGIN_DELAY_MS = 1000;

export async function POST(req: Request) {
  const body = await readBody(req);
  const password =
    typeof body === "object" && body !== null && "password" in body && typeof body.password === "string"
      ? body.password
      : "";
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!secret || !expected) return NextResponse.json({ error: "Admin is not configured" }, { status: 500 });

  if (!(await passwordMatches(password, expected, secret))) {
    await new Promise((r) => setTimeout(r, FAILED_LOGIN_DELAY_MS));
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
```

`app/api/admin/logout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
```

- [ ] **Step 4: Admin layout, login page, logout button, placeholder overview**

`app/admin/layout.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — WLSN",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-paper px-6 py-10 text-ink md:px-12">{children}</div>;
}
```

`app/admin/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Login failed");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-24 flex max-w-sm flex-col gap-4">
      <h1 className="font-display text-3xl font-bold uppercase">Admin</h1>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="focus-ring border border-line bg-paper px-3 py-2"
          required
        />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="focus-ring bg-ink px-5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-paper disabled:opacity-50"
      >
        {busy ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
```

`components/admin/LogoutButton.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.replace("/admin/login");
        router.refresh();
      }}
      className="focus-ring font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60 hover:text-ink"
    >
      Log out
    </button>
  );
}
```

`app/admin/page.tsx` (temporary):

```tsx
import LogoutButton from "@/components/admin/LogoutButton";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <div className="mx-auto flex max-w-5xl items-center justify-between">
      <h1 className="font-display text-3xl font-bold uppercase">Admin</h1>
      <LogoutButton />
    </div>
  );
}
```

- [ ] **Step 5: Build and lint**

Run: `npm run build && npm run lint`
Expected: succeeds; `ƒ Middleware` appears in the build output.

- [ ] **Step 6: Browser check**

With the dev server: `/admin` redirects to `/admin/login`; a wrong password shows "Wrong password" after ~1 s; the right one lands on `/admin`; reloading keeps you logged in; **Log out** returns to login and `/admin` redirects again. In the browser console: `await fetch('/api/admin/genres', {method:'POST'}).then(r => r.status)` while logged out → `401`. The public pages still work (middleware only matches admin paths).

- [ ] **Step 7: Commit**

```bash
git add middleware.ts lib/admin-api.ts app/api/admin/login app/api/admin/logout app/admin components/admin/LogoutButton.tsx
git commit -m "Add password-protected admin login"
```

---

### Task 12: Admin API routes

**Files:**
- Create: `app/api/admin/genres/route.ts` (POST)
- Create: `app/api/admin/uploads/route.ts` (POST)
- Create: `app/api/admin/photos/route.ts` (POST, DELETE)
- Create: `app/api/admin/cover/route.ts` (PATCH)
- Create: `app/api/admin/events/route.ts` (GET, DELETE)

**Interfaces:**
- Consumes: Task 11 helpers; Task 6 validators; Task 4 manifest functions; Task 3 key helpers; Task 7 R2 functions.
- Produces (HTTP, all JSON, all 401 without a session, errors as `{ error: string }`):
  - `POST /api/admin/genres` `{ title, meta }` → `{ slug }` (409 duplicate)
  - `POST /api/admin/uploads` `{ genre, event, photos: [{ id, bytes }] }` → `{ photos: [{ id, variants: [{ width, url }] }] }`; 507 when it would pass the 9 GB limit
  - `POST /api/admin/photos` `{ genre, event, title, coverId: string | null, photos: PhotoEntry[] }` → `{ committed: string[], missing: string[] }` (404 unknown category)
  - `DELETE /api/admin/photos` `{ genre, event, id }` → `{ ok: true }`
  - `PATCH /api/admin/cover` `{ genre, event, id }` → `{ ok: true }`
  - `GET /api/admin/events?genre=&event=` → `{ manifest: EventManifest | null }`
  - `DELETE /api/admin/events` `{ genre, event }` → `{ ok: true }`

- [ ] **Step 1: `app/api/admin/genres/route.ts`**

```ts
import { NextResponse } from "next/server";
import { jsonError, readBody, requireAdmin, revalidateSite } from "@/lib/admin-api";
import { ManifestError, addGenre, emptySite, type SiteManifest } from "@/lib/manifest";
import { SITE_MANIFEST_KEY } from "@/lib/photo-keys";
import { getJson, putJson } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { title, meta } = ((await readBody(req)) ?? {}) as { title?: unknown; meta?: unknown };
  if (typeof title !== "string" || !title.trim()) return jsonError("Name is required");

  const site = (await getJson<SiteManifest>(SITE_MANIFEST_KEY)) ?? emptySite();
  try {
    const result = addGenre(site, title, typeof meta === "string" ? meta : "");
    await putJson(SITE_MANIFEST_KEY, result.site);
    revalidateSite();
    return NextResponse.json({ slug: result.slug });
  } catch (err) {
    if (err instanceof ManifestError) return jsonError(err.message, 409);
    throw err;
  }
}
```

- [ ] **Step 2: `app/api/admin/uploads/route.ts`**

```ts
import { NextResponse } from "next/server";
import { jsonError, readBody, requireAdmin } from "@/lib/admin-api";
import { parseShootRef, parseUploadPhotos } from "@/lib/admin-validate";
import { VARIANT_WIDTHS, photoKey, variantKey } from "@/lib/photo-keys";
import { bucketUsageBytes, presignPut, publicBucket } from "@/lib/r2";
import { STORAGE_LIMIT_BYTES, canStore, formatGB } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readBody(req);
  const ref = parseShootRef(body);
  const photos = parseUploadPhotos((body as { photos?: unknown } | null)?.photos);
  if (!ref || !photos) return jsonError("Invalid upload request");

  const used = await bucketUsageBytes();
  const incoming = photos.reduce((sum, p) => sum + p.bytes, 0);
  if (!canStore(used, incoming)) {
    return jsonError(
      `Storage limit reached: ${formatGB(used)} used, uploads stop at ${formatGB(STORAGE_LIMIT_BYTES)} to stay free. Delete photos to make room.`,
      507
    );
  }

  const signed = await Promise.all(
    photos.map(async (p) => {
      const key = photoKey(ref.genre, ref.event, p.id);
      const variants = await Promise.all(
        VARIANT_WIDTHS.map(async (width) => ({
          width,
          url: await presignPut(publicBucket(), variantKey(key, width), "image/jpeg"),
        }))
      );
      return { id: p.id, variants };
    })
  );
  return NextResponse.json({ photos: signed });
}
```

- [ ] **Step 3: `app/api/admin/photos/route.ts`**

```ts
import { NextResponse } from "next/server";
import { jsonError, readBody, requireAdmin, revalidateSite } from "@/lib/admin-api";
import { parsePhotoEntries, parseShootRef } from "@/lib/admin-validate";
import {
  addEventToGenre,
  addPhotos,
  clearGenreCoverIfPhoto,
  emptyEvent,
  removePhoto,
  type EventManifest,
  type SiteManifest,
} from "@/lib/manifest";
import { SITE_MANIFEST_KEY, VARIANT_WIDTHS, eventManifestKey, photoKey, photoPrefix, variantKey } from "@/lib/photo-keys";
import { deletePrefix, getJson, objectExists, publicBucket, putJson } from "@/lib/r2";
import { isSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readBody(req);
  const ref = parseShootRef(body);
  const fields = (body ?? {}) as { title?: unknown; coverId?: unknown; photos?: unknown };
  const photos = parsePhotoEntries(fields.photos);
  if (!ref || !photos) return jsonError("Invalid photos");

  const site = await getJson<SiteManifest>(SITE_MANIFEST_KEY);
  if (!site?.genres.some((g) => g.slug === ref.genre)) return jsonError("Unknown category", 404);

  const complete = await Promise.all(
    photos.map(async (p) => {
      const key = photoKey(ref.genre, ref.event, p.id);
      const present = await Promise.all(VARIANT_WIDTHS.map((w) => objectExists(publicBucket(), variantKey(key, w))));
      return present.every(Boolean);
    })
  );
  const committed = photos.filter((_, i) => complete[i]);
  const missing = photos.filter((_, i) => !complete[i]).map((p) => p.id);

  if (committed.length > 0) {
    const key = eventManifestKey(ref.genre, ref.event);
    const title = typeof fields.title === "string" && fields.title.trim() ? fields.title.trim() : ref.event;
    const requestedCover = typeof fields.coverId === "string" ? fields.coverId : undefined;
    const coverId = committed.some((p) => p.id === requestedCover) ? requestedCover : undefined;
    const current = (await getJson<EventManifest>(key)) ?? emptyEvent(title);
    // Write the shoot before listing it, so the site never points at a shoot with no manifest.
    await putJson(key, addPhotos(current, committed, coverId));
    await putJson(SITE_MANIFEST_KEY, addEventToGenre(site, ref.genre, ref.event));
    revalidateSite();
  }

  return NextResponse.json({ committed: committed.map((p) => p.id), missing });
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readBody(req);
  const ref = parseShootRef(body);
  const id = (body as { id?: unknown } | null)?.id;
  if (!ref || !isSlug(id)) return jsonError("Invalid photo");

  const key = eventManifestKey(ref.genre, ref.event);
  const current = await getJson<EventManifest>(key);
  if (!current) return jsonError("Unknown shoot", 404);

  // Remove from the manifest first so the photo disappears from the site before its files go.
  await putJson(key, removePhoto(current, id));
  const site = await getJson<SiteManifest>(SITE_MANIFEST_KEY);
  if (site) {
    const next = clearGenreCoverIfPhoto(site, ref.genre, ref.event, id);
    if (next !== site) await putJson(SITE_MANIFEST_KEY, next);
  }
  revalidateSite();

  await deletePrefix(publicBucket(), photoPrefix(photoKey(ref.genre, ref.event, id)));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: `app/api/admin/cover/route.ts`**

```ts
import { NextResponse } from "next/server";
import { jsonError, readBody, requireAdmin, revalidateSite } from "@/lib/admin-api";
import { parseShootRef } from "@/lib/admin-validate";
import { ManifestError, setCover, type EventManifest } from "@/lib/manifest";
import { eventManifestKey } from "@/lib/photo-keys";
import { getJson, putJson } from "@/lib/r2";
import { isSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readBody(req);
  const ref = parseShootRef(body);
  const id = (body as { id?: unknown } | null)?.id;
  if (!ref || !isSlug(id)) return jsonError("Invalid photo");

  const key = eventManifestKey(ref.genre, ref.event);
  const current = await getJson<EventManifest>(key);
  if (!current) return jsonError("Unknown shoot", 404);
  try {
    await putJson(key, setCover(current, id));
  } catch (err) {
    if (err instanceof ManifestError) return jsonError(err.message, 404);
    throw err;
  }
  revalidateSite();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: `app/api/admin/events/route.ts`**

```ts
import { NextResponse } from "next/server";
import { jsonError, readBody, requireAdmin, revalidateSite } from "@/lib/admin-api";
import { parseShootRef } from "@/lib/admin-validate";
import { removeEventFromGenre, type EventManifest, type SiteManifest } from "@/lib/manifest";
import { SITE_MANIFEST_KEY, eventManifestKey, eventPrefix } from "@/lib/photo-keys";
import { deletePrefix, getJson, publicBucket, putJson } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const url = new URL(req.url);
  const ref = parseShootRef({ genre: url.searchParams.get("genre"), event: url.searchParams.get("event") });
  if (!ref) return jsonError("Invalid shoot");
  const manifest = await getJson<EventManifest>(eventManifestKey(ref.genre, ref.event));
  return NextResponse.json({ manifest });
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const ref = parseShootRef(await readBody(req));
  if (!ref) return jsonError("Invalid shoot");

  const site = await getJson<SiteManifest>(SITE_MANIFEST_KEY);
  if (!site?.genres.some((g) => g.slug === ref.genre)) return jsonError("Unknown category", 404);

  await putJson(SITE_MANIFEST_KEY, removeEventFromGenre(site, ref.genre, ref.event));
  revalidateSite();

  await deletePrefix(publicBucket(), eventPrefix(ref.genre, ref.event));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Build and lint**

Run: `npm run build && npm run lint && npm test`
Expected: all pass.

- [ ] **Step 7: API smoke test** (logged in, in the dev-server browser console on `/admin`)

```js
const j = (m, u, b) => fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b && JSON.stringify(b) }).then(async r => [r.status, await r.json()]);
await j("POST", "/api/admin/genres", { title: "Zz Test", meta: "" });            // [200, {slug:"zz-test"}]
await j("POST", "/api/admin/genres", { title: "Zz Test", meta: "" });            // [409, …]
await j("GET", "/api/admin/events?genre=concerts&event=off-the-track");          // [200, {manifest:{…}}]
await j("POST", "/api/admin/uploads", { genre: "../x", event: "a", photos: [] }); // [400, …]
await j("POST", "/api/admin/photos", { genre: "zz-test", event: "a", title: "A", coverId: null, photos: [{ id: "nope", width: 1, height: 1 }] }); // [200, {committed:[], missing:["nope"]}]
```

Keep the **Zz Test** category: Task 14's browser check uploads into it and removes it at the end (Task 14, Step 7.9).

- [ ] **Step 8: Commit**

```bash
git add app/api/admin
git commit -m "Add admin API for categories, uploads, photos, covers and shoots"
```

---

### Task 13: Browser upload pipeline

**Files:**
- Modify: `package.json` (dependency `pica`)
- Create: `lib/upload/collect-files.ts`, `lib/upload/collect-files.test.ts`
- Create: `lib/upload/process-photo.ts`
- Create: `lib/upload/upload-shoot.ts`

**Interfaces:**
- Consumes: `slugify`, `uniqueId`, `mapLimit` (Task 2); `VARIANT_WIDTHS`, `JPEG_QUALITY` (Task 3); `PhotoEntry` (Task 4); HTTP API (Task 12).
- Produces:
  - `ACCEPTED_FILE: RegExp`
  - `interface PathedFile<T> { path: string; file: T }`, `interface FileGroup<T> { name: string; files: T[] }`
  - `groupFiles<T>(items: PathedFile<T>[], mode: "by-folder" | "single"): { groups: FileGroup<T>[]; skipped: string[] }`
  - `filesFromDataTransfer(dt: DataTransfer): Promise<PathedFile<File>[]>` — call synchronously at the start of the drop handler
  - `filesFromInput(list: FileList): PathedFile<File>[]`
  - `processPhoto(file: File): Promise<{ width: number; height: number; variants: { width: number; blob: Blob }[] }>`
  - `interface ShootJob { genre: string; event: string; title: string; files: File[] }`
  - `type FileState = "processing" | "uploading" | "done" | "failed"`, `interface FileStatus { state: FileState; error?: string }`
  - `uploadShoot(job: ShootJob, onStatus: (file: File, status: FileStatus) => void): Promise<void>` — reports every file's final state as `done` or `failed` via `onStatus`; throws only if the shoot can't be started at all

- [ ] **Step 1: Install pica**

```bash
npm install pica
```

- [ ] **Step 2: Write the failing grouping tests**

`lib/upload/collect-files.test.ts`:

```ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/upload/collect-files`.

- [ ] **Step 4: Implement `lib/upload/collect-files.ts`**

```ts
export const ACCEPTED_FILE = /\.(jpe?g|png|webp|gif|heic|heif)$/i;

export interface PathedFile<T> {
  path: string;
  file: T;
}

export interface FileGroup<T> {
  name: string;
  files: T[];
}

const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

export function groupFiles<T>(
  items: PathedFile<T>[],
  mode: "by-folder" | "single"
): { groups: FileGroup<T>[]; skipped: string[] } {
  const skipped: string[] = [];
  const byName = new Map<string, PathedFile<T>[]>();

  for (const item of items) {
    const parts = item.path.split("/").filter(Boolean);
    const fileName = parts[parts.length - 1] ?? "";
    if (fileName.startsWith(".") || !ACCEPTED_FILE.test(fileName)) {
      skipped.push(item.path);
      continue;
    }
    const name = mode === "by-folder" && parts.length > 1 ? parts[0] : "";
    byName.set(name, [...(byName.get(name) ?? []), item]);
  }

  const groups = [...byName.entries()]
    .sort(([a], [b]) => natural(a, b))
    .map(([name, files]) => ({ name, files: files.sort((a, b) => natural(a.path, b.path)).map((f) => f.file) }));
  return { groups, skipped: skipped.sort(natural) };
}

export async function filesFromDataTransfer(dt: DataTransfer): Promise<PathedFile<File>[]> {
  // Entries must be read before the first await: the browser empties the DataTransfer once the drop handler yields.
  const entries = Array.from(dt.items)
    .map((item) => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => entry !== null);
  const out: PathedFile<File>[] = [];
  await Promise.all(entries.map((entry) => walk(entry, "", out)));
  return out;
}

async function walk(entry: FileSystemEntry, parent: string, out: PathedFile<File>[]): Promise<void> {
  const path = parent ? `${parent}/${entry.name}` : entry.name;
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
    out.push({ path, file });
    return;
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // readEntries returns results in batches (about 100 in Chrome); keep reading until it returns none.
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
      if (batch.length === 0) break;
      await Promise.all(batch.map((child) => walk(child, path, out)));
    }
  }
}

export function filesFromInput(list: FileList): PathedFile<File>[] {
  return Array.from(list, (file) => ({ path: file.webkitRelativePath || file.name, file }));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Implement `lib/upload/process-photo.ts`**

```ts
import pica from "pica";
import { JPEG_QUALITY, VARIANT_WIDTHS } from "@/lib/photo-keys";

export interface ProcessedPhoto {
  width: number;
  height: number;
  variants: { width: number; blob: Blob }[];
}

let resizer: ReturnType<typeof pica> | undefined;

export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  resizer ??= pica();

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      /\.hei[cf]$/i.test(file.name) ? "HEIC photos only open in Safari — export as JPG" : "This browser can't read this file"
    );
  }

  try {
    const { width, height } = bitmap;
    const byTarget = new Map<number, Blob>();
    const variants: ProcessedPhoto["variants"] = [];
    for (const w of VARIANT_WIDTHS) {
      const target = Math.min(w, width);
      let blob = byTarget.get(target);
      if (!blob) {
        const canvas = document.createElement("canvas");
        canvas.width = target;
        canvas.height = Math.max(1, Math.round((height * target) / width));
        await resizer.resize(bitmap, canvas, { filter: "lanczos3" });
        blob = await resizer.toBlob(canvas, "image/jpeg", JPEG_QUALITY);
        // Zeroing the size frees the canvas memory immediately — iOS Safari caps total canvas memory.
        canvas.width = 0;
        canvas.height = 0;
        byTarget.set(target, blob);
      }
      variants.push({ width: w, blob });
    }
    return { width, height, variants };
  } finally {
    bitmap.close();
  }
}
```

- [ ] **Step 7: Implement `lib/upload/upload-shoot.ts`**

```ts
import type { PhotoEntry } from "@/lib/manifest";
import { mapLimit } from "@/lib/pool";
import { slugify, uniqueId } from "@/lib/slug";
import { processPhoto } from "@/lib/upload/process-photo";

export interface ShootJob {
  genre: string;
  event: string;
  title: string;
  files: File[];
}

export type FileState = "processing" | "uploading" | "done" | "failed";

export interface FileStatus {
  state: FileState;
  error?: string;
}

interface SignedPhoto {
  id: string;
  variants: { width: number; url: string }[];
}

const COVER_FILE = /^cover\.[a-z0-9]+$/i;

const baseName = (name: string) => name.replace(/\.[^.]+$/, "");
const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err));

async function sendJson<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

async function put(url: string, body: Blob, contentType: string): Promise<void> {
  const res = await fetch(url, { method: "PUT", body, headers: { "Content-Type": contentType } });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
}

export async function uploadShoot(job: ShootJob, onStatus: (file: File, status: FileStatus) => void): Promise<void> {
  const query = `genre=${encodeURIComponent(job.genre)}&event=${encodeURIComponent(job.event)}`;
  const { manifest } = await sendJson<{ manifest: { photos: { id: string }[] } | null }>("GET", `/api/admin/events?${query}`);
  const taken = new Set(manifest?.photos.map((p) => p.id) ?? []);
  const planned = job.files.map((file) => {
    const id = uniqueId(slugify(baseName(file.name)), taken);
    taken.add(id);
    return { file, id, isCover: COVER_FILE.test(file.name) };
  });

  // Phones get one photo at a time: two decoded 24-megapixel photos can exhaust mobile browser memory.
  const concurrency = navigator.maxTouchPoints > 0 ? 1 : 2;
  const results = await mapLimit(planned, concurrency, async ({ file, id, isCover }) => {
    try {
      onStatus(file, { state: "processing" });
      const processed = await processPhoto(file);
      onStatus(file, { state: "uploading" });
      const bytes = processed.variants.reduce((sum, v) => sum + v.blob.size, 0);
      const {
        photos: [signed],
      } = await sendJson<{ photos: SignedPhoto[] }>("POST", "/api/admin/uploads", {
        genre: job.genre,
        event: job.event,
        photos: [{ id, bytes }],
      });
      await Promise.all(
        signed.variants.map((v) => {
          const blob = processed.variants.find((p) => p.width === v.width)?.blob;
          if (!blob) throw new Error(`Missing ${v.width}px version`);
          return put(v.url, blob, "image/jpeg");
        })
      );
      const entry: PhotoEntry = isCover
        ? { id, width: processed.width, height: processed.height, hidden: true }
        : { id, width: processed.width, height: processed.height };
      return { file, entry, isCover };
    } catch (err) {
      onStatus(file, { state: "failed", error: messageOf(err) });
      return null;
    }
  });

  const uploaded = results.filter((r): r is NonNullable<typeof r> => r !== null);
  if (uploaded.length === 0) return;

  try {
    const { missing } = await sendJson<{ committed: string[]; missing: string[] }>("POST", "/api/admin/photos", {
      genre: job.genre,
      event: job.event,
      title: job.title,
      coverId: uploaded.find((r) => r.isCover)?.entry.id ?? null,
      photos: uploaded.map((r) => r.entry),
    });
    const missingIds = new Set(missing);
    for (const r of uploaded) {
      onStatus(
        r.file,
        missingIds.has(r.entry.id) ? { state: "failed", error: "Upload didn't arrive in storage" } : { state: "done" }
      );
    }
  } catch (err) {
    for (const r of uploaded) onStatus(r.file, { state: "failed", error: messageOf(err) });
  }
}
```

- [ ] **Step 8: Type-check, lint, test**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: no errors; all tests PASS. (The pipeline itself is exercised in the browser in Task 14.)

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json lib/upload
git commit -m "Add browser-side folder collection, resizing and upload pipeline"
```

---

### Task 14: Admin UI

**Files:**
- Create: `lib/admin-data.ts`
- Create: `components/admin/NewGenreForm.tsx`, `components/admin/UploadDrop.tsx`, `components/admin/ShootEditor.tsx`
- Replace: `app/admin/page.tsx`
- Create: `app/admin/[genre]/[event]/page.tsx`

**Interfaces:**
- Consumes: Tasks 3, 4, 7, 7a, 11, 12, 13.
- Produces (`lib/admin-data.ts`, server-only):
  - `interface AdminShoot { slug: string; title: string; photoCount: number; coverKey: string | null }`
  - `interface AdminGenre { slug: string; title: string; meta: string; shoots: AdminShoot[] }`
  - `loadAdminOverview(): Promise<AdminGenre[]>`
  - `loadShoot(genre: string, event: string): Promise<EventManifest | null>`
  - `loadStorageUsage(): Promise<number>` — bytes used in the bucket (for the meter)

- [ ] **Step 1: `lib/admin-data.ts`**

```ts
import { resolveEventCover, type EventManifest, type SiteManifest } from "@/lib/manifest";
import { SITE_MANIFEST_KEY, eventManifestKey, photoKey } from "@/lib/photo-keys";
import { bucketUsageBytes, getJson } from "@/lib/r2";

export interface AdminShoot {
  slug: string;
  title: string;
  photoCount: number;
  coverKey: string | null;
}

export interface AdminGenre {
  slug: string;
  title: string;
  meta: string;
  shoots: AdminShoot[];
}

export function loadShoot(genre: string, event: string): Promise<EventManifest | null> {
  return getJson<EventManifest>(eventManifestKey(genre, event));
}

export function loadStorageUsage(): Promise<number> {
  return bucketUsageBytes();
}

export async function loadAdminOverview(): Promise<AdminGenre[]> {
  const site = await getJson<SiteManifest>(SITE_MANIFEST_KEY);
  if (!site) return [];
  return Promise.all(
    site.genres.map(async (g) => ({
      slug: g.slug,
      title: g.title,
      meta: g.meta,
      shoots: await Promise.all(
        g.events.map(async (slug) => {
          const manifest = await loadShoot(g.slug, slug);
          const cover = manifest ? resolveEventCover(manifest) : null;
          return {
            slug,
            title: manifest?.title ?? slug,
            photoCount: manifest?.photos.filter((p) => !p.hidden).length ?? 0,
            coverKey: cover ? photoKey(g.slug, slug, cover) : null,
          };
        })
      ),
    }))
  );
}
```

- [ ] **Step 2: `components/admin/NewGenreForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewGenreForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [meta, setMeta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/genres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, meta }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not create category");
      return;
    }
    setTitle("");
    setMeta("");
    router.refresh();
  }

  const input = "focus-ring border border-line bg-paper px-3 py-2";
  const label = "font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50";

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className={label}>New category</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weddings" className={input} required />
      </label>
      <label className="flex flex-col gap-1">
        <span className={label}>Short label (optional)</span>
        <input value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="Wedding" className={input} />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="focus-ring bg-ink px-5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-paper disabled:opacity-50"
      >
        + Add
      </button>
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 3: `components/admin/UploadDrop.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slug";
import { filesFromDataTransfer, filesFromInput, groupFiles, type PathedFile } from "@/lib/upload/collect-files";
import { uploadShoot, type FileStatus } from "@/lib/upload/upload-shoot";

interface UploadDropProps {
  genre: string;
  target?: { event: string; title: string };
}

interface PendingShoot {
  title: string;
  files: File[];
}

type Phase = "idle" | "review" | "uploading" | "finished";

const button = "focus-ring border border-ink px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em]";

export default function UploadDrop({ genre, target }: UploadDropProps) {
  const router = useRouter();
  const folderInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [shoots, setShoots] = useState<PendingShoot[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<Map<File, FileStatus>>(new Map());
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    folderInput.current?.setAttribute("webkitdirectory", "");
  }, []);

  function accept(items: PathedFile<File>[]) {
    const result = groupFiles(items, target ? "single" : "by-folder");
    setShoots(result.groups.map((g) => ({ title: target?.title ?? g.name, files: g.files })));
    setSkipped(result.skipped);
    setStatuses(new Map());
    setError(result.groups.length ? null : "No photos found in what you dropped.");
    setPhase(result.groups.length ? "review" : "idle");
  }

  function setStatus(file: File, status: FileStatus) {
    setStatuses((prev) => new Map(prev).set(file, status));
  }

  async function run(list: PendingShoot[]) {
    if (list.some((s) => !slugify(s.title))) {
      setError("Every shoot needs a name with at least one letter or number.");
      return;
    }
    setPhase("uploading");
    setError(null);
    for (const shoot of list) {
      try {
        await uploadShoot(
          { genre, event: target?.event ?? slugify(shoot.title), title: shoot.title.trim(), files: shoot.files },
          setStatus
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        for (const file of shoot.files) setStatus(file, { state: "failed", error: message });
      }
    }
    setPhase("finished");
    router.refresh();
  }

  function retryFailed() {
    const failed = shoots
      .map((s) => ({ ...s, files: s.files.filter((f) => statuses.get(f)?.state === "failed") }))
      .filter((s) => s.files.length > 0);
    run(failed);
  }

  function reset() {
    setShoots([]);
    setSkipped([]);
    setStatuses(new Map());
    setError(null);
    setPhase("idle");
  }

  const failedCount = [...statuses.values()].filter((s) => s.state === "failed").length;
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) accept(filesFromInput(e.target.files));
    e.target.value = "";
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (phase === "uploading") return;
          filesFromDataTransfer(e.dataTransfer).then(accept, (err) => setError(String(err)));
        }}
        className={`border border-dashed px-6 py-8 text-center transition-colors ${
          dragging ? "border-olive bg-olive/10" : "border-line"
        }`}
      >
        <p className="font-body text-sm text-ink/70">
          {target
            ? "Drop photos or a folder here to add them to this shoot"
            : "Drop shoot folders here — each folder becomes a shoot"}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <label className={`${button} cursor-pointer`}>
            Choose folder
            <input ref={folderInput} type="file" multiple className="sr-only" onChange={onPick} />
          </label>
          <label className={`${button} cursor-pointer`}>
            Choose photos
            <input type="file" multiple accept="image/*,.heic,.heif" className="sr-only" onChange={onPick} />
          </label>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {skipped.length > 0 && (
        <details className="mt-3 text-sm text-ink/60">
          <summary className="cursor-pointer">{skipped.length} files skipped (not photos)</summary>
          <ul className="mt-2 font-mono text-[11px]">
            {skipped.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </details>
      )}

      {phase !== "idle" && (
        <div className="mt-6 space-y-6">
          {shoots.map((shoot, i) => (
            <div key={i} className="border border-line p-4">
              {target ? (
                <p className="font-display font-bold uppercase">{shoot.title}</p>
              ) : (
                <label className="block">
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">Shoot name</span>
                  <input
                    value={shoot.title}
                    disabled={phase !== "review"}
                    onChange={(e) =>
                      setShoots((prev) => prev.map((s, j) => (j === i ? { ...s, title: e.target.value } : s)))
                    }
                    className="focus-ring mt-1 w-full border border-line bg-paper px-3 py-2"
                  />
                  <span className="mt-1 block font-mono text-[11px] text-ink/40">
                    /work/{genre}/{slugify(shoot.title) || "…"}
                  </span>
                </label>
              )}
              <ul className="mt-3 grid gap-1 font-mono text-[11px]">
                {shoot.files.map((file, j) => {
                  const s = statuses.get(file);
                  const tone = s?.state === "failed" ? "text-red-700" : s?.state === "done" ? "text-olive" : "text-ink/60";
                  return (
                    <li key={j} className={tone}>
                      {file.name} — {s?.state ?? "ready"}
                      {s?.error ? `: ${s.error}` : ""}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div className="flex flex-wrap gap-3">
            {phase === "review" && (
              <button type="button" onClick={() => run(shoots)} className={`${button} bg-ink text-paper`}>
                Upload
              </button>
            )}
            {phase === "uploading" && <p className="font-mono text-[11px] uppercase tracking-[0.16em]">Uploading…</p>}
            {phase === "finished" && failedCount > 0 && (
              <button type="button" onClick={retryFailed} className={`${button} bg-ink text-paper`}>
                Retry {failedCount} failed
              </button>
            )}
            {phase !== "uploading" && (
              <button type="button" onClick={reset} className={button}>
                {phase === "finished" ? "Done" : "Cancel"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `components/admin/ShootEditor.tsx`**

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { resolveEventCover, type EventManifest } from "@/lib/manifest";
import { photoKey } from "@/lib/photo-keys";

interface ShootEditorProps {
  genre: string;
  event: string;
  manifest: EventManifest;
}

const small = "focus-ring font-mono text-[10px] uppercase tracking-[0.14em] disabled:opacity-40";

export default function ShootEditor({ genre, event, manifest }: ShootEditorProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const coverId = resolveEventCover(manifest);

  async function call(method: string, url: string, body: unknown): Promise<boolean> {
    setBusy(true);
    setError(null);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `Failed (${res.status})`);
      return false;
    }
    return true;
  }

  return (
    <div className="mt-10">
      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {manifest.photos.map((p) => (
          <li key={p.id}>
            <div className="relative aspect-square overflow-hidden bg-line">
              <Image src={photoKey(genre, event, p.id)} alt={p.id} fill sizes="240px" className="object-cover" />
            </div>
            <p className="mt-1 truncate font-mono text-[10px] text-ink/60">
              {p.id}
              {p.id === coverId && " · cover"}
              {p.hidden && " · not in gallery"}
            </p>
            <div className="mt-1 flex gap-3">
              <button
                type="button"
                disabled={busy || p.id === coverId}
                className={small}
                onClick={async () => {
                  if (await call("PATCH", "/api/admin/cover", { genre, event, id: p.id })) router.refresh();
                }}
              >
                Set as cover
              </button>
              <button
                type="button"
                disabled={busy}
                className={`${small} text-red-700`}
                onClick={async () => {
                  if (!window.confirm(`Delete ${p.id}? This can't be undone.`)) return;
                  if (await call("DELETE", "/api/admin/photos", { genre, event, id: p.id })) router.refresh();
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-16 border-t border-line pt-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-red-700">Delete this shoot</p>
        <p className="mt-2 text-sm text-ink/60">
          Removes every photo in it for good. Type <span className="font-mono">{event}</span> to confirm.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="focus-ring border border-line bg-paper px-3 py-2 font-mono text-sm"
          />
          <button
            type="button"
            disabled={busy || confirmText !== event}
            className="focus-ring bg-red-700 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-paper disabled:opacity-40"
            onClick={async () => {
              if (await call("DELETE", "/api/admin/events", { genre, event })) {
                router.push("/admin");
                router.refresh();
              }
            }}
          >
            Delete shoot
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Admin pages**

Replace `app/admin/page.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";
import LogoutButton from "@/components/admin/LogoutButton";
import NewGenreForm from "@/components/admin/NewGenreForm";
import UploadDrop from "@/components/admin/UploadDrop";
import { loadAdminOverview, loadStorageUsage } from "@/lib/admin-data";
import { FREE_STORAGE_BYTES, STORAGE_LIMIT_BYTES, formatGB } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [genres, used] = await Promise.all([loadAdminOverview(), loadStorageUsage()]);
  const nearLimit = used >= STORAGE_LIMIT_BYTES * 0.9;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase">Admin</h1>
        <LogoutButton />
      </div>

      <div className="mt-8 max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
          Storage: {formatGB(used)} of {formatGB(FREE_STORAGE_BYTES)} free · uploads stop at {formatGB(STORAGE_LIMIT_BYTES)}
        </p>
        <div className="mt-2 h-2 w-full bg-line" aria-hidden>
          <div
            className={`h-full ${nearLimit ? "bg-red-700" : "bg-olive"}`}
            style={{ width: `${Math.min(100, (used / FREE_STORAGE_BYTES) * 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-10">
        <NewGenreForm />
      </div>

      {genres.map((genre) => (
        <section key={genre.slug} className="mt-16">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold uppercase">{genre.title}</h2>
            <Link href={`/work/${genre.slug}`} className="focus-ring font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
              View live →
            </Link>
          </div>
          <UploadDrop genre={genre.slug} />
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {genre.shoots.map((shoot) => (
              <li key={shoot.slug}>
                <Link href={`/admin/${genre.slug}/${shoot.slug}`} className="focus-ring block">
                  <div className="relative aspect-[4/3] overflow-hidden bg-line">
                    {shoot.coverKey && (
                      <Image src={shoot.coverKey} alt={shoot.title} fill sizes="280px" className="object-cover" />
                    )}
                  </div>
                  <p className="mt-2 font-display text-sm font-bold uppercase">{shoot.title}</p>
                  <p className="font-mono text-[10px] text-ink/50">
                    {shoot.photoCount} {shoot.photoCount === 1 ? "photo" : "photos"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

Create `app/admin/[genre]/[event]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import ShootEditor from "@/components/admin/ShootEditor";
import UploadDrop from "@/components/admin/UploadDrop";
import { loadShoot } from "@/lib/admin-data";
import { isSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default async function AdminShootPage({ params }: { params: { genre: string; event: string } }) {
  if (!isSlug(params.genre) || !isSlug(params.event)) notFound();
  const manifest = await loadShoot(params.genre, params.event);
  if (!manifest) notFound();

  const visible = manifest.photos.filter((p) => !p.hidden).length;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin" className="focus-ring font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
        ← All shoots
      </Link>
      <h1 className="mt-4 font-display text-4xl font-bold uppercase">{manifest.title}</h1>
      <p className="mt-2 font-mono text-[11px] text-ink/50">
        {visible} {visible === 1 ? "photo" : "photos"} ·{" "}
        <Link href={`/work/${params.genre}/${params.event}`} className="focus-ring underline">
          /work/{params.genre}/{params.event}
        </Link>
      </p>
      <div className="mt-8">
        <UploadDrop genre={params.genre} target={{ event: params.event, title: manifest.title }} />
      </div>
      <ShootEditor genre={params.genre} event={params.event} manifest={manifest} />
    </div>
  );
}
```

- [ ] **Step 6: Build, lint, test**

Run: `npm run build && npm run lint && npm test`
Expected: all pass.

- [ ] **Step 7: End-to-end browser check** (dev server, logged in)

Prepare a throwaway local folder `Zz Upload Test/` with ~6 photos: a normal JPG, a portrait phone JPG (EXIF-rotated), a PNG, a file named `cover.jpg`, a `.txt` file, and a subfolder `extra/` with one JPG. Then:

1. `/admin` → drag `Zz Upload Test` onto the **Zz Test** category (created in Task 12). Review shows name "Zz Upload Test", path `/work/zz-test/zz-upload-test`, `.txt` listed as skipped. Click **Upload** → every file reaches `done`.
2. Open the new shoot in admin: 5 visible photos + `cover` marked "cover · not in gallery"; the portrait photo is upright.
3. `/work/zz-test/zz-upload-test` shows 5 photos, cover.jpg not in the gallery, hero = cover.jpg. Network tab: images from `r2.dev`, none from `/_next/image`.
4. Force a failure: DevTools → Network → Offline right after clicking Upload on a second small drop onto the shoot page; go back online → **Retry N failed** → all `done`, no duplicates in the grid.
5. **Set as cover** on another photo → public shoot page hero changes after a reload.
6. **Delete** one photo → gone from admin and public page; its `w640.jpg` URL now returns 404.
7. Phone-width viewport: **Choose photos** button is usable; layout doesn't overflow horizontally. The storage meter on `/admin` shows ≈1.5 GB of 10.00 GB. Limit check: temporarily set `STORAGE_LIMIT_BYTES` to `1_000_000_000` in `lib/storage.ts`, drop one photo on a shoot → it fails with "Storage limit reached …" and nothing is added; revert the constant.
8. **Delete shoot** (type `zz-upload-test`) → back on `/admin`, shoot gone; public URL 404s.
9. Remove the now-empty **Zz Test** category (the admin UI has no category delete in v1) with a one-off command:

```bash
node --env-file=.env.local --import tsx -e "import('./lib/r2.ts').then(async ({getJson,putJson}) => { const s = await getJson('_site.json'); s.genres = s.genres.filter(g => g.slug !== 'zz-test'); await putJson('_site.json', s); console.log(s.genres.map(g => g.slug)); })"
```

Expected output: `[ 'concerts', 'events', 'graduation' ]`.

- [ ] **Step 8: Commit**

```bash
git add lib/admin-data.ts components/admin app/admin
git commit -m "Add admin overview and shoot pages with folder uploads"
```

---

### Task 15: Vercel preview, then go live

Manual/confirm-at-each-step task. Nothing is pushed to `master` until Wilson says so.

- [ ] **Step 1: Environment variables** — Wilson adds all seven variables from `.env.local` in Vercel → Project → Settings → Environment Variables, for **Production** and **Preview**. (The agent lists the names; Wilson pastes the values.)

- [ ] **Step 2: CORS for Vercel origins** — Wilson updates the CORS policy on `wlsn-photos` to:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://<production>.vercel.app",
      "https://<project>-git-claude-code-folder-explanation-ac7d13-<team>.vercel.app"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

(The agent fills in the two real hostnames once Wilson shares the production URL and the preview deployment shows the branch URL.)

- [ ] **Step 3: Push the branch for a preview** (ask Wilson first)

```bash
git push -u origin claude/code-folder-explanation-ac7d13
```

Then check the preview deployment: build succeeds; public pages match production visually; `/admin` login works; one small real upload to an existing shoot works and then gets deleted. Check on Wilson's phone.

- [ ] **Step 4: Go live** (ask Wilson first) — merge into `master` and push:

```bash
git checkout master
git pull
git merge --no-ff claude/code-folder-explanation-ac7d13
npm run build
git push origin master
```

Verify the production site and the Vercel usage page over the next day (Image Optimization cache writes should stop growing).

---

### Task 16: Remove photos from the repo and update docs

Only after production has been confirmed working for at least a day.

**Files:**
- Delete: `public/work/` (entire directory)
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-09-28-r2-photo-storage-design.md` (status line)

- [ ] **Step 1: Delete the photos**

```bash
git rm -r -q public/work
```

- [ ] **Step 2: Update `CLAUDE.md`**

Replace the "The `public/work/` convention" section with:

```markdown
## Photos live in Cloudflare R2 (read `lib/works.ts` and `lib/manifest.ts` first)

Photos are **not** in the repo. One public R2 bucket, `wlsn-photos` (served from
`NEXT_PUBLIC_PHOTO_BASE_URL`): `_site.json` (categories, their titles and shoot order),
`<genre>/<event>/_event.json` (photos with native width/height, cover), and pre-sized JPEGs
`<genre>/<event>/<photoId>/w{640,1280,1920,2560,3840}.jpg`. Originals are deliberately not stored.

- **Must stay on R2's free tier (10 GB).** `lib/storage.ts` refuses uploads past 9 GB and `/admin`
  shows a meter. Don't raise the limit or add stored originals without Wilson agreeing to pay.

- **Adding/removing photos is done in `/admin`** (password login), not in code. Drop a folder on a
  category → new shoot. Uploads are resized in the browser and go straight to R2.
- `next/image` uses a custom loader (`lib/image-loader.ts`) that picks the nearest pre-built width;
  Vercel image optimization is intentionally unused (it was hitting Hobby-plan limits).
- Pages are ISR (`revalidate = 3600`) and revalidated on every admin change.
- A photo with `hidden: true` exists only as a cover and is not shown in the gallery.
- Env vars: see `.env.example`. Tests: `npm test` (Vitest, pure helpers in `lib/`).
- **Gotcha:** covers still need real resolution — the variants never upscale, so a small source
  stays small. Upload covers exported at ≥4000px wide.
```

Also in `CLAUDE.md`: remove `public/work/` and `scripts/generate-placeholders.mjs`'s description from the project structure block if the script is deleted; update "There is no test suite" in Commands to mention `npm test`; replace the "Don't hand-edit `public/work/` filenames" bullet with "Shoot/category slugs are their URLs — there's no rename in v1; deleting and re-uploading changes nothing else."

- [ ] **Step 3: Mark the spec implemented**

In the spec, change the status line to: `Status: implemented (2026-09-28 plan: docs/superpowers/plans/2026-09-28-r2-photo-storage.md).`

- [ ] **Step 4: Build and verify**

Run: `npm run build && npm test`
Expected: succeeds with `public/work/` gone (nothing reads it any more). Spot-check production pages after deploy.

- [ ] **Step 5: Commit and push** (ask Wilson first)

```bash
git add -A CLAUDE.md docs/superpowers/specs/2026-09-28-r2-photo-storage-design.md
git commit -m "Remove photos from the repo now that they are served from R2"
git push origin master
```

- [ ] **Step 6: Optional — free Vercel deployment storage.** Wilson deletes old deployments in Vercel → Project → Deployments (each still contains the 915 MB of photos). The git history still contains the photos; that affects clone size only, not Vercel limits.
