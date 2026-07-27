# WLSN / CRISPTAKES Photography Portfolio — Design Spec

Status: approved by client brief (Wilson), technical decisions below need a quick nod before implementation.

## 1. Summary

A single-page, full-screen-section Next.js 14 (App Router) marketing/portfolio site for Wilson, an
event & concert photographer (brand: WLSN / wordmark CRISPTAKES). Goal: convert a visitor into a
booking inquiry via a mailto CTA. White-dominant editorial design, one signature loader animation,
otherwise restrained motion. Deploys to Vercel.

The full creative brief (colors, type, copy, section-by-section layout, animation timing) was
provided verbatim by the client and is treated as final — not open for re-design. This spec exists
to pin down the *technical* decisions needed to implement that brief correctly and repeatably.

## 2. Stack & tooling decisions

- **Next.js 14**, App Router, **TypeScript**, no `src/` dir (root `app/`, `components/`, `lib/`) — keeps this small single-page site's import paths short.
- **Package manager: npm** (matches Vercel's zero-config default).
- **Tailwind CSS** with design tokens (`--paper`, `--ink`, `--olive`, `--olive-soft`, `--line`) wired into `tailwind.config.ts` as `theme.extend.colors`, plus CSS custom properties in `globals.css` for use in raw gradients.
- **Framer Motion** for all entrance/hover animation.
- **Lenis** for smooth scroll, wrapped in a client `SmoothScrollProvider` that no-ops under `prefers-reduced-motion`.
- Fonts via `next/font/google`: `Syne` (700/800), `Manrope` (400/500/600), `IBM_Plex_Mono` (400/500) — all `display: "swap"`, exposed as CSS variables consumed by Tailwind `fontFamily`.

## 3. File/component structure

```
app/
  layout.tsx        — fonts, metadata, SmoothScrollProvider, Loader mount
  page.tsx           — assembles all sections in order
  globals.css        — tokens, base styles, marquee keyframes, outlined-text utility
components/
  Loader.tsx         — session-gated intro animation (client)
  Nav.tsx            — fixed transparent nav (client, for scroll-linked style if needed)
  Hero.tsx           — headline, intro line, scroll cue (client, staggered entrance)
  Marquee.tsx        — infinite CSS-driven strip (client not required, but kept client for consistency)
  WorkList.tsx        — editorial row list w/ whileInView reveals (client)
  Featured.tsx       — full-bleed "Off The Track" panel (client)
  About.tsx          — two-column statement + chips (client)
  Contact.tsx        — CTA section (client)
  Footer.tsx         — hairline footer (server ok, no motion)
  SmoothScrollProvider.tsx — Lenis wrapper (client)
lib/
  motion.ts          — shared easing/variants constants
public/
  work/              — placeholder images, see §5
```

## 4. Loader behavior

- Session-gated via `sessionStorage.getItem("wlsn-loader-seen")`. Set on mount after the exit animation completes.
- Sequence: counter 0→100 tied to a `setInterval`/`requestAnimationFrame` loop (~1.6s total) driving both the numeral and an olive progress bar → 300ms pause at 100 → panel slides up (`y: "-100%"`, `duration: 1`, `ease: [0.76, 0, 0.24, 1]`) → unmounts via `AnimatePresence mode="wait"`.
- Hero headline lines are always rendered but visually pinned at `y: "110%"` inside `overflow-hidden` wrappers; they animate to `y: 0` only *after* the loader reports completion (lifted via a small callback/context, not a hard timer, so hero entrance and loader exit stay in sync).
- `prefers-reduced-motion: reduce` → loader is skipped entirely (treated as already-seen) and hero renders in its final state with no stagger.
- Returning visitors (flag present) skip the loader on mount with no flash — checked in a `useEffect` before first paint via a `visibility: hidden` guard on the loader root to avoid a flicker, then hero renders already in its resting state.

## 5. Placeholder images

Since real photos aren't available yet, `/public/work/` gets generated placeholder JPGs (paper/olive
gradient background + IBM Plex Mono filename label) so `next/image` never 404s during dev/preview.
Exact filenames (client will overwrite these 1:1 with real photos):

- `public/work/off-the-track.jpg` — 1200×800 (work list thumbnail, CONCERT · LIVE SET 2026)
- `public/work/graduation-season.jpg` — 1200×800 (GRADUATION)
- `public/work/speaker-series.jpg` — 1200×800 (EVENTS)
- `public/work/hands-on-sessions.jpg` — 1200×800 (WORKSHOPS)
- `public/work/off-the-track-featured.jpg` — 2400×1350 (full-bleed Featured panel, best pit shot)

## 6. Contact CTA

`mailto:crisptakes@gmail.com?subject=Booking%20Inquiry%20%E2%80%94%20WLSN` — placeholder business
address per client, easy to swap in `Contact.tsx`.

## 7. Responsiveness & a11y

- Breakpoints: mobile-first Tailwind (`sm`/`md`/`lg`), verified down to 375px width.
- Mobile nav: logo + BOOK only (WORK/ABOUT links hidden under `md:flex`).
- All interactive elements get visible focus rings (`focus-visible:outline` in olive); all `<Image>` usages take an explicit `alt` prop from the component's props, not hardcoded.
- `prefers-reduced-motion` respected globally via a shared `lib/motion.ts` check, not just on the loader.

## 8. Out of scope

- CMS / dynamic content — copy and image filenames are hardcoded per the brief.
- Multi-page routing, blog, analytics — none requested.
- Real photo optimization pipeline — client drops in final JPGs; Next/Image handles serving.

## Self-review notes

- No placeholders/TBDs remain — all filenames, copy, and the CTA email are concrete.
- Section 4 (loader/hero sync) resolves the one real ambiguity in the brief (loader exit timing vs.
  hero stagger start) by making the loader the source of truth via callback rather than a fixed delay
  guess, avoiding drift if animation timing is tuned later.
- Scope is a single cohesive site — no decomposition needed.
