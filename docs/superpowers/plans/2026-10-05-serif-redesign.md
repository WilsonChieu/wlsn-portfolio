# Serif Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the public site's look (home, `/work/[genre]`, `/work/[genre]/[event]`) with the "Serif Editorial" design from the Claude Design handoff, driven entirely by the live R2 manifests.

**Architecture:** Pure layout/navigation logic lives in `lib/editorial.ts` and `lib/work-nav.ts` (Vitest-covered); static copy in `lib/site-content.ts`. New public components live in `components/site/`, server components by default; only the hero (intro + slideshow), cursor trail, FAQ, presets slider and the shoot gallery/viewer are client components. Old public components are deleted (v1 stays in git history only). Admin is untouched.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind 3, `next/font/google` (Instrument Serif, JetBrains Mono), Web Animations API, existing R2 image loader, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-05-serif-redesign-design.md`
**Design source (read-only reference):** `<scratchpad>/design/wilson-s-photography-portfolio/project/CRISPTAKES Home.dc.html` and `CRISPTAKES Work.dc.html` — exact pixel values, timings and easings come from these.

## Global Constraints

- Colours: `bone #f3f2f2`, `char #201e1d`, `signal #ec3013`, `signal-dark #b5230d`, `mute #4a4644`, `well #e4e2e0`, `night #111110` — added to `tailwind.config.ts` **and** `:root` in `app/globals.css`. Existing `paper/ink/olive/line` tokens stay (admin uses them).
- Fonts: Instrument Serif 400 normal + italic as `--font-serif` (Tailwind `font-serif`); JetBrains Mono 400/500/600 as `--font-jet` (Tailwind `font-jet`).
- `PRESETS_ENABLED = false`. Instagram `https://instagram.com/crisptakes`; Xiaohongshu plain text "Xiaohongshu @crisptakes". WhatsApp number `60183875215`, message "Hi Wilson, I found your portfolio online and I'm interested in booking a shoot!".
- Featured shoot `concerts/off-the-track`; slideshow max 6 frames; slide interval 2600 ms; intro once per session (`sessionStorage` key `ct-intro-seen`).
- All lists/counts from `getGenres()`; nothing hard-coded except copy in `lib/site-content.ts`.
- Desktop layout ≥ 768px (`md:`), mobile layout below; sizes between 390 and 1440 scale with `vw`/`min()` so there is never horizontal scroll.
- `prefers-reduced-motion: reduce` → no intro, no cursor trail, no slide/hover motion.
- Admin pages (`app/admin/**`, `components/admin/**`) are not modified.
- Repo conventions (CLAUDE.md): default-export PascalCase components, `"use client"` only where needed, `@/*` imports after external, Tailwind inline, `.focus-ring` on interactive elements, sparse "why" comments. Commits without Co-Authored-By trailer. Nothing is pushed without Wilson's go-ahead.

## Review Focus

- A shoot whose photos were all deleted (0 visible photos) must render its header and "No photos yet", not a blank/broken hero — pinned in Task 2 (`desktopRows([])`) and Task 7 (page empty state).
- With only one shoot on the whole site, "Next set" must disappear rather than link to itself — pinned in Task 3 (`nextShoot` single-shoot test).
- The viewer with one photo, or at first/last photo, must wrap or no-op without going out of range — pinned in Task 3 (`stepIndex`).
- A shared link with `?photo=<id>` for a deleted/unknown photo must just show the gallery — pinned in Task 3 (`photoIndex` unknown-id test).
- No categories / categories with no shoots must give an empty slideshow and a hero without a photo window, not a crash — pinned in Task 3 (`slideshowFrames` empty tests).

---

### Task 1: Tokens, fonts, site copy, photo ids

**Files:**
- Modify: `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`, `lib/works.ts`
- Create: `lib/site-content.ts`

**Interfaces:**
- Produces: Tailwind colours `bone char signal signal-dark mute well night`; fonts `font-serif`, `font-jet`; CSS classes `.ct-label`, `.ct-site`; `WorkImage.id: string`; everything exported from `lib/site-content.ts` (below).

- [ ] **Step 1: Tailwind tokens** — in `tailwind.config.ts`, add to `theme.extend.colors`:

```ts
        bone: "#F3F2F2",
        char: "#201E1D",
        signal: "#EC3013",
        "signal-dark": "#B5230D",
        mute: "#4A4644",
        well: "#E4E2E0",
        night: "#111110",
```

and to `theme.extend.fontFamily`:

```ts
        serif: ["var(--font-serif)", "serif"],
        jet: ["var(--font-jet)", "monospace"],
```

- [ ] **Step 2: Global CSS** — add to `:root` in `app/globals.css`:

```css
  --bone: #f3f2f2;
  --char: #201e1d;
  --signal: #ec3013;
  --signal-dark: #b5230d;
  --mute: #4a4644;
  --well: #e4e2e0;
  --night: #111110;
```

and append:

```css
.ct-site ::selection {
  background: var(--signal);
  color: #fff;
}
.ct-site .focus-ring:focus-visible {
  outline-color: var(--signal);
}
.ct-label {
  font-family: var(--font-jet), monospace;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

/* Intro pre-state; html[data-intro="skip"] (set before paint) shows the settled hero instead. */
html:not([data-intro="skip"]) .ct-rise { transform: translateY(105%); }
html:not([data-intro="skip"]) .ct-fade { opacity: 0; }
html:not([data-intro="skip"]) .ct-shot { clip-path: inset(50% 0 50% 0); }
html[data-intro="skip"] .ct-overlay { display: none; }

@keyframes ct-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@keyframes ct-wipe {
  from { clip-path: inset(100% 0 0 0); transform: scale(1.08); }
  to { clip-path: inset(0 0 0 0); transform: scale(1); }
}
.ct-marquee { animation: ct-marquee 60s linear infinite; }
.ct-wipe { animation: ct-wipe 900ms cubic-bezier(0.76, 0, 0.24, 1) both; }

html.ct-cursor-none,
html.ct-cursor-none * {
  cursor: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .ct-marquee, .ct-wipe { animation: none; }
}
```

- [ ] **Step 3: Fonts** — in `app/layout.tsx` import `Instrument_Serif, JetBrains_Mono` alongside the existing fonts:

```ts
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jet",
  display: "swap",
});
```

Add both `.variable`s to the `<html>` className and add `suppressHydrationWarning` to `<html>` (the intro script sets `data-intro` on it before hydration).

- [ ] **Step 4: Photo ids** — in `lib/works.ts`, add `id: string;` as the first field of `WorkImage` and `id: p.id,` as the first property in the `images: manifest.photos...map((p) => ({ … }))` object.

- [ ] **Step 5: Site copy** — create `lib/site-content.ts`:

```ts
export const WHATSAPP_URL = `https://wa.me/60183875215?text=${encodeURIComponent(
  "Hi Wilson, I found your portfolio online and I'm interested in booking a shoot!"
)}`;
export const INSTAGRAM = { label: "IG @crisptakes", url: "https://instagram.com/crisptakes" };
// Xiaohongshu profile links need the numeric user id from the app; plain text until Wilson provides it.
export const XIAOHONGSHU = { label: "Xiaohongshu @crisptakes", url: null as string | null };

export const FEATURED_SHOOT = { genre: "concerts", event: "off-the-track" };
export const HERO_TAGS = "Events · Graduations · Concerts";
export const HERO_LINE = { plain: "Wilson. Event & concert photographer — ", italic: "events, graduations, and live sets." };
export const MARQUEE_TEXT = "Events · Graduations · Concerts · 48-hour sneak peek · Events · Graduations · Concerts · 48-hour sneak peek · ";

export const ABOUT = {
  lead: { plain: "I shoot the frames people actually repost — ", italic: "the speaker mid-gesture, the toga toss,", accent: "the chorus drop." },
  left: "I'm Wilson — I've spent the last few years in photo pits, lecture halls, and graduation lawns learning exactly which split-second makes someone stop scrolling.",
  right: "Every booking gets a fast turnaround: a 48-hour sneak peek of hero shots, then the full edited set. No waiting weeks to see if the shot landed.",
};

export const FAQ = [
  { q: "How fast do I get my photos?", a: "A 48-hour sneak peek of hero shots, then the full edited set." },
  { q: "How do I book?", a: "Tap Book a Shoot and message me on WhatsApp with your date, venue and what you’re shooting. I’ll confirm availability and send a quote." },
  { q: "Do you shoot group graduations?", a: "Yes. Solo portraits and group sessions are both welcome." },
  { q: "What do the presets work with?", a: "Lightroom Classic, Lightroom desktop and Lightroom mobile. You get a download link right after checkout." },
];

// Switch on once there's a shop to send buyers to (fill in buyUrl for each preset).
export const PRESETS_ENABLED = false;
export const PRESETS: { name: string; tag: string; price: string; photo: string; buyUrl: string | null }[] = [
  { name: "Pit Red", tag: "For concerts + low light", price: "RM 29", photo: "concerts/off-the-track/cover", buyUrl: null },
  { name: "Lawn Gold", tag: "For graduations + daylight", price: "RM 29", photo: "graduation/wanyi/cover", buyUrl: null },
  { name: "Stage Clean", tag: "For events + mixed light", price: "RM 29", photo: "events/tedxapu-2025/cover", buyUrl: null },
];

export const CTA = { kicker: "Slots go fast during grad + gig season", line1: "Let's make", line2: "it ", italic: "crisp." };
```

- [ ] **Step 6: Verify** — Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all pass (no visual change yet).

- [ ] **Step 7: Commit**

```bash
git add tailwind.config.ts app/globals.css app/layout.tsx lib/works.ts lib/site-content.ts
git commit -m "Add serif redesign tokens, fonts and site copy"
```

---

### Task 2: Editorial row layout

**Files:** Create `lib/editorial.ts`, `lib/editorial.test.ts`

**Interfaces:**
- Produces:
  - `type Orientation = "P" | "L"`; `orientationOf(width: number, height: number): Orientation`
  - `interface EditorialItem { index: number; start: number; span: number; ratio: "2/3" | "3/2" | "16/10" }`
  - `interface EditorialRow { align: "start" | "end"; items: EditorialItem[] }`
  - `desktopRows(shapes: Orientation[]): EditorialRow[]` — exact port of the prototype's `deskRows`
  - `interface MobileRow { items: { index: number; ratio: "2/3" | "4/5" | "3/2" }[] }`
  - `mobileRows(shapes: Orientation[]): MobileRow[]` — port of `mobRows`

- [ ] **Step 1: Failing tests** — `lib/editorial.test.ts`:

```ts
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
```

- [ ] **Step 2: Run** — `npm test` → FAIL (module missing).

- [ ] **Step 3: Implement** — `lib/editorial.ts`:

```ts
export type Orientation = "P" | "L";

export interface EditorialItem {
  index: number;
  start: number;
  span: number;
  ratio: "2/3" | "3/2" | "16/10";
}

export interface EditorialRow {
  align: "start" | "end";
  items: EditorialItem[];
}

export interface MobileRow {
  items: { index: number; ratio: "2/3" | "4/5" | "3/2" }[];
}

export function orientationOf(width: number, height: number): Orientation {
  return height > width ? "P" : "L";
}

// Port of the design prototype's deskRows: the row counter k varies pairings so long sets don't repeat a rhythm.
export function desktopRows(shapes: Orientation[]): EditorialRow[] {
  const rows: EditorialRow[] = [];
  const it = (index: number, start: number, span: number, ratio: EditorialItem["ratio"]): EditorialItem => ({ index, start, span, ratio });
  let i = 0;
  let k = 0;
  while (i < shapes.length) {
    const [a, b, c] = [shapes[i], shapes[i + 1], shapes[i + 2]];
    let row: EditorialRow;
    if (a === "P" && b === "P" && c === "P") {
      row = { align: "start", items: [it(i, 1, 4, "2/3"), it(i + 1, 5, 4, "2/3"), it(i + 2, 9, 4, "2/3")] };
      i += 3;
    } else if (a === "P" && b === "P") {
      row = { align: "end", items: k % 2 ? [it(i, 2, 4, "2/3"), it(i + 1, 7, 5, "2/3")] : [it(i, 1, 5, "2/3"), it(i + 1, 8, 4, "2/3")] };
      i += 2;
    } else if (a === "P" && b === "L") {
      row = { align: "end", items: [it(i, 1, 4, "2/3"), it(i + 1, 6, 7, "3/2")] };
      i += 2;
    } else if (a === "L" && b === "P" && k % 2) {
      row = { align: "end", items: [it(i, 1, 7, "3/2"), it(i + 1, 9, 4, "2/3")] };
      i += 2;
    } else if (a === "L" && b === "L" && k % 3 !== 0) {
      row = { align: "start", items: k % 2 ? [it(i, 1, 5, "3/2"), it(i + 1, 6, 7, "3/2")] : [it(i, 1, 7, "3/2"), it(i + 1, 8, 5, "3/2")] };
      i += 2;
    } else if (a === "L") {
      const full = k % 4 === 0;
      row = { align: "start", items: [full ? it(i, 1, 12, "16/10") : it(i, k % 2 ? 4 : 1, 9, "3/2")] };
      i += 1;
    } else {
      row = { align: "start", items: [it(i, 4, 5, "2/3")] };
      i += 1;
    }
    rows.push(row);
    k++;
  }
  return rows;
}

export function mobileRows(shapes: Orientation[]): MobileRow[] {
  const rows: MobileRow[] = [];
  let i = 0;
  while (i < shapes.length) {
    if (shapes[i] === "P" && shapes[i + 1] === "P") {
      rows.push({ items: [{ index: i, ratio: "2/3" }, { index: i + 1, ratio: "2/3" }] });
      i += 2;
    } else {
      rows.push({ items: [{ index: i, ratio: shapes[i] === "P" ? "4/5" : "3/2" }] });
      i += 1;
    }
  }
  return rows;
}
```

- [ ] **Step 4: Run** — `npm test` → PASS.
- [ ] **Step 5: Commit** — `git add lib/editorial.ts lib/editorial.test.ts && git commit -m "Add editorial photo row layout"`

---

### Task 3: Work navigation helpers

**Files:** Create `lib/work-nav.ts`, `lib/work-nav.test.ts`

**Interfaces:**
- Consumes: `WorkGenre`, `WorkEvent` (type-only) from `lib/works.ts`.
- Produces:
  - `pad2(n: number): string` → `"07"`
  - `plural(n: number, word: string): string` → `"1 photo"`, `"40 photos"`
  - `workSummary(genres: WorkGenre[]): string` → `"3 categories · 11 events"`
  - `interface ShootRef { genreSlug: string; eventSlug: string; title: string; cover: string }`
  - `slideshowFrames(genres: WorkGenre[], max?: number): ShootRef[]` (default 6, round-robin, skips coverless shoots)
  - `nextShoot(genres: WorkGenre[], genreSlug: string, eventSlug: string): ShootRef | null`
  - `stepIndex(index: number, delta: number, count: number): number`
  - `photoIndex(photos: { id: string }[], id: string | null): number` (−1 when absent)

- [ ] **Step 1: Failing tests** — `lib/work-nav.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { WorkGenre } from "@/lib/works";
import { nextShoot, pad2, photoIndex, plural, slideshowFrames, stepIndex, workSummary } from "@/lib/work-nav";

const ev = (g: string, slug: string, cover = `${g}/${slug}/cover`) => ({
  slug, title: slug.toUpperCase(), genreSlug: g, genreTitle: g, cover, images: [],
});
const genre = (slug: string, events: ReturnType<typeof ev>[]): WorkGenre => ({ slug, title: slug, meta: slug, cover: "", events });

const site = [
  genre("concerts", [ev("concerts", "c1"), ev("concerts", "c2")]),
  genre("events", [ev("events", "e1"), ev("events", "e2", ""), ev("events", "e3")]),
  genre("graduation", [ev("graduation", "g1")]),
];

describe("labels", () => {
  it("pads and pluralises", () => {
    expect(pad2(7)).toBe("07");
    expect(pad2(12)).toBe("12");
    expect(plural(1, "photo")).toBe("1 photo");
    expect(plural(40, "photo")).toBe("40 photos");
    expect(plural(0, "event")).toBe("0 events");
  });
  it("summarises categories and events", () => {
    expect(workSummary(site)).toBe("3 categories · 6 events");
    expect(workSummary([genre("x", [ev("x", "a")])])).toBe("1 category · 1 event");
  });
});

describe("slideshowFrames", () => {
  it("takes shoots round-robin across categories and skips shoots without a cover", () => {
    expect(slideshowFrames(site).map((f) => f.eventSlug)).toEqual(["c1", "e1", "g1", "c2", "e3"]);
  });
  it("stops at the maximum", () => {
    expect(slideshowFrames(site, 2).map((f) => f.eventSlug)).toEqual(["c1", "e1"]);
  });
  it("is empty without categories or shoots", () => {
    expect(slideshowFrames([])).toEqual([]);
    expect(slideshowFrames([genre("x", [])])).toEqual([]);
  });
});

describe("nextShoot", () => {
  it("moves to the next shoot, across categories, wrapping to the first", () => {
    expect(nextShoot(site, "concerts", "c2")?.eventSlug).toBe("e1");
    expect(nextShoot(site, "events", "e1")?.eventSlug).toBe("e2");
    expect(nextShoot(site, "graduation", "g1")?.eventSlug).toBe("c1");
  });
  it("is null when the site has a single shoot or the shoot is unknown", () => {
    expect(nextShoot([genre("x", [ev("x", "a")])], "x", "a")).toBeNull();
    expect(nextShoot(site, "concerts", "nope")).toBeNull();
  });
});

describe("viewer helpers", () => {
  it("steps with wrap-around and stays put with one photo", () => {
    expect(stepIndex(0, -1, 5)).toBe(4);
    expect(stepIndex(4, 1, 5)).toBe(0);
    expect(stepIndex(2, 1, 5)).toBe(3);
    expect(stepIndex(0, 1, 1)).toBe(0);
  });
  it("finds a photo by id and ignores unknown or missing ids", () => {
    const photos = [{ id: "a" }, { id: "b" }];
    expect(photoIndex(photos, "b")).toBe(1);
    expect(photoIndex(photos, "zzz")).toBe(-1);
    expect(photoIndex(photos, null)).toBe(-1);
  });
});
```

- [ ] **Step 2: Run** — `npm test` → FAIL (module missing).

- [ ] **Step 3: Implement** — `lib/work-nav.ts`:

```ts
import type { WorkGenre } from "@/lib/works";

export interface ShootRef {
  genreSlug: string;
  eventSlug: string;
  title: string;
  cover: string;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function workSummary(genres: WorkGenre[]): string {
  const events = genres.reduce((sum, g) => sum + g.events.length, 0);
  return `${genres.length} ${genres.length === 1 ? "category" : "categories"} · ${plural(events, "event")}`;
}

const ref = (g: WorkGenre, i: number): ShootRef => ({
  genreSlug: g.slug,
  eventSlug: g.events[i].slug,
  title: g.events[i].title,
  cover: g.events[i].cover,
});

export function slideshowFrames(genres: WorkGenre[], max = 6): ShootRef[] {
  const frames: ShootRef[] = [];
  const longest = Math.max(0, ...genres.map((g) => g.events.length));
  for (let round = 0; round < longest && frames.length < max; round++) {
    for (const g of genres) {
      if (frames.length >= max) break;
      if (g.events[round]?.cover) frames.push(ref(g, round));
    }
  }
  return frames;
}

export function nextShoot(genres: WorkGenre[], genreSlug: string, eventSlug: string): ShootRef | null {
  const all = genres.flatMap((g) => g.events.map((_, i) => ref(g, i)));
  const at = all.findIndex((s) => s.genreSlug === genreSlug && s.eventSlug === eventSlug);
  if (at < 0 || all.length < 2) return null;
  return all[(at + 1) % all.length];
}

export function stepIndex(index: number, delta: number, count: number): number {
  return count > 0 ? (((index + delta) % count) + count) % count : 0;
}

export function photoIndex(photos: { id: string }[], id: string | null): number {
  return id ? photos.findIndex((p) => p.id === id) : -1;
}
```

- [ ] **Step 4: Run** — `npm test` → PASS.
- [ ] **Step 5: Commit** — `git add lib/work-nav.ts lib/work-nav.test.ts && git commit -m "Add work navigation helpers"`

---

### Task 4: Homepage sections (static) and removal of v1 components

**Files:**
- Create: `components/site/SiteHeader.tsx`, `components/site/SerifMarquee.tsx`, `components/site/SelectedWork.tsx`, `components/site/AboutSection.tsx`, `components/site/FaqSection.tsx`, `components/site/PresetsSection.tsx`, `components/site/CtaFooter.tsx`, `components/site/HomeHero.tsx` (static version; animated in Task 5)
- Replace: `app/page.tsx`
- Delete: `components/Nav.tsx`, `Featured.tsx`, `Marquee.tsx`, `WorkList.tsx`, `About.tsx`, `Contact.tsx`, `Footer.tsx`, `Loader.tsx`, `LoaderContext.tsx`, `BookingModal.tsx` (and `lib/motion.ts` + the `framer-motion` dependency if nothing else imports them)

**Interfaces:**
- Consumes: Task 1 tokens/copy; Task 3 `slideshowFrames`, `workSummary`, `plural`, `pad2`, `ShootRef`; `getGenres`.
- Produces: `HomeHero({ frames: ShootRef[], featured: ShootRef | null })` (client), elements carrying `.ct-rise`, `.ct-fade`, `.ct-shot`, `.ct-overlay`, `data-cursor="view"` for Tasks 5–6.

- [ ] **Step 1: `components/site/SiteHeader.tsx`**

```tsx
import Link from "next/link";
import { PRESETS_ENABLED, WHATSAPP_URL } from "@/lib/site-content";

export default function SiteHeader() {
  const link = "focus-ring transition-colors hover:text-signal";
  return (
    <header className="ct-fade flex items-center justify-between border-b border-char px-5 py-3 md:px-12 md:py-7">
      <Link href="/" className={`${link} text-[22px] tracking-[.04em] md:text-[30px]`}>CRISPTAKES</Link>
      <nav className="flex items-center gap-9 text-[20px] md:text-[22px]">
        <a href="#work" className={`${link} hidden md:inline`}>Work</a>
        {PRESETS_ENABLED && <a href="#presets" className={`${link} hidden md:inline`}>Presets</a>}
        <a href="#faq" className={`${link} hidden md:inline`}>FAQ</a>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={`${link} italic text-signal`}>
          <span className="md:hidden">Book →</span>
          <span className="hidden md:inline">Book a shoot →</span>
        </a>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: `components/site/HomeHero.tsx`** (static now; Task 5 adds the intro and slideshow)

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { HERO_LINE, HERO_TAGS } from "@/lib/site-content";
import { pad2, type ShootRef } from "@/lib/work-nav";

function Word({ text, className }: { text: string; className?: string }) {
  return (
    <div className={`whitespace-nowrap leading-[.86] tracking-[-.045em] ${className ?? ""}`}>
      {[...text].map((ch, i) => (
        <span key={i} className="-mx-[.04em] inline-block overflow-hidden px-[.04em] pb-[.06em] align-top">
          <span className="ct-rise inline-block">{ch}</span>
        </span>
      ))}
    </div>
  );
}

export default function HomeHero({ frames, featured }: { frames: ShootRef[]; featured: ShootRef | null }) {
  const frame = frames[frames.length - 1];
  const total = frames.length;
  return (
    <section className="relative h-[205vw] overflow-hidden md:h-[min(59.7vw,860px)]">
      <div className="ct-fade ct-label absolute left-5 right-5 top-5 flex justify-between text-[10px] md:left-12 md:right-12 md:top-9 md:text-[12px]">
        <span>{HERO_TAGS}</span>
        {featured && (
          <Link href={`/work/${featured.genreSlug}/${featured.eventSlug}`} className="focus-ring hidden hover:text-signal md:inline">
            <span className="text-signal-dark">Latest —</span> {featured.title}
          </Link>
        )}
      </div>

      {/* Mobile: absolutely placed like the 390 frame. Desktop: the prototype's flex row (Crisp · photo · takes). */}
      <div className="md:absolute md:inset-x-[2.5vw] md:top-[min(10.4vw,150px)] md:flex md:items-start md:justify-between">
      <Word text="Crisp" className="absolute left-3 top-[14.4vw] text-[38.5vw] md:static md:text-[min(20.83vw,300px)]" />

      {frame && (
        <Link
          href={`/work/${frame.genreSlug}/${frame.eventSlug}`}
          data-cursor="view"
          aria-label={`Open ${frame.title}`}
          className="focus-ring absolute left-[38.5vw] top-[53.8vw] block h-[71.8vw] w-[53.8vw] md:relative md:left-auto md:top-auto md:mt-[min(1.4vw,20px)] md:h-[min(33vw,476px)] md:w-[min(23.6vw,340px)] md:flex-none"
        >
          <div className="ct-shot absolute inset-0 overflow-hidden bg-well" data-shot-frames>
            <Image src={frame.cover} alt={frame.title} fill priority sizes="(min-width: 768px) 24vw, 54vw" className="object-cover" />
          </div>
          {(["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"] as const).map((pos) => (
            <span key={pos} aria-hidden className={`ct-fade pointer-events-none absolute h-4 w-4 -m-2.5 border-char md:h-[22px] md:w-[22px] md:-m-3.5 ${pos}`} />
          ))}
          <div className="ct-label absolute left-0 right-0 top-[calc(100%+14px)] flex items-start justify-between gap-3 text-[10px] leading-[1.5] md:top-[calc(100%+18px)] md:text-[11px]">
            <span className="flex-none whitespace-nowrap" data-frame-label>Frame {pad2(total)} / {pad2(total)}</span>
            <span className="max-w-[110px] text-right [text-wrap:balance] md:max-w-[170px]" data-frame-title>{frame.title}</span>
          </div>
        </Link>
      )}

      <Word text="takes" className="absolute right-3 top-[142vw] text-[38.5vw] italic text-signal md:static md:mt-[min(20.83vw,300px)] md:text-[min(20.83vw,300px)]" />
      </div>

      <p className="ct-fade absolute left-5 top-[179.5vw] w-[85vw] text-[24px] leading-[1.15] [text-wrap:pretty] md:bottom-14 md:left-12 md:top-auto md:w-[min(30.5vw,440px)] md:text-[min(2.2vw,32px)]">
        {HERO_LINE.plain}<i>{HERO_LINE.italic}</i>
      </p>
      <div className="ct-fade ct-label absolute bottom-[60px] right-12 hidden items-center gap-3.5 text-[12px] md:flex">
        <span>Scroll</span>
        <span className="h-px w-16 bg-char" />
      </div>
    </section>
  );
}
```

Note: on desktop the photo sits between the two words exactly as the prototype's `justify-content: space-between` row does.

- [ ] **Step 3: `components/site/SerifMarquee.tsx`**

```tsx
import { MARQUEE_TEXT } from "@/lib/site-content";

export default function SerifMarquee() {
  return (
    <div className="overflow-hidden whitespace-nowrap border-y border-char py-3 text-[40px] italic leading-none md:py-5 md:text-[76px]" aria-hidden>
      <div className="ct-marquee inline-flex">
        <span className="pr-[.6em]">{MARQUEE_TEXT}</span>
        <span className="pr-[.6em]">{MARQUEE_TEXT}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `components/site/SelectedWork.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";
import { pad2, plural, workSummary } from "@/lib/work-nav";
import type { WorkGenre } from "@/lib/works";

const ROW_MASK = "linear-gradient(to right,black 0%,black 45%,transparent 88%)";

export default function SelectedWork({ genres }: { genres: WorkGenre[] }) {
  return (
    <section id="work" className="px-5 pb-14 pt-[72px] md:px-12 md:pb-[120px] md:pt-[140px]">
      <div className="mb-6 flex items-baseline justify-between md:mb-10">
        <h2 className="text-[64px] leading-[.9] tracking-[-.03em] md:text-[min(8.3vw,120px)]">Selected <i>work</i></h2>
        <span className="ct-label hidden text-[12px] tracking-[.06em] md:inline">{workSummary(genres)}</span>
      </div>
      <p className="ct-label mb-5 text-[10px] md:hidden">{workSummary(genres)}</p>

      <ul className="hidden border-b border-char md:block">
        {genres.map((g, i) => (
          <li key={g.slug} className="border-t border-char">
            <Link href={`/work/${g.slug}`} data-cursor="view" className="focus-ring group relative block overflow-hidden">
              {g.cover && (
                <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:opacity-100" style={{ maskImage: ROW_MASK, WebkitMaskImage: ROW_MASK }}>
                  <Image src={g.cover} alt="" fill sizes="100vw" className="object-cover" />
                </div>
              )}
              <div className="relative grid grid-cols-[90px_1fr_auto] items-center gap-6 py-16">
                <span className="font-jet text-[13px] font-medium text-char/55 transition-colors group-hover:text-bone/75">{pad2(i + 1)}</span>
                <span className="text-[min(11.8vw,170px)] leading-[.9] tracking-[-.03em] transition-all duration-300 [text-shadow:0_2px_10px_rgba(17,17,16,0)] group-hover:translate-x-[14px] group-hover:italic group-hover:text-bone group-hover:[text-shadow:0_2px_10px_rgba(17,17,16,.7)]">{g.title}</span>
                <span className="ct-label text-right text-[12px] tracking-[.16em] text-char/55 transition-colors group-hover:text-bone/75">{g.meta} · {plural(g.events.length, "event")}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <ul className="flex flex-col gap-10 md:hidden">
        {genres.map((g, i) => (
          <li key={g.slug}>
            <Link href={`/work/${g.slug}`} className="focus-ring flex flex-col gap-3 border-t border-char pt-4">
              <span className="ct-label flex justify-between text-[10px]"><span>{pad2(i + 1)}</span><span>{g.meta} · {plural(g.events.length, "event")}</span></span>
              <span className="relative block aspect-[3/2] bg-well">
                {g.cover && <Image src={g.cover} alt="" fill sizes="100vw" className="object-cover" />}
              </span>
              <span className="flex items-end justify-between"><span className="text-[60px] leading-[.9] tracking-[-.03em]">{g.title}</span><span className="text-[26px] italic">→</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 5: `components/site/AboutSection.tsx`**

```tsx
import { ABOUT } from "@/lib/site-content";

export default function AboutSection() {
  return (
    <section className="flex flex-col gap-6 px-5 pb-20 pt-10 md:grid md:grid-cols-12 md:gap-6 md:px-12 md:pb-40">
      <p className="ct-label text-[10px] md:col-span-2 md:pt-5 md:text-[12px] md:tracking-[.06em]">About</p>
      <p className="text-[44px] leading-none tracking-[-.02em] [text-wrap:pretty] md:col-span-10 md:col-start-3 md:text-[min(6.4vw,92px)] md:tracking-[-.025em]">
        {ABOUT.lead.plain}<i>{ABOUT.lead.italic}</i> <i className="text-signal">{ABOUT.lead.accent}</i>
      </p>
      <p className="text-[20px] leading-[1.35] [text-wrap:pretty] md:col-span-4 md:col-start-3 md:mt-16 md:text-[25px]">{ABOUT.left}</p>
      <p className="text-[20px] leading-[1.35] [text-wrap:pretty] md:col-span-4 md:col-start-8 md:mt-16 md:text-[25px]">{ABOUT.right}</p>
    </section>
  );
}
```

- [ ] **Step 6: `components/site/FaqSection.tsx`**

```tsx
"use client";

import { useState } from "react";
import { FAQ } from "@/lib/site-content";

export default function FaqSection() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="px-5 py-[72px] md:grid md:grid-cols-12 md:gap-6 md:px-12 md:py-[140px]">
      <h2 className="mb-7 text-[110px] italic leading-[.8] tracking-[-.03em] md:col-span-4 md:mb-0 md:text-[min(13.9vw,200px)]">FAQ</h2>
      <div className="flex flex-col border-b border-char md:col-span-7 md:col-start-6">
        {FAQ.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="border-t border-char">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="focus-ring flex w-full items-center justify-between gap-4 py-[18px] text-left text-[26px] leading-[1.05] hover:italic md:gap-6 md:py-[26px] md:text-[40px] md:tracking-[-.01em]"
              >
                <span>{f.q}</span>
                <span aria-hidden className="text-[30px] not-italic text-signal md:text-[44px]">{isOpen ? "–" : "+"}</span>
              </button>
              {isOpen && <p className="pb-5 text-[19px] leading-[1.35] text-[#3a3634] [text-wrap:pretty] md:pb-[30px] md:pr-20 md:text-[24px]">{f.a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 7: `components/site/PresetsSection.tsx`** (rendered only when enabled)

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { PRESETS } from "@/lib/site-content";

export default function PresetsSection() {
  const [pick, setPick] = useState(0);
  const [split, setSplit] = useState(50);
  const preset = PRESETS[pick];
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" && e.type === "pointermove" && !e.buttons) return;
    const r = e.currentTarget.getBoundingClientRect();
    setSplit(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
  };
  return (
    <section id="presets" className="bg-char px-5 py-16 text-bone md:px-12 md:py-[120px]">
      <div className="mb-6 md:mb-12 md:flex md:items-baseline md:justify-between">
        <h2 className="text-[72px] leading-[.86] tracking-[-.035em] md:text-[min(12.5vw,180px)] md:leading-[.85]">Presets <i className="text-signal">for sale</i></h2>
        <p className="ct-label mt-3 text-[10px] md:mt-0 md:text-right md:text-[12px] md:tracking-[.06em]">Drag to compare<br className="hidden md:inline" /> Lightroom desktop + mobile</p>
      </div>
      <div className="md:grid md:grid-cols-12 md:gap-6">
        <div onPointerMove={move} onPointerDown={move} className="relative aspect-[4/5] cursor-ew-resize touch-none overflow-hidden md:col-span-8 md:aspect-[3/2]">
          <Image src={preset.photo} alt="" fill sizes="(min-width: 768px) 66vw, 100vw" className="object-cover [filter:saturate(.45)_contrast(.78)_brightness(1.08)]" />
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
            <Image src={preset.photo} alt={`${preset.name} preset applied`} fill sizes="(min-width: 768px) 66vw, 100vw" className="object-cover" />
          </div>
          <div className="pointer-events-none absolute inset-y-0 w-px bg-white" style={{ left: `${split}%` }} />
          <span className="pointer-events-none absolute bottom-2.5 left-3.5 text-[30px] italic text-white md:bottom-4 md:left-5 md:text-[44px]">After</span>
          <span className="pointer-events-none absolute bottom-2.5 right-3.5 text-[30px] italic text-white md:bottom-4 md:right-5 md:text-[44px]">Before</span>
        </div>
        <div className="mt-4 flex flex-col md:col-span-4 md:mt-0">
          {PRESETS.map((p, i) => (
            <button key={p.name} type="button" onClick={() => setPick(i)} className={`focus-ring flex items-baseline justify-between border-t border-bone py-4 text-left transition-opacity md:flex-col md:items-stretch md:gap-1.5 md:py-6 ${i === pick ? "opacity-100" : "opacity-40"}`}>
              <span className="flex items-baseline justify-between">
                <span className="text-[32px] leading-none md:text-[52px] md:tracking-[-.02em]">{p.name} <span className="text-signal">{i === pick ? "●" : ""}</span></span>
                <span className="hidden text-[26px] italic md:inline">{p.price}</span>
              </span>
              <span className="ct-label text-[9px] md:text-[11px] md:tracking-[.06em]">{p.tag}</span>
              <span className="text-[22px] italic md:hidden">{p.price}</span>
            </button>
          ))}
          <a href={preset.buyUrl ?? "#presets"} className="focus-ring mt-4 flex justify-between rounded-full border border-bone px-6 py-4 text-[24px] italic transition-colors hover:border-signal hover:bg-signal hover:text-white md:mt-auto md:px-7 md:py-[18px] md:text-[30px]">
            Buy {preset.name}<span>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 8: `components/site/CtaFooter.tsx`**

```tsx
import { CTA, INSTAGRAM, WHATSAPP_URL, XIAOHONGSHU } from "@/lib/site-content";

export default function CtaFooter() {
  return (
    <footer className="bg-signal px-5 pb-8 pt-16 text-white md:px-12 md:pb-10 md:pt-[120px]">
      <p className="ct-label mb-[18px] text-[10px] md:mb-7 md:text-[13px] md:tracking-[.06em]">{CTA.kicker}</p>
      <div className="md:flex md:items-end md:justify-between md:gap-10">
        <p className="text-[92px] leading-[.84] tracking-[-.035em] md:text-[min(17.4vw,250px)] md:leading-[.82]">
          {CTA.line1}<br />{CTA.line2}<i>{CTA.italic}</i>
        </p>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="focus-ring mt-8 flex flex-none justify-between gap-6 rounded-full bg-white px-6 py-[18px] text-[26px] italic text-char transition-colors hover:bg-char hover:text-white md:mb-6 md:mt-0 md:px-10 md:py-6 md:text-[36px]">
          Book a Shoot<span>→</span>
        </a>
      </div>
      <div className="ct-label mt-14 flex flex-col gap-2.5 border-t border-white pt-4 text-[10px] md:mt-[100px] md:flex-row-reverse md:justify-between md:pt-5 md:text-[12px] md:tracking-[.06em]">
        <span className="flex flex-col gap-2.5 md:flex-row md:gap-6">
          <a href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer" className="focus-ring py-1 hover:text-char md:py-0">{INSTAGRAM.label}</a>
          {XIAOHONGSHU.url ? <a href={XIAOHONGSHU.url} target="_blank" rel="noopener noreferrer" className="focus-ring py-1 hover:text-char md:py-0">{XIAOHONGSHU.label}</a> : <span className="py-1 md:py-0">{XIAOHONGSHU.label}</span>}
        </span>
        <span>© {new Date().getFullYear()} CRISPTAKES — Wilson</span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 9: Replace `app/page.tsx`**

```tsx
import AboutSection from "@/components/site/AboutSection";
import CtaFooter from "@/components/site/CtaFooter";
import FaqSection from "@/components/site/FaqSection";
import HomeHero from "@/components/site/HomeHero";
import PresetsSection from "@/components/site/PresetsSection";
import SelectedWork from "@/components/site/SelectedWork";
import SerifMarquee from "@/components/site/SerifMarquee";
import SiteHeader from "@/components/site/SiteHeader";
import { FEATURED_SHOOT, PRESETS_ENABLED } from "@/lib/site-content";
import { slideshowFrames, type ShootRef } from "@/lib/work-nav";
import { getGenres } from "@/lib/works";

export const revalidate = 3600;

export default async function Home() {
  const genres = await getGenres();
  const frames = slideshowFrames(genres);
  const featuredEvent = genres.find((g) => g.slug === FEATURED_SHOOT.genre)?.events.find((e) => e.slug === FEATURED_SHOOT.event);
  const featured: ShootRef | null = featuredEvent
    ? { genreSlug: featuredEvent.genreSlug, eventSlug: featuredEvent.slug, title: featuredEvent.title, cover: featuredEvent.cover }
    : frames[0] ?? null;

  return (
    <div className="ct-site min-h-screen bg-bone font-serif text-char antialiased">
      <SiteHeader />
      <main>
        <HomeHero frames={frames} featured={featured} />
        <SerifMarquee />
        <SelectedWork genres={genres} />
        <AboutSection />
        {PRESETS_ENABLED && <PresetsSection />}
        <FaqSection />
      </main>
      <CtaFooter />
    </div>
  );
}
```

- [ ] **Step 10: Delete v1 home components** — `git rm components/Nav.tsx components/Featured.tsx components/Marquee.tsx components/WorkList.tsx components/About.tsx components/Contact.tsx components/Footer.tsx components/Loader.tsx components/LoaderContext.tsx components/BookingModal.tsx`. Then `grep -rn "lib/motion\|framer-motion" app components lib`: if nothing matches, `git rm lib/motion.ts` and `npm uninstall framer-motion`.

- [ ] **Step 11: Verify** — `npx tsc --noEmit && npm run lint && npm test && npm run build` → all pass. Browser (dev server, `SITE_MODE=all`): until Task 5 adds the intro, the hero sits in its hidden pre-intro state, so first run `document.documentElement.dataset.intro='skip'` in the console. Then `/` renders all sections at 1440, ~900 and 390 wide; no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`); hero photo and selected-work covers load from `r2.dev`; FAQ toggles; WhatsApp/IG links correct; Presets section absent.

- [ ] **Step 12: Commit** — `git add -A components app/page.tsx lib package.json package-lock.json && git commit -m "Rebuild the homepage in the serif editorial design"`

---

### Task 5: Hero intro ("developing") and slideshow

**Files:** Modify `components/site/HomeHero.tsx`

**Interfaces:**
- Consumes: Task 4's markup classes; Task 3 `pad2`.
- Produces: `html[data-intro="skip"]` set before paint on returning visits / reduced motion; overlay element `.ct-overlay`.

- [ ] **Step 1: Add the pre-paint script and overlay** — at the top of `HomeHero`'s returned `<section>`, before everything else, render:

```tsx
      <script
        // Runs before paint so returning visitors (or reduced-motion users) never see the intro's hidden pre-state.
        dangerouslySetInnerHTML={{
          __html:
            "try{if(sessionStorage.getItem('ct-intro-seen')||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.intro='skip'}catch(e){document.documentElement.dataset.intro='skip'}",
        }}
      />
      <div ref={overlayRef} aria-hidden className="ct-overlay pointer-events-none fixed inset-0 z-50">
        <div data-half="top" className="absolute inset-x-0 top-0 h-1/2 bg-char will-change-transform" />
        <div data-half="bot" className="absolute inset-x-0 bottom-0 h-[50.2%] bg-char will-change-transform" />
        <div data-seam className="absolute inset-x-0 top-1/2 h-px origin-center scale-x-0 bg-signal" />
        <div data-label className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-bone">
          <span className="ct-label text-[10px] md:text-[12px] md:tracking-[.2em]">CRISPTAKES — developing</span>
          <span ref={countRef} className="text-[110px] italic leading-[.9] tracking-[-.03em] md:text-[200px]">000</span>
        </div>
      </div>
```

and give the root `<section>` `ref={rootRef}`.

- [ ] **Step 2: Slideshow state** — replace `const frame = frames[frames.length - 1];` with state, and render a wipe layer:

```tsx
  const rootRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const [current, setCurrent] = useState(Math.max(0, frames.length - 1));
  const [previous, setPrevious] = useState<number | null>(null);
  const frame = frames[current];
  const currentRef = useRef(current);
  currentRef.current = current;
```

Inside `.ct-shot`, replace the single `<Image>` with:

```tsx
            {previous !== null && frames[previous] && (
              <Image key={`p${previous}`} src={frames[previous].cover} alt="" fill sizes="(min-width: 768px) 24vw, 54vw" className="object-cover" />
            )}
            <Image key={`c${current}`} src={frame.cover} alt={frame.title} fill priority sizes="(min-width: 768px) 24vw, 54vw" className={`object-cover ${previous !== null ? "ct-wipe" : ""}`} />
```

and the labels become `Frame {pad2(current + 1)} / {pad2(total)}` and `{frame.title}`.

- [ ] **Step 3: Intro + slideshow effect** — add (imports: `useEffect, useRef, useState` from react):

```tsx
  useEffect(() => {
    const root = rootRef.current;
    const overlay = overlayRef.current;
    if (!root || !overlay || frames.length === 0) return;
    // The pre-paint script already marks reduced-motion visitors as "skip".
    const skip = document.documentElement.dataset.intro === "skip";
    const anims: Animation[] = [];
    const timers: number[] = [];
    let slideTimer = 0;
    let raf = 0;

    const advance = () => {
      if (document.hidden) return;
      const c = currentRef.current;
      setPrevious(c);
      setCurrent((c + 1) % frames.length);
    };
    const startSlides = () => {
      if (frames.length > 1) slideTimer = window.setInterval(advance, 2600);
    };

    if (skip) {
      startSlides();
      return () => window.clearInterval(slideTimer);
    }

    try {
      sessionStorage.setItem("ct-intro-seen", "1");
    } catch {}
    const A = (el: Element | null, kf: Keyframe[], o: KeyframeAnimationOptions) => {
      if (!el) return;
      const a = el.animate(kf, { fill: "both", ...o });
      anims.push(a);
      return a;
    };
    const q = (s: string) => root.querySelectorAll(s);
    const one = (s: string) => overlay.querySelector(s);
    const ease = "cubic-bezier(.83,0,.17,1)";
    const out = "cubic-bezier(.16,1,.3,1)";
    const SPLIT = 1650;

    const t0 = performance.now();
    const count = (t: number) => {
      const k = Math.min(1, (t - t0) / 1200);
      const v = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      if (countRef.current) countRef.current.textContent = String(Math.round(v * 100)).padStart(3, "0");
      if (k < 1) raf = requestAnimationFrame(count);
    };
    raf = requestAnimationFrame(count);

    A(one("[data-label]"), [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-24px)" }], { duration: 380, delay: 1300, easing: "cubic-bezier(.4,0,1,1)" });
    A(one("[data-seam]"), [{ transform: "scaleX(0)", opacity: 1 }, { transform: "scaleX(1)", opacity: 1 }], { duration: 420, delay: 1300, easing: out });
    A(one("[data-seam]"), [{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: SPLIT + 100, fill: "forwards", composite: "replace" });
    A(one('[data-half="top"]'), [{ transform: "translate3d(0,0,0)" }, { transform: "translate3d(0,-100%,0)" }], { duration: 1100, delay: SPLIT, easing: ease });
    const last = A(one('[data-half="bot"]'), [{ transform: "translate3d(0,0,0)" }, { transform: "translate3d(0,100%,0)" }], { duration: 1100, delay: SPLIT, easing: ease });
    if (last) last.onfinish = () => { overlay.style.display = "none"; };

    q(".ct-rise").forEach((el, i) => A(el, [{ transform: "translate3d(0,105%,0)" }, { transform: "translate3d(0,0,0)" }], { duration: 1100, delay: SPLIT + 300 + i * 50, easing: out }));
    q(".ct-shot").forEach((el) => A(el, [{ clipPath: "inset(50% 0 50% 0)" }, { clipPath: "inset(0% 0 0% 0)" }], { duration: 1000, delay: SPLIT + 450, easing: ease }));
    q(".ct-fade").forEach((el, i) => A(el, [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 900, delay: SPLIT + 650 + i * 50, easing: out }));
    document.querySelectorAll("header.ct-fade").forEach((el) => A(el, [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 900, delay: SPLIT + 650, easing: out }));

    // The burst: flick through every frame once while the window opens, ending on the last.
    frames.forEach((_, i) => timers.push(window.setTimeout(() => { setPrevious(null); setCurrent(i); }, SPLIT + 600 + i * 120)));
    timers.push(window.setTimeout(startSlides, SPLIT + 600 + frames.length * 120 + 1800));

    // Safety net: if anything above throws or is cut short, never leave the page hidden.
    timers.push(window.setTimeout(() => { document.documentElement.dataset.intro = "skip"; }, 6000));

    return () => {
      anims.forEach((a) => a.cancel());
      timers.forEach((t) => window.clearTimeout(t));
      window.clearInterval(slideTimer);
      cancelAnimationFrame(raf);
    };
  }, [frames]);
```

`SiteHeader`'s `<header>` already has `ct-fade`, so it is hidden pre-intro and fades in with the hero.

- [ ] **Step 4: Verify** — `npx tsc --noEmit && npm run lint && npm run build`. Browser, new tab (fresh session): overlay counts to 100, splits, letters rise, photo window opens, frames flick, label reads `Frame 0N / 0N` + title; reload in the same tab → no overlay, settled hero; slideshow advances every ~2.6 s with an upward wipe; clicking the photo opens the shown shoot. With DevTools "Emulate prefers-reduced-motion: reduce" in a fresh session → no overlay, settled hero. Check mobile 390.

- [ ] **Step 5: Commit** — `git add components/site/HomeHero.tsx && git commit -m "Add the developing intro and hero slideshow"`

---

### Task 6: Custom cursor and halftone trail (desktop)

**Files:** Create `components/site/CursorTrail.tsx`; modify `app/page.tsx` (render `<CursorTrail />` as the last child of the `.ct-site` div).

- [ ] **Step 1: Implement**

```tsx
"use client";

import { useEffect, useRef } from "react";

// Desktop-only flourish from the design: a red cursor that grows into "View" over photos, trailing fading dots.
export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    const cursor = cursorRef.current;
    if (!fine || reduced || !canvas || !cursor) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    document.documentElement.classList.add("ct-cursor-none");
    const disc = cursor.firstElementChild as HTMLElement;
    const label = disc.firstElementChild as HTMLElement;
    const pts: { x: number; y: number; l: number }[] = [];
    let x = -999, y = -999, cx = -999, cy = -999;
    let lx: number | null = null, ly = 0;
    let inside = false, hover = false, raf = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const tick = () => {
      raf = 0;
      // Points are stored in page coordinates so the trail scrolls with the page, as in the design.
      const px = x + scrollX, py = y + scrollY;
      if (inside) {
        if (lx === null) { lx = px; ly = py; }
        const dx = px - lx, dy = py - ly, n = Math.floor(Math.hypot(dx, dy) / 7);
        for (let i = 1; i <= n; i++) pts.push({ x: lx + (dx * i) / n, y: ly + (dy * i) / n, l: 1 });
        if (n) { lx = px; ly = py; }
      } else lx = null;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.fillStyle = "#ec3013";
      ctx.beginPath();
      for (const p of pts) {
        p.l *= 0.93;
        const r = 2.4 * p.l, sx = p.x - scrollX, sy = p.y - scrollY;
        ctx.moveTo(sx + r, sy);
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
      }
      ctx.fill();
      const alive = pts.filter((p) => p.l > 0.08).slice(-160);
      pts.length = 0;
      pts.push(...alive);
      const ox = cx, oy = cy;
      cx += (x - cx) * 0.4;
      cy += (y - cy) * 0.4;
      cursor.style.opacity = inside ? "1" : "0";
      cursor.style.transform = `translate(${cx}px,${cy}px)`;
      disc.style.transform = `scale(${hover ? 1 : 0.12})`;
      label.style.opacity = hover ? "1" : "0";
      if (pts.length || Math.abs(cx - ox) + Math.abs(cy - oy) > 0.2) wake();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX; y = e.clientY;
      if (!inside) { cx = x; cy = y; }
      inside = true;
      hover = !!(e.target as Element | null)?.closest?.('[data-cursor="view"]');
      wake();
    };
    const onLeave = () => { inside = false; hover = false; wake(); };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", wake, { passive: true });
    return () => {
      document.documentElement.classList.remove("ct-cursor-none");
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", wake);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-40 h-screen w-screen" />
      <div ref={cursorRef} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[41] opacity-0">
        <div className="-ml-[42px] -mt-[42px] flex h-[84px] w-[84px] scale-[.12] items-center justify-center rounded-full bg-signal font-serif text-[24px] italic text-white transition-transform duration-[350ms] ease-[cubic-bezier(.2,.8,.2,1)]">
          <span className="opacity-0 transition-opacity duration-200">View</span>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify** — tsc/lint/build pass. Browser at desktop with a mouse: native cursor hidden, red dot follows, trail of dots fades, dot grows to "View" over the hero photo and Selected-work rows, trail stays put on scroll. Mobile emulation and reduced motion: no canvas activity, native cursor visible.
- [ ] **Step 3: Commit** — `git add components/site/CursorTrail.tsx app/page.tsx && git commit -m "Add desktop cursor and halftone trail"`

---

### Task 7: Category page

**Files:**
- Create: `components/site/WorkHeader.tsx`, `components/site/SiteFooter.tsx`
- Replace: `app/work/[genre]/page.tsx`
**Interfaces:**
- Produces: `WorkHeader({ genres: { slug: string; title: string }[]; current: string; back: { href: string; label: string } })`, `SiteFooter()` — reused by Task 8.

- [ ] **Step 1: `components/site/WorkHeader.tsx`**

```tsx
import Link from "next/link";

interface WorkHeaderProps {
  genres: { slug: string; title: string }[];
  current: string;
  back: { href: string; label: string };
}

export default function WorkHeader({ genres, current, back }: WorkHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-char bg-bone">
      <div className="flex items-center justify-between px-5 py-3.5 md:grid md:grid-cols-[1fr_auto_1fr] md:px-12 md:py-6">
        <Link href="/" className="focus-ring text-[22px] tracking-[.04em] hover:text-signal md:text-[28px]">CRISPTAKES</Link>
        <nav className="hidden gap-9 text-[24px] md:flex">
          {genres.map((g) => (
            <Link key={g.slug} href={`/work/${g.slug}`} aria-current={g.slug === current ? "page" : undefined} className={`focus-ring hover:text-signal ${g.slug === current ? "italic text-signal" : ""}`}>{g.title}</Link>
          ))}
        </nav>
        <Link href={back.href} className="focus-ring ct-label justify-self-end py-3.5 text-[11px] hover:text-signal md:py-0 md:text-[12px]">← {back.label}</Link>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: `components/site/SiteFooter.tsx`**

```tsx
import { WHATSAPP_URL } from "@/lib/site-content";

export default function SiteFooter() {
  return (
    <footer className="ct-label flex flex-col gap-3.5 border-t border-char px-5 pb-10 pt-6 text-[11px] tracking-[.12em] md:flex-row md:justify-between md:px-12 md:py-6 md:text-[12px]">
      <span className="md:order-1">© {new Date().getFullYear()} CRISPTAKES — Wilson</span>
      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="focus-ring order-first py-1.5 text-signal hover:text-char md:order-2 md:py-0">Book a shoot →</a>
    </footer>
  );
}
```

- [ ] **Step 3: Replace `app/work/[genre]/page.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/site/SiteFooter";
import WorkHeader from "@/components/site/WorkHeader";
import { pad2, plural } from "@/lib/work-nav";
import { getGenre, getGenres } from "@/lib/works";

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
  const [genres, genre] = await Promise.all([getGenres(), getGenre(params.genre)]);
  if (!genre) notFound();

  return (
    <div className="ct-site min-h-screen bg-bone font-serif text-char antialiased">
      <WorkHeader genres={genres} current={genre.slug} back={{ href: "/#work", label: "All work" }} />
      <div className="flex flex-col gap-3 px-5 pb-6 pt-10 md:gap-[18px] md:px-12 md:pb-20 md:pt-[110px]">
        <p className="ct-label text-[11px] tracking-[.16em] text-signal-dark md:text-[12px]">{genre.meta} · {plural(genre.events.length, "event")}</p>
        <h1 className="text-[96px] leading-[.82] tracking-[-.04em] md:text-[min(19.4vw,280px)] md:leading-[.78] md:tracking-[-.045em]">{genre.title}</h1>
      </div>
      <nav className="flex gap-[22px] border-b border-char px-5 pb-5 text-[22px] md:hidden">
        {genres.map((g) => (
          <Link key={g.slug} href={`/work/${g.slug}`} className={`focus-ring py-2 ${g.slug === genre.slug ? "italic text-signal" : ""}`}>{g.title}</Link>
        ))}
      </nav>

      <main className="flex flex-col gap-12 px-5 pb-16 pt-7 md:gap-[140px] md:px-12 md:pb-[140px] md:pt-10">
        {genre.events.length === 0 && <p className="text-[32px] italic text-mute">No shoots yet.</p>}
        {genre.events.map((ev, i) => {
          const flip = i % 2 === 1;
          return (
            <Link key={ev.slug} href={`/work/${genre.slug}/${ev.slug}`} className="focus-ring group flex flex-col gap-3.5 md:grid md:grid-cols-12 md:items-end md:gap-6">
              <div className={`relative aspect-[4/5] overflow-hidden bg-well md:row-start-1 md:aspect-[3/2] ${flip ? "md:col-span-7 md:col-start-6" : "md:col-span-7 md:col-start-1"}`}>
                {ev.cover && <Image src={ev.cover} alt={ev.title} fill sizes="(min-width: 768px) 58vw, 100vw" className="object-cover transition-transform duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] motion-safe:group-hover:scale-[1.04]" />}
              </div>
              <div className={`flex flex-col gap-3.5 md:row-start-1 md:gap-4 md:pb-1.5 ${flip ? "md:col-span-4 md:col-start-1" : "md:col-span-4 md:col-start-9"}`}>
                <p className="ct-label text-[11px] tracking-[.16em] md:text-[12px]">{pad2(i + 1)} — {plural(ev.images.length, "photo")}</p>
                <div className="flex items-end justify-between gap-4 md:block">
                  <h2 className="text-[40px] leading-[.95] tracking-[-.02em] transition-colors duration-300 [text-wrap:balance] group-hover:italic group-hover:text-signal md:text-[min(5.8vw,84px)] md:leading-[.92] md:tracking-[-.03em]">{ev.title}</h2>
                  <span className="flex-none text-[24px] italic md:hidden">→</span>
                </div>
                <span className="hidden text-[26px] italic md:block">View set →</span>
              </div>
            </Link>
          );
        })}
      </main>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 4: Verify** — tsc/lint/build; browser `/work/concerts`, `/work/events`, `/work/graduation` at 1440/900/390: alternating layout, hover zoom + red italic title, tabs highlight current, "← All work" returns to `/#work`, counts correct, no horizontal scroll.
- [ ] **Step 5: Commit** — `git add -A components app/work && git commit -m "Rebuild category pages in the serif editorial design"`

---

### Task 8: Shoot page — Editorial / Grid and Next set

**Files:**
- Create: `components/site/ShootGallery.tsx`
- Replace: `app/work/[genre]/[event]/page.tsx`
- Delete: `components/ScrollHeader.tsx`

**Interfaces:**
- Consumes: Task 2 `desktopRows`, `mobileRows`, `orientationOf`; Task 3 `nextShoot`, `plural`, `pad2`; Task 7 `WorkHeader`, `SiteFooter`.
- Produces: `ShootGallery({ title: string; photos: GalleryPhoto[] })` where `interface GalleryPhoto { id: string; src: string; width: number; height: number; alt: string }` — Task 9 adds the viewer inside it.

- [ ] **Step 1: `components/site/ShootGallery.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { desktopRows, mobileRows, orientationOf } from "@/lib/editorial";
import { pad2 } from "@/lib/work-nav";

export interface GalleryPhoto {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
}

type Mode = "editorial" | "grid";
const MODE_KEY = "ct-gallery-mode";

// Declared at module level so re-renders (e.g. opening the viewer) don't remount every image.
function Photo({ photo, label, ratio, sizes, onOpen }: { photo: GalleryPhoto; label: string; ratio: string; sizes: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} data-photo={photo.id} className="focus-ring group flex w-full cursor-zoom-in flex-col gap-1.5 text-left md:gap-2.5">
      <span className="relative block w-full overflow-hidden bg-well" style={{ aspectRatio: ratio }}>
        <Image src={photo.src} alt={photo.alt} fill sizes={sizes} className="object-cover transition-transform duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] motion-safe:group-hover:scale-[1.03]" />
      </span>
      <span className="font-jet text-[10px] tracking-[.12em] text-mute md:text-[11px]">{label}</span>
    </button>
  );
}

export default function ShootGallery({ title, photos }: { title: string; photos: GalleryPhoto[] }) {
  const [mode, setMode] = useState<Mode>("editorial");
  const shapes = useMemo(() => photos.map((p) => orientationOf(p.width, p.height)), [photos]);
  const desk = useMemo(() => desktopRows(shapes), [shapes]);
  const mob = useMemo(() => mobileRows(shapes), [shapes]);
  const n = photos.length;

  useEffect(() => {
    try {
      if (sessionStorage.getItem(MODE_KEY) === "grid") setMode("grid");
    } catch {}
  }, []);
  const choose = (m: Mode) => {
    setMode(m);
    try {
      sessionStorage.setItem(MODE_KEY, m);
    } catch {}
  };
  const open = (_index: number) => {};

  const pill = (m: Mode, label: string) => (
    <button type="button" onClick={() => choose(m)} aria-pressed={mode === m} className={`focus-ring rounded-full px-[18px] py-2.5 md:px-5 md:py-2 ${mode === m ? "bg-char text-bone" : ""}`}>{label}</button>
  );
  const label = (i: number) => `${pad2(i + 1)} / ${pad2(n)}`;

  return (
    <>
      <div className="mt-2 flex self-start rounded-full border border-char p-[3px] text-[19px] md:col-span-3 md:col-start-10 md:mt-0 md:self-auto md:justify-self-end md:p-1 md:text-[22px]">
        {pill("editorial", "Editorial")}
        {pill("grid", "Grid")}
      </div>

      <div className="col-span-12 mt-6 md:mt-0">
        {n === 0 && <p className="text-[32px] italic text-mute">No photos yet.</p>}

        {mode === "editorial" && n > 0 && (
          <>
            <div className="hidden flex-col gap-20 md:flex">
              {desk.map((row, r) => (
                <div key={r} className="grid grid-cols-12 gap-6" style={{ alignItems: row.align }}>
                  {row.items.map((it) => (
                    <div key={it.index} style={{ gridColumn: `${it.start} / span ${it.span}` }}>
                      <Photo photo={photos[it.index]} label={label(it.index)} ratio={it.ratio} sizes={`${Math.round((it.span / 12) * 100)}vw`} onOpen={() => open(it.index)} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-7 md:hidden">
              {mob.map((row, r) => (
                <div key={r} className={`grid gap-2 ${row.items.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {row.items.map((it) => (
                    <Photo key={it.index} photo={photos[it.index]} label={label(it.index)} ratio={it.ratio} sizes={row.items.length > 1 ? "50vw" : "100vw"} onOpen={() => open(it.index)} />
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {mode === "grid" && n > 0 && (
          <div className="grid grid-cols-3 gap-1 md:grid-cols-6 md:gap-2">
            {photos.map((p, i) => (
              <button key={p.id} type="button" onClick={() => open(i)} data-photo={p.id} className="focus-ring relative aspect-square cursor-zoom-in overflow-hidden bg-well">
                <Image src={p.src} alt={p.alt} fill sizes="(min-width: 768px) 16vw, 33vw" className="object-cover transition-opacity duration-300 hover:opacity-75" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Replace `app/work/[genre]/[event]/page.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ShootGallery from "@/components/site/ShootGallery";
import SiteFooter from "@/components/site/SiteFooter";
import WorkHeader from "@/components/site/WorkHeader";
import { nextShoot, plural } from "@/lib/work-nav";
import { getEvent, getGenres } from "@/lib/works";

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
  const [genres, event] = await Promise.all([getGenres(), getEvent(params.genre, params.event)]);
  if (!event) notFound();
  const next = nextShoot(genres, event.genreSlug, event.slug);
  const photos = event.images.map((img) => ({ id: img.id, src: img.src, width: img.width, height: img.height, alt: img.alt }));

  return (
    <div className="ct-site min-h-screen bg-bone font-serif text-char antialiased">
      <WorkHeader genres={genres} current={event.genreSlug} back={{ href: `/work/${event.genreSlug}`, label: event.genreTitle }} />
      <main className="flex flex-col gap-3.5 px-5 pt-9 md:grid md:grid-cols-12 md:items-end md:gap-6 md:px-12 md:pt-[100px]">
        <p className="ct-label col-span-12 text-[11px] tracking-[.16em] text-signal-dark md:text-[12px]">{event.genreTitle} · {plural(photos.length, "photo")}</p>
        <h1 className="col-span-9 text-[68px] leading-[.86] tracking-[-.035em] [text-wrap:balance] md:mb-14 md:text-[min(12.8vw,184px)] md:leading-[.84] md:tracking-[-.04em]">{event.title}</h1>
        <ShootGallery title={event.title} photos={photos} />
      </main>

      {next && (
        <Link href={`/work/${next.genreSlug}/${next.eventSlug}`} className="focus-ring group mx-5 mt-[72px] flex flex-col gap-3.5 border-t border-char pb-10 pt-7 md:mx-12 md:mt-40 md:grid md:grid-cols-12 md:items-end md:gap-6 md:pb-[72px] md:pt-12">
          <div className="flex flex-col gap-3.5 md:col-span-8 md:gap-[18px]">
            <span className="ct-label text-[11px] tracking-[.16em] md:text-[12px]">Next set →</span>
            <span className="order-last text-[48px] leading-[.9] tracking-[-.03em] transition-colors duration-300 [text-wrap:balance] group-hover:italic group-hover:text-signal md:order-none md:text-[min(8.9vw,128px)] md:leading-[.86] md:tracking-[-.035em]">{next.title}</span>
          </div>
          <div className="relative aspect-[3/2] overflow-hidden bg-well md:col-span-4">
            {next.cover && <Image src={next.cover} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />}
          </div>
        </Link>
      )}
      <SiteFooter />
    </div>
  );
}
```

Then `git rm components/ScrollHeader.tsx` — nothing imports it any more.

- [ ] **Step 3: Verify** — tsc/lint/build; browser on `/work/concerts/off-the-track` (many photos), `/work/graduation/kenneth-lea` (portrait-heavy), a shoot with 1–2 photos if any: Editorial rows look like the prototype at 1440, phone rows at 390, Grid toggle works and is remembered after navigating to another shoot in the same tab; "Next set" goes to the next shoot and wraps from the last; no horizontal scroll.
- [ ] **Step 4: Commit** — `git add -A components app/work && git commit -m "Rebuild shoot pages with editorial and grid layouts"`

---

### Task 9: Photo viewer

**Files:**
- Create: `components/site/PhotoViewer.tsx`
- Modify: `components/site/ShootGallery.tsx`

**Interfaces:**
- Consumes: Task 3 `stepIndex`, `photoIndex`, `pad2`; `GalleryPhoto`.
- Produces: `PhotoViewer({ title: string; photos: GalleryPhoto[]; index: number; onStep(delta: number): void; onGo(index: number): void; onClose(): void })`.

- [ ] **Step 1: `components/site/PhotoViewer.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { GalleryPhoto } from "@/components/site/ShootGallery";
import { pad2 } from "@/lib/work-nav";

interface PhotoViewerProps {
  title: string;
  photos: GalleryPhoto[];
  index: number;
  onStep: (delta: number) => void;
  onGo: (index: number) => void;
  onClose: () => void;
}

const SWIPE_PX = 40;

export default function PhotoViewer({ title, photos, index, onStep, onGo, onClose }: PhotoViewerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const startX = useRef<number | null>(null);
  const n = photos.length;
  const photo = photos[index];
  const lo = Math.max(0, Math.min(n - 9, index - 4));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onStep(1);
      else if (e.key === "ArrowLeft") onStep(-1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStep, onClose]);

  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.documentElement.style.overflow = prev; };
  }, []);

  if (!photo) return null;
  const counter = `${pad2(index + 1)} / ${pad2(n)}`;

  return (
    <div role="dialog" aria-modal="true" aria-label={`${title} — photo ${counter}`} data-lenis-prevent className="fixed inset-0 z-[70] flex flex-col bg-night text-bone">
      <div className="flex items-center justify-between px-5 pb-3 pt-[max(16px,env(safe-area-inset-top))] md:grid md:grid-cols-[1fr_auto_1fr] md:px-12 md:py-[22px]">
        <span className="hidden text-[26px] italic md:block">{title}</span>
        <span className="font-jet text-[12px] tracking-[.14em] md:text-[13px]">{counter}</span>
        <button ref={closeRef} type="button" onClick={onClose} className="focus-ring ct-label justify-self-end py-3 pl-5 text-[12px] hover:text-signal md:py-0">Close ✕</button>
      </div>

      <div
        className="relative min-h-0 flex-1 touch-pan-y select-none md:px-[120px]"
        onPointerDown={(e) => { startX.current = e.clientX; }}
        onPointerUp={(e) => {
          if (startX.current === null || e.pointerType === "mouse") return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > SWIPE_PX) onStep(dx < 0 ? 1 : -1);
        }}
      >
        <div className="relative h-full w-full">
          <Image key={photo.id} src={photo.src} alt={photo.alt} fill priority sizes="100vw" className="object-contain" />
        </div>
        {n > 1 && (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => onStep(-1)} className="focus-ring absolute inset-y-0 left-0 hidden w-1/2 cursor-w-resize items-center pl-10 text-[56px] opacity-60 hover:opacity-100 md:flex">←</button>
            <button type="button" aria-label="Next photo" onClick={() => onStep(1)} className="focus-ring absolute inset-y-0 right-0 hidden w-1/2 cursor-e-resize items-center justify-end pr-10 text-[56px] opacity-60 hover:opacity-100 md:flex">→</button>
          </>
        )}
      </div>

      <p className="px-5 pb-2 pt-4 text-center text-[24px] italic md:hidden">{title}</p>
      {n > 1 && (
        <div className="flex items-center justify-between px-5 pb-[max(34px,env(safe-area-inset-bottom))] pt-1 md:hidden">
          <button type="button" aria-label="Previous photo" onClick={() => onStep(-1)} className="focus-ring flex h-[52px] w-[52px] items-center justify-center rounded-full border border-bone text-[24px]">←</button>
          <span className="ct-label text-[10px] opacity-60">Swipe</span>
          <button type="button" aria-label="Next photo" onClick={() => onStep(1)} className="focus-ring flex h-[52px] w-[52px] items-center justify-center rounded-full border border-bone text-[24px]">→</button>
        </div>
      )}
      {n > 1 && (
        <div className="hidden justify-center gap-1.5 px-12 pb-6 pt-5 md:flex">
          {photos.slice(lo, lo + 9).map((t, j) => (
            <button key={t.id} type="button" aria-label={`Photo ${lo + j + 1}`} onClick={() => onGo(lo + j)} className={`focus-ring relative h-[46px] w-[68px] overflow-hidden transition-opacity ${lo + j === index ? "opacity-100 outline outline-1 outline-offset-2 outline-bone" : "opacity-40"}`}>
              <Image src={t.src} alt="" fill sizes="68px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `ShootGallery`** — add `useCallback` and `useRef` to the react import, plus `import PhotoViewer from "@/components/site/PhotoViewer";` and `photoIndex, stepIndex` from `@/lib/work-nav`. Above the component add:

```tsx
function urlWithPhoto(id: string | null): string {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("photo", id);
  else url.searchParams.delete("photo");
  return url.toString();
}
```

Replace `const open = (_index: number) => {};` with:

```tsx
  const [index, setIndex] = useState(-1);
  const open = (i: number) => {
    window.history.pushState({ ctPhoto: true }, "", urlWithPhoto(photos[i].id));
    setIndex(i);
  };
  const go = useCallback((i: number) => {
    window.history.replaceState(window.history.state, "", urlWithPhoto(photos[i].id));
    setIndex(i);
  }, [photos]);
  const step = useCallback((d: number) => {
    setIndex((i) => {
      const nextI = stepIndex(i, d, photos.length);
      window.history.replaceState(window.history.state, "", urlWithPhoto(photos[nextI].id));
      return nextI;
    });
  }, [photos]);
  const close = useCallback(() => {
    // Closing pops our own history entry so Back and the ✕ button behave the same.
    if (window.history.state?.ctPhoto) window.history.back();
    else {
      window.history.replaceState(null, "", urlWithPhoto(null));
      setIndex(-1);
    }
  }, []);

  useEffect(() => {
    const sync = () => setIndex(photoIndex(photos, new URLSearchParams(window.location.search).get("photo")));
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [photos]);

  const lastOpen = useRef<string | null>(null);
  useEffect(() => {
    if (index >= 0) {
      lastOpen.current = photos[index]?.id ?? null;
      // Warm the neighbours so stepping through the set feels instant.
      for (const d of [1, -1]) {
        const p = photos[stepIndex(index, d, photos.length)];
        if (p) new window.Image().src = `${process.env.NEXT_PUBLIC_PHOTO_BASE_URL}/${p.src}/w1920.jpg`;
      }
    } else if (lastOpen.current) {
      // Return keyboard focus to the photo that was open.
      document.querySelector<HTMLElement>(`[data-photo="${lastOpen.current}"]`)?.focus();
      lastOpen.current = null;
    }
  }, [index, photos]);
```

and render, as the last child of the fragment:

```tsx
      {index >= 0 && <PhotoViewer title={title} photos={photos} index={index} onStep={step} onGo={go} onClose={close} />}
```

If `react-hooks/exhaustive-deps` doesn't need the disables (lint passes without), remove those comments.

- [ ] **Step 3: Verify** — tsc/lint/build; browser on a shoot: click photo → viewer, URL gains `?photo=<id>`; ←/→ step and wrap; Esc and ✕ close and drop the param; browser Back closes; opening `/work/…?photo=<id>` directly opens that photo; unknown id shows the gallery; thumbnail strip jumps; page can't scroll behind the viewer; focus lands on Close. Mobile 390: swipe left/right steps, round buttons work, Swipe label shown.
- [ ] **Step 4: Commit** — `git add components/site && git commit -m "Add the photo viewer with keyboard, swipe and shareable links"`

---

### Task 10: Final checks and docs

**Files:** Modify `CLAUDE.md`

- [ ] **Step 1: Full verification** — `npm test`, `npm run build`, then browser at 1440, ~900 and 390 on `/`, all three categories, three shoots: no horizontal scroll anywhere (`scrollWidth <= innerWidth`), every image from `r2.dev` and loaded, intro once per session, reduced-motion path (DevTools emulation) shows no intro/trail/wipes, `SITE_MODE=public` still 404s `/admin`, admin pages unchanged.
- [ ] **Step 2: CLAUDE.md** — in "Overview" replace the stack line's "Framer Motion" (if removed in Task 4) and add after the "Two deployments" section:

```markdown
## Public design ("Serif Editorial", 2026-10)

- Source: Claude Design handoff (Home + Work prototypes); spec `docs/superpowers/specs/2026-10-05-serif-redesign-design.md`.
- Public components live in `components/site/`; copy (FAQ, about, presets, socials, WhatsApp) in `lib/site-content.ts`; layout logic in `lib/editorial.ts` and `lib/work-nav.ts`.
- Colours `bone/char/signal/...` and fonts `font-serif` (Instrument Serif) / `font-jet` (JetBrains Mono) are for the public site; the admin keeps `paper/ink/olive`.
- Presets section is built but off: `PRESETS_ENABLED` in `lib/site-content.ts`.
- Homepage intro plays once per browser session (`ct-intro-seen`); a pre-paint script sets `html[data-intro="skip"]` for repeat visits and reduced motion.
```

and in "Code style" change "the one shared context is `LoaderContext.tsx`" to "there is no shared React context on the public site".

- [ ] **Step 3: Commit** — `git add CLAUDE.md && git commit -m "Document the serif editorial design"`
