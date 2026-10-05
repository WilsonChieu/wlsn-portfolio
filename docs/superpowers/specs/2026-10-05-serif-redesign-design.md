# Serif Editorial Redesign — Design Spec

Status: design agreed in chat with Wilson (2026-10-05); awaiting his review of this document.

Source: Claude Design handoff `Wilson's Photography Portfolio-handoff.zip` —
`CRISPTAKES Home.dc.html` (frames 3a desktop 1440, 3b mobile 390) and
`CRISPTAKES Work.dc.html` (desktop 1440, mobile 390). The prototypes are the visual source of truth;
this spec records what they don't settle and how they map onto the real data.

## 1. Goal & scope

Replace the public site's look (homepage, `/work/[genre]`, `/work/[genre]/[event]`) with the
"Serif Editorial" design. Functionality stays: same routes, same R2 data, same WhatsApp booking,
same admin. New behaviour that the design introduces is in scope: photo viewer, Editorial/Grid
toggle, "Next set", FAQ accordion, presets section (built, disabled).

Decisions (Wilson, 2026-10-05):

- **Presets for sale:** built but switched off (`PRESETS_ENABLED = false`); no shop exists yet.
- **Pages:** Home + both Work pages.
- **v1:** not kept on the site; the old design remains in git history only. Old public components
  (`Nav`, `Featured`, `Marquee`, `WorkList`, `About`, `Contact`, `Footer`, `Loader`,
  `LoaderContext`, `ScrollHeader`, `BookingModal` if unused) are deleted.
- **Socials:** Instagram `https://instagram.com/crisptakes`; Xiaohongshu shown as plain text
  "Xiaohongshu @crisptakes" until Wilson provides the profile URL.

Out of scope: admin UI (keeps its current look and tokens), a presets shop, SEO changes.

## 2. Visual system

- Colours (new Tailwind tokens + `:root` vars, kept in sync per CLAUDE.md; existing
  `paper/ink/olive/line` tokens stay for the admin):
  `bone #f3f2f2` (page), `char #201e1d` (text, rules, dark panels), `signal #ec3013` (accent),
  `signal-dark #b5230d` (small accent labels), `mute #4a4644` (secondary text),
  `well #e4e2e0` (image placeholders), `night #111110` (viewer background).
- Fonts via `next/font/google`: **Instrument Serif** 400 normal + italic (display and body),
  **JetBrains Mono** 400/500/600 (labels). Italic is the accent style.
- Rules are 1px `char`; selection colour `signal` on white.
- Pixel values come from the prototypes; between 390 and 1440 sizes scale with `clamp()` so
  nothing overflows horizontally at any width.

## 3. Data mapping (no hard-coded content lists)

All lists come from `getGenres()` (R2 manifests):

- "N categories · M events" and each category row's meta (`{genre.meta} · {n} events`).
- Selected-work row backgrounds: the category cover.
- **Hero slideshow frames:** up to 6 shoots, picked round-robin across categories in manifest order
  (category 1 shoot 1, category 2 shoot 1, …), using each shoot's cover. Label
  `Frame 0k / 0N` + shoot title; clicking opens that shoot. The top-right hero label shows the
  **featured shoot** constant (`concerts/off-the-track`, as today) if it exists, else the first frame.
- **Editorial rows** *(superseded 2026-10-05: Wilson preferred a plain masonry — CSS columns 1/2/3, natural aspect ratios, no counter labels; the row algorithm was removed)*: the prototype's `deskRows` / `mobRows` algorithm, with each photo classified
  `P` (portrait, `height > width`) or `L` from the manifest's native dimensions. Hidden (cover-only)
  photos are excluded, as today.
- **Next set:** the next shoot in category order, then across categories, wrapping to the first.
- Static copy (hero line, marquee, about, FAQ, presets, socials, CTA) lives in one file,
  `lib/site-content.ts`.

## 4. Homepage

Sections in prototype order: header (CRISPTAKES · Work · FAQ · Book a shoot →; "Presets" link
only when enabled) → hero → marquee → Selected work → About → Presets (if enabled) → FAQ → red CTA
+ footer.

- **Intro ("developing")**: full-viewport dark overlay, mono label "CRISPTAKES — developing",
  italic counter 000→100 over 1.2 s, red seam draws across, halves split apart (1.1 s), letters of
  *Crisp* / *takes* rise with 50 ms stagger, photo window opens via `clip-path`, fades stagger in.
  Timings/easings exactly as in the prototype's `intro()`. Plays once per browser session
  (sessionStorage, like today's loader); later visits render the settled state immediately.
- **Slideshow:** after the intro, every 2.6 s the next frame wipes up over the current one
  (prototype timings). Pauses while the tab is hidden.
- **Selected work rows:** desktop hover = background photo fades in with the right-fading mask,
  title turns italic + bone + 14px shift (existing behaviour, restyled). Mobile = stacked cards
  with 3:2 image.
- **Custom cursor + halftone trail:** desktop only (`(hover: hover) and (pointer: fine)`), whole
  page. Red dot follows with easing; grows to an 84px "View" disc over clickable photos/rows.
  Trail is a canvas of fading red dots (prototype parameters). Native cursor hidden only while
  this is active.
- **FAQ:** one item open at a time; `<button>` with `aria-expanded`.
- **Presets (disabled):** before/after drag slider (pointer + touch), three presets selectable,
  "Buy {name} →" button; `PRESETS_ENABLED` and per-preset `buyUrl` in `lib/site-content.ts`.

## 5. Work pages

- **Header (both pages):** sticky; CRISPTAKES (→ `/`) · category tabs (current one red italic)
  · "← All work" (category page) or "← {Category}" (shoot page). Tabs are links to
  `/work/{slug}`.
- **Category page:** big title + `{meta} · {n} events`; shoots alternate cover-left / cover-right
  on a 12-column grid (desktop); hover scales the cover 1.04 and turns the title red italic.
  Mobile: 4:5 covers stacked, tabs row under the title.
- **Shoot page:** title + `{Category} · {n} photos`; Editorial / Grid pill toggle (Editorial
  default; choice remembered for the visit); Editorial rows (§3) or a 6-column (mobile 3-column)
  square grid; "Next set →" block; footer.
- **Viewer:** opens on photo click; full-screen `night` background, `contain` image at 1920
  (mobile 1280), counter `07 / 40`, Close ✕. Desktop: ←/→ keys, Esc, half-screen click zones,
  9-thumbnail strip. Mobile: swipe (> 40 px) and round ← → buttons. The open photo is reflected in
  the URL as `?photo=<id>` (shareable; Back closes it). Body scroll and smooth-scroll are locked
  while open; focus moves into the viewer and returns to the photo on close.

## 6. Accessibility & robustness

- `prefers-reduced-motion`: no intro, no trail/custom cursor, no slideshow animation (frames still
  change without transition), no hover scaling.
- All interactive elements are real links/buttons with the shared `.focus-ring`.
- Images keep the existing R2 custom loader with correct `sizes`; viewer neighbours are preloaded.
- Empty states: a category with no shoots shows "No shoots yet"; a shoot with no visible photos
  shows its title and "No photos yet" (fixes the deferred blank-hero minor).

## 7. Testing

- Vitest for pure logic in `lib/`: editorial row builders (desktop + mobile), P/L classification,
  slideshow frame selection, next-set computation, viewer index stepping/wrap, counts/labels.
- `npm run build` + browser checks at 1440 and 390 (and one mid width ~900): intro once per
  session, reduced-motion path, hover states, viewer keys/swipe/URL, no horizontal scroll,
  all images load from R2.
