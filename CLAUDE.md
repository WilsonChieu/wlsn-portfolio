# CLAUDE.md

## Overview

WLSN (CRISPTAKES) — a Next.js photography portfolio site (events, concerts,
graduations). No CMS, no database: the entire "work" gallery is derived from
the filesystem at build/request time from `public/work/`. A booking button
links straight out to WhatsApp; there is no backend/API layer.

**Stack:** Next.js 14 (App Router), React 18, TypeScript (strict), Tailwind
CSS, Framer Motion, Lenis (smooth scroll). Deployed on Vercel, auto-deploying
from `master`.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build — also type-checks and lints
npm run start    # serve a production build
npm run lint     # eslint (next/core-web-vitals + next/typescript)
```

There is no test suite/framework in this repo. Verify changes by running
`npm run build` and checking the page in a browser — don't claim something
works without doing both.

## Project structure

```
app/
  page.tsx                    # landing page (assembles the components below)
  layout.tsx                  # root layout, fonts, metadata
  work/[genre]/page.tsx       # genre gallery (e.g. /work/concerts)
  work/[genre]/[event]/page.tsx  # single event's photo gallery
components/                   # one file per component, PascalCase, default export
lib/
  works.ts                    # reads public/work/ off disk — see below
  motion.ts                   # shared Framer Motion variants/easings
public/work/                  # the actual photo content — see convention below
scripts/generate-placeholders.mjs  # generates placeholder images via sharp
docs/superpowers/                  # design specs / plans from past brainstorming sessions
```

## The `public/work/` convention (read `lib/works.ts` first)

```
public/work/<genre-slug>/
  cover.jpg                   # optional explicit genre cover
  <event-slug>/
    cover.jpg                  # optional explicit event cover
    01.jpg, 02.jpg, ...        # any other image (jpg/jpeg/png/webp/gif)
```

- Genres/events are just directories — **adding one is a filesystem change,
  not a code change.**
- Cover fallback: explicit `cover.jpg` → else first image (event) / first
  event's cover (genre). No cover = no image, not an error.
- Genre display titles come from `GENRE_LABELS` in `lib/works.ts` (currently
  `concerts`, `graduation`, `events`) for the ones that need a custom
  title/meta; anything else falls back to a title-cased version of the slug.
  **If you add a genre folder that needs a specific display name/meta, add
  it to `GENRE_LABELS` too.**
- Image width/height are read directly from the file's bytes
  (`readImageDimensions` in `lib/works.ts`, hand-rolled PNG/GIF/JPEG/WebP
  parsing — no external lib). If you ever add a new image format, that
  function needs a matching branch or dimensions silently fall back to
  1200×800.
- **Gotcha:** covers must have real resolution behind them. A cover gets
  rendered `fill` + `object-cover` across a full-width row/hero on desktop;
  if the source file is small (there was a real bug from a ~1800px cover
  being upscaled and looking blurry on wide screens — mobile looked fine
  because it never needed more pixels), it'll visibly blur on large/retina
  screens even though it looks fine on mobile. Export covers at ≥4000px wide
  when in doubt.

## Code style

- TypeScript strict mode. Components are function components with an
  explicit `export default function ComponentName()`.
- `"use client"` only on components that actually need interactivity/hooks
  (state, effects, framer-motion `motion.*`, context). Page/layout files and
  purely presentational pieces stay server components.
- Import order: external packages first (`react`, `next/*`,
  `framer-motion`), then internal via the `@/*` path alias
  (`@/lib/...`, `@/components/...`).
- Styling is Tailwind utility classes inline — no CSS modules, no
  styled-components. The only handwritten CSS is `app/globals.css` for a
  few reusable primitives (`.focus-ring`, `.text-outline`, `.marquee-track`)
  and CSS custom properties for the palette. Design tokens (colors, fonts)
  are defined in **two places that must stay in sync**: `tailwind.config.ts`
  (`theme.extend.colors`/`fontFamily`) and the `:root` variables in
  `app/globals.css`.
- Interactive elements needing a visible focus state use the shared
  `.focus-ring` utility class rather than ad-hoc `focus:` styles.
- State is local `useState`/`useEffect`; the one shared context is
  `LoaderContext.tsx` (intro-loader completion flag). No Redux/Zustand/etc.
  — don't introduce a state library for something local state can do.
- No comments unless explaining a genuinely non-obvious "why" (see the
  existing sparse comments in `lib/works.ts` for the tone to match).

## Things to know / not do

- **No backend.** The booking flow used to POST to `/api/book` with
  Notion/Discord/Resend/CallMeBot integrations; that was deliberately ripped
  out in favor of a plain `wa.me` link in `components/BookingModal.tsx`. If
  you see a reference to Notion/Discord bots elsewhere (old docs, memory),
  it's stale — don't rebuild it without being asked.
- **Don't hand-edit `public/work/` filenames casually** — genre/event
  routing and titles are derived from the directory names themselves
  (`toTitle()` in `lib/works.ts`), so renaming a folder changes its URL and
  displayed title.
- **This repo pushes directly to `master`**, which Vercel auto-deploys from
  — there's no staging branch or PR gate in this workflow. Be correspondingly
  careful: build locally before pushing, and don't push half-finished work.
- `docs/superpowers/` holds specs/plans from earlier feature work done via a
  structured brainstorming process — useful history, not living
  documentation; don't treat it as current source of truth over the code.
- `scripts/generate-placeholders.mjs` is only for generating throwaway
  placeholder JPEGs (e.g. for a sanitized template repo) — it's not part of
  the build and doesn't run automatically.
