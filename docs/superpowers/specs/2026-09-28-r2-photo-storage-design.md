# R2 Photo Storage + Admin Uploads — Design Spec

Status: implemented and live (2026-09-28/29); plan: `docs/superpowers/plans/2026-09-28-r2-photo-storage.md`.
`public/work/` and the one-time migration script have since been removed from the repo.

## 1. Problem & goal

All photos (915 MB, 562 files) live in `public/work/`, are committed to git, and ship with every
Vercel deploy. `next/image` optimizes them through Vercel. On the Hobby plan (last 30 days) this
puts Image Optimization **cache writes at 74K / 100K** and Functions Storage at 6.77 / 10 GB, with
Deployment Storage growing per deploy. More shoots are coming.

Goal: photo storage and delivery that scales with the collection at near-zero cost, with shoots
added from a browser instead of through git.

Success criteria:

- No photo bytes in the repo or Vercel deployments; Vercel does no image optimization for photos.
- Adding a shoot = drag a folder onto `/admin`; it appears on the live site within seconds, no deploy.
- Photos render sharp on wide/retina desktops (served at up to 3840px, never upscaled).
- Public URLs (`/work/<genre>/<event>`) and page appearance are unchanged.

Out of scope for this spec: visitor/click statistics dashboard (separate sub-project, later; note
Vercel Web Analytics is already enabled), custom domain, reordering photos, renaming shoots.

## 2. Decisions

| Topic | Decision |
|---|---|
| Storage | Cloudflare R2 |
| Public delivery | Bucket's `r2.dev` URL for now (no custom domain; site stays on `*.vercel.app`). Base URL is a single env var so a custom domain later is a config change. |
| Resizing | Done once at upload time (browser in admin, `sharp` in the migration script). Pre-built JPEG variants, no runtime transforms. |
| Admin auth | Single password, single user |
| Admin v1 features | Upload (folder drag-drop), delete photo/shoot, set shoot cover, create category |
| Tests | Add Vitest for pure helpers only; pages/uploads verified manually in the browser |

## 3. Storage layout

One bucket, **`wlsn-photos`** (public via `r2.dev`), holding only resized, EXIF-stripped variants
plus manifests. **Originals are not stored** (amended 2026-09-28): Wilson keeps his own camera
originals, and skipping them nearly doubles the free-tier headroom. Generating new sizes later
means re-uploading from his copies.

Keys:

```
_site.json
<genre>/<event>/_event.json
<genre>/<event>/<photoId>/w640.jpg
<genre>/<event>/<photoId>/w1280.jpg
<genre>/<event>/<photoId>/w1920.jpg
<genre>/<event>/<photoId>/w2560.jpg
<genre>/<event>/<photoId>/w3840.jpg
```

**Variant rule:** all five variant keys always exist. A variant wider than the source is stored at
the source's native width (never upscaled). This keeps the image loader trivial — it never needs
to know a photo's real width.

Encoding: JPEG, quality 88 (browser `pica` + canvas encode; `sharp` + mozjpeg in the script).
Orientation applied, all metadata stripped. JPEG rather than WebP because Safari (incl. every
iPhone browser) cannot encode WebP from a canvas, which would break phone uploads.

### Manifests

`_site.json` — categories, their display order, and their shoots' order:

```json
{
  "genres": [
    {
      "slug": "concerts",
      "title": "Concerts",
      "meta": "Live Sets",
      "cover": { "event": "off-the-track", "photo": "cover" },
      "events": ["international-cultural-night", "off-the-track"]
    }
  ]
}
```

`cover` is optional; if absent the genre cover is its first event's cover (current behavior).
It replaces the hardcoded `GENRE_LABELS` in `lib/works.ts`.

`<genre>/<event>/_event.json`:

```json
{
  "title": "Off The Track",
  "cover": "cover",
  "photos": [{ "id": "ott-1", "width": 5000, "height": 3333 }]
}
```

A photo may carry `"hidden": true`: it exists only to be a cover and is not shown in the public
gallery or counted. This preserves today's behavior where a separate `cover.jpg` is not part of the
gallery. Uploaded `cover.*` files become hidden photos; the migration reuses an identical gallery
photo instead when `cover.*` is a byte-for-byte copy of one.

`cover` is a photo id or `null` (→ first photo). `width`/`height` are the source's native
dimensions, used for layout aspect ratios. Photo order = array order (natural filename sort within
each upload batch; new batches append).

Writes are last-write-wins. Acceptable: single admin user.

### Slugs & ids

`slugify()`: lowercase, strip accents, non-alphanumerics → `-`, collapse/trim dashes
(`"Wei Juin"` → `wei-juin`). Used for new genres, new shoots (from folder name, editable), and
photo ids (from filename without extension). Photo id collisions within a shoot get `-2`, `-3`, ….

## 4. Public site changes

- **`lib/works.ts`** — rewritten to read `_site.json` and `_event.json` from R2 (server-side, via the
  S3 API) instead of `fs`. Exposes the same `WorkGenre` / `WorkEvent` / `WorkImage` shapes and the
  same `getGenres` / `getGenre` / `getEvent` functions (now `async`), so pages change minimally.
  `readImageDimensions`, `findExplicitCover` and `GENRE_LABELS` are removed. `WorkImage.src` becomes
  the photo's key prefix (`concerts/off-the-track/ott-1`).
- **Image loader** — `next.config.mjs` sets `images.loader: "custom"` with a `loaderFile`
  (`lib/image-loader.ts`) mapping `(src, width)` → `${NEXT_PUBLIC_PHOTO_BASE_URL}/${src}/w{N}.jpg`,
  where N is the smallest of 640/1280/1920/2560/3840 that is ≥ width (else 3840). Vercel image
  optimization is therefore never invoked. `quality` props become irrelevant and are removed.
- **Freshness** — pages use ISR (`revalidate = 3600`) and admin mutations call
  `revalidatePath("/", "layout")` for near-instant updates. `generateStaticParams` stays;
  `dynamicParams` stays true so shoots created after a deploy render on first visit.
- **`components/Featured.tsx`** — hardcoded `/work/concerts/off-the-track/cover.jpg` becomes the R2
  key `concerts/off-the-track/cover`. Its 1800px max-size box stays until a full-res export of that
  photo exists (source is only 1684px wide).
- Drop the earlier uncommitted `quality={90}` / AVIF change (superseded, and it would have
  increased Vercel cache writes). Keep the `wanyi` / `wei-juin` folder renames — the migration
  uploads under those names.

## 5. Admin area

### Auth

- Env: `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`.
- `POST /api/admin/login` compares the password in constant time; on failure waits ~1 s and
  returns 401. On success sets `wlsn_admin` cookie: `expiry.HMAC-SHA256(expiry)`, `httpOnly`,
  `Secure`, `SameSite=Strict`, 7-day expiry. `POST /api/admin/logout` clears it.
- `middleware.ts` verifies the cookie (Web Crypto, edge-compatible) for `/admin/*` (except
  `/admin/login`) and `/api/admin/*` (except login). API route handlers re-verify.
- Admin pages set `robots: noindex`.

### Screens (all under `app/admin/`)

1. **`/admin/login`** — password form.
2. **`/admin`** — categories with their shoots (cover thumbnail, photo count); **+ New category**
   (name + short label → slug); each category is a folder drop zone.
3. **`/admin/[genre]/[event]`** — photo grid with **Set as cover** / **Delete** per photo, a drop
   zone to add photos, **Delete shoot** (confirm by typing the shoot slug).

### Folder drop & file selection

- Dropping one or more folders on a category → one new shoot per folder, name prefilled from the
  folder name (editable before confirming). Dropping on an existing shoot → photos added to it.
- Folder traversal via `DataTransferItem.webkitGetAsEntry()`, recursive; subfolder photos join the
  same shoot.
- Also a **Choose folder** button (`<input webkitdirectory>`) and a **Choose photos** button
  (multi-select; the only option on phones, which can't drag folders).
- Accepted: jpg/jpeg/png/webp/gif/heic/heif; HEIC decodes in Safari only and fails with an
  "export as JPG" message elsewhere. Everything else (RAW, sidecars, `.DS_Store`) is skipped and listed to the user.
- A file named `cover.*` becomes the shoot cover (as a hidden photo, see §3).

### Upload pipeline (per photo, 2 concurrent)

1. Decode in the browser (`createImageBitmap`, orientation from EXIF); read native width/height.
2. Generate the five JPEG variants with `pica` (high-quality resize) → canvas encode.
3. `POST /api/admin/uploads` with the photo id and its total variant bytes → server checks the
   storage limit (§5a) and returns presigned PUT URLs (short expiry) for the five variant keys.
4. Browser PUTs the variants directly to R2 (no photo bytes pass through Vercel).
5. When a shoot's batch finishes, `POST /api/admin/photos` commits the successful photos to
   `_event.json` (and creates the shoot in `_site.json` if new). The server `HeadObject`-checks
   each photo's variants before committing, then revalidates.

Failed photos show red with **Retry**; others continue. A photo appears on the site only after
commit, so partial uploads are never visible (orphaned objects from abandoned uploads are
tolerated).

### Mutations

- **Set cover** — `PATCH` event manifest `cover`.
- **Delete photo** — remove from manifest first (instantly gone from the site), then delete its
  variants. Deleting the cover resets `cover` to `null`.
- **Delete shoot** — remove from `_site.json` first, then delete all objects under its prefix.
- **New category** — append to `_site.json`.
- Every mutation revalidates. The R2 S3 client lives in `lib/r2.ts` (`@aws-sdk/client-s3`,
  `@aws-sdk/s3-request-presigner`); manifest read/update helpers in `lib/manifest.ts`.

## 5a. Staying on the R2 free tier (added 2026-09-28)

Wilson wants to pay nothing. R2's free tier is 10 GB storage, 1M Class A and 10M Class B operations
per month, free egress; Cloudflare offers no spending cap or R2 usage alert on free accounts, so the
site enforces its own limit:

- **Limit:** uploads are refused once stored bytes + incoming bytes would exceed **9 GB**
  (`9_000_000_000` bytes — decimal, so stricter than a binary GB; 1 GB margin below the free 10 GB).
- **Enforcement:** `POST /api/admin/uploads` sums the bucket's object sizes (ListObjectsV2, ~1 Class A
  op per 1,000 objects) and returns 507 with a clear message when the photo wouldn't fit. The
  browser sends the photo's total variant size with the request.
- **Meter:** `/admin` shows "X GB of 10 GB free storage used · uploads stop at 9 GB" with a bar.
- Measured cost: ~2.7 MB per photo (5 variants); the current 562 photos ≈ 1.5 GB, leaving room for
  roughly 2,800 more.
- Operations are far from their limits (~5 writes per photo uploaded; one read per image view).

## 6. Migration script (`scripts/migrate-to-r2.mjs`)

- Reads `public/work/`, builds `_site.json` (titles/meta from the current `GENRE_LABELS`, the
  graduation genre cover from `graduation/cover.JPG`) and each `_event.json`; uploads variants with
  `sharp` (lanczos3, JPEG q88 mozjpeg). Prints the bucket's total usage at the end.
- **Blurry covers:** for `concerts/off-the-track/cover.jpg` and `graduation/kenneth-lea/cover.JPG`
  (and the identical `graduation/cover.JPG`), uses the pre-upscale versions from git
  (`799db5e^`) instead of the upscaled files, since upscaling added no detail.
- `--dry-run` prints the plan without uploading. Idempotent: skips objects that already exist, so
  it can resume after a dropped connection.
- Reads R2 credentials from `.env.local`.
- Run once from Wilson's PC. The live site is unaffected (it still uses `public/work/`).

## 7. Configuration

Env vars (`.env.local` locally, Vercel project settings in prod; never committed):

```
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_PUBLIC_BUCKET=wlsn-photos
NEXT_PUBLIC_PHOTO_BASE_URL=https://pub-<hash>.r2.dev
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
```

Cloudflare setup (Wilson, in the dashboard, with step-by-step instructions): create the
`wlsn-photos` bucket, enable its `r2.dev` public access, create an R2 API token scoped to it
(Object Read & Write), and add a CORS rule allowing `PUT` from
`http://localhost:3000` and the production `vercel.app` origin (plus a preview origin while testing).

## 8. Testing

- **Vitest (new):** `slugify`, image-loader width selection, manifest update functions (add photos,
  delete photo incl. cover reset, set cover, add genre/shoot, id de-duplication), storage-limit
  check.
- **Manual:** `npm run build`; then in the browser against real R2 — every public page, a folder
  drop, a multi-photo upload with one forced failure + retry, set cover, delete photo, delete shoot,
  new category; check a phone-width viewport.

## 9. Rollout (pause for Wilson's go-ahead at each step)

1. Cloudflare setup (§7).
2. Migration `--dry-run`, then real run; spot-check objects in the R2 dashboard.
3. Local verification (§8).
4. Push this branch (not `master`) → Vercel preview; add env vars in Vercel; verify on desktop + phone.
5. Merge to `master` (live).
6. After live is confirmed: separate commit deleting `public/work/` (and `scripts/generate-placeholders.mjs`
   if no longer useful). Until then, rollback = revert. Optionally delete old Vercel deployments to
   free Deployment Storage.
7. Update `CLAUDE.md` — the `public/work/` convention section becomes the R2/manifest convention.

## 10. Known limitations

- `r2.dev` is rate-limited and uncached (Cloudflare positions it for non-production use). Mitigated
  by pre-sized variants; resolved by adding a custom domain later (change `NEXT_PUBLIC_PHOTO_BASE_URL`).
- Off-the-track and kenneth-lea covers are capped at their real resolution (1684px / 2700px) until
  re-exported from originals.
- Single admin, last-write-wins manifests; no reorder/rename in v1.

## 11. Separate admin deployment (amended 2026-09-28)

Wilson does not want `/admin` reachable on the public site. The same codebase (branch `master`) is
deployed to **two Vercel projects**; an env var decides what each serves: `wlsn-portfolio`
(`https://wlsn-portfolio.vercel.app`, public, existing) and `wlsn-admin`
(`https://wlsn-admin.vercel.app`, created by Wilson). Until this branch is merged, `wlsn-admin`
serves the old portfolio from `master`.

### `SITE_MODE`

| Value | Used by | Public pages (`/`, `/work/…`) | `/admin*`, `/api/admin*` |
|---|---|---|---|
| `public` (default when unset or unrecognised) | `wlsn-portfolio` | served | **404** |
| `admin` | `wlsn-admin` | redirect to `/admin` | served (login required as before) |
| `all` | local development only (`.env.local`) | served | served |

- Unset/unknown falls back to `public` so a misconfigured deploy never exposes admin.
- Enforced in `middleware.ts`, whose matcher widens to all paths except `/_next/*` and static files.
  The decision is a pure function (`lib/site-mode.ts`) that is unit-tested.
- `/api/revalidate` is allowed in every mode (it has its own secret).

### Cross-project revalidation

Admin mutations can no longer `revalidatePath` the public deployment directly.

- Public site: `POST /api/revalidate` with header `Authorization: Bearer <REVALIDATE_SECRET>` →
  `revalidatePath("/", "layout")`; wrong/missing secret → 401; unset secret → 500 (endpoint disabled).
  The comparison is constant-time.
- Admin: `revalidateSite()` revalidates locally and then POSTs to `${PUBLIC_SITE_URL}/api/revalidate`.
  A failure is logged and does not fail the mutation; the public site's ISR (`revalidate = 3600`)
  catches up within an hour.

### Environment per project

- `wlsn-portfolio`: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (optionally a
  separate read-only R2 token), `R2_PUBLIC_BUCKET`, `NEXT_PUBLIC_PHOTO_BASE_URL`, `REVALIDATE_SECRET`.
  No `ADMIN_*` vars (admin is unreachable anyway). `SITE_MODE` unset or `public`.
- `wlsn-admin`: all of the above with the read-write token, plus `ADMIN_PASSWORD`,
  `ADMIN_SESSION_SECRET`, `SITE_MODE=admin`, `PUBLIC_SITE_URL=https://wlsn-portfolio.vercel.app`,
  same `REVALIDATE_SECRET`.
- Local `.env.local`: `SITE_MODE=all`, `PUBLIC_SITE_URL` unset (local revalidation only).
- CORS on `wlsn-photos` adds `https://wlsn-admin.vercel.app` (uploads happen only from admin).

### Testing

- Vitest: route decisions for every mode × path class; bearer-secret check.
- Browser: local run in each mode; after go-live, an admin change appears on the public site
  within seconds.
