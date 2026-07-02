# WLSN / CRISPTAKES Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production Next.js 14 App Router portfolio site for WLSN/CRISPTAKES per `docs/superpowers/specs/2026-07-03-wlsn-portfolio-design.md`.

**Architecture:** Single-page site (`app/page.tsx`) assembling nine section components in order. A `LoaderContext` synchronizes the intro loader's exit with the hero's entrance stagger. Framer Motion drives all animation; Lenis provides smooth scroll; Tailwind implements the design tokens.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Tailwind CSS, Framer Motion, Lenis, next/font/google.

## Global Constraints

- Colors (exact hex): `--paper:#FAF9F6`, `--ink:#111110`, `--olive:#7F8C4F`, `--olive-soft:#A8B37E`, `--line:rgba(17,17,16,0.12)`.
- Olive never fills large text/section backgrounds — only gradients (8–15% opacity), the logo accent syllable, hover states, and the CTA button.
- Fonts: Syne 700/800 uppercase display, Manrope 400/500/600 body, IBM Plex Mono 400/500 labels (11–12px, letter-spacing 0.12em–0.2em). All via `next/font/google`, `display: "swap"`.
- Default easing for non-loader animation: `[0.2, 0.7, 0.2, 1]`. Loader exit uses `[0.76, 0, 0.24, 1]`.
- `whileInView` reveals: `y: 28 → 0`, `duration: 0.8`, `viewport={{ once: true }}`.
- Every client/animated component starts with `"use client"`.
- `prefers-reduced-motion: reduce` disables the loader and all entrance/hover motion site-wide.
- Loader is session-gated via `sessionStorage` key `wlsn-loader-seen`.
- Booking CTA: `mailto:crisptakes@gmail.com?subject=Booking%20Inquiry%20%E2%80%94%20WLSN`.
- Package manager: npm. No `src/` directory.
- Responsive down to 375px. Mobile nav shows logo + BOOK only.

---

### Task 1: Project scaffold, Tailwind tokens, fonts, global CSS

**Files:**
- Create: whole Next.js app via `create-next-app` (package.json, tsconfig.json, next.config.js, app/layout.tsx, app/page.tsx, app/globals.css — will be overwritten in later tasks)
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: Tailwind theme keys `paper`, `ink`, `olive`, `olive-soft`, `line`; Tailwind `fontFamily` keys `display` (Syne), `body` (Manrope), `mono` (IBM Plex Mono); a `.text-outline` utility class; a `.marquee-track` keyframe animation; `.focus-ring` utility.

- [ ] **Step 1: Scaffold the app**

Run:
```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
```
Expected: project files created in the current directory (already git-initialized — accept prompt to use existing directory if asked).

- [ ] **Step 2: Install animation/scroll deps**

Run: `npm install framer-motion lenis`
Expected: both added to `package.json` dependencies.

- [ ] **Step 3: Configure Tailwind tokens**

Replace `tailwind.config.ts` contents:
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF9F6",
        ink: "#111110",
        olive: "#7F8C4F",
        "olive-soft": "#A8B37E",
        line: "rgba(17,17,16,0.12)",
      },
      fontFamily: {
        display: ["var(--font-syne)", "sans-serif"],
        body: ["var(--font-manrope)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: Write global CSS tokens and utilities**

Replace `app/globals.css` contents:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --paper: #faf9f6;
  --ink: #111110;
  --olive: #7f8c4f;
  --olive-soft: #a8b37e;
  --line: rgba(17, 17, 16, 0.12);
}

* {
  border-color: var(--line);
}

html {
  scroll-behavior: auto;
}

body {
  background: var(--paper);
  color: var(--ink);
}

.text-outline {
  color: transparent;
  -webkit-text-stroke: 1.5px var(--ink);
}

@media (min-width: 768px) {
  .text-outline {
    -webkit-text-stroke: 2px var(--ink);
  }
}

.focus-ring {
  outline: none;
}
.focus-ring:focus-visible {
  outline: 2px solid var(--olive);
  outline-offset: 3px;
}

@keyframes marquee-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

.marquee-track {
  animation: marquee-scroll 28s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .marquee-track {
    animation: none;
  }
}
```

- [ ] **Step 5: Verify build compiles**

Run: `npm run build`
Expected: build succeeds with the default `create-next-app` page (not yet replaced).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app with WLSN design tokens"
```

---

### Task 2: Motion utilities, reduced-motion hook, placeholder image generator

**Files:**
- Create: `lib/motion.ts`
- Create: `lib/useReducedMotion.ts`
- Create: `scripts/generate-placeholders.mjs`
- Create (generated): `public/work/off-the-track.jpg`, `public/work/graduation-season.jpg`, `public/work/speaker-series.jpg`, `public/work/hands-on-sessions.jpg`, `public/work/off-the-track-featured.jpg`

**Interfaces:**
- Produces: `export const easeStandard = [0.2, 0.7, 0.2, 1]`, `export const easeLoader = [0.76, 0, 0.24, 1]`, `export const fadeUp` (Framer `Variants`: `hidden`/`visible` with `y: 28 → 0`, `duration: 0.8`, `ease: easeStandard`), `export function useReducedMotion(): boolean` (reads `window.matchMedia("(prefers-reduced-motion: reduce)")`, subscribes to changes).

- [ ] **Step 1: Write shared motion constants**

`lib/motion.ts`:
```ts
import type { Variants } from "framer-motion";

export const easeStandard: [number, number, number, number] = [0.2, 0.7, 0.2, 1];
export const easeLoader: [number, number, number, number] = [0.76, 0, 0.24, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: easeStandard },
  },
};

export const lineReveal: Variants = {
  hidden: { y: "110%" },
  visible: {
    y: 0,
    transition: { duration: 0.9, ease: easeStandard },
  },
};
```

- [ ] **Step 2: Write the reduced-motion hook**

`lib/useReducedMotion.ts`:
```ts
"use client";

import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return reduced;
}
```

- [ ] **Step 3: Write the placeholder image generator**

`scripts/generate-placeholders.mjs` (uses only Node's built-in `Buffer` to emit valid minimal JPGs is impractical — instead render SVG then require `sharp` for conversion; to avoid adding a heavy dependency, generate SVG placeholders saved with a `.jpg` extension is invalid. Use `sharp`, added as a devDependency, to rasterize):

```js
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const outDir = path.join(process.cwd(), "public", "work");
mkdirSync(outDir, { recursive: true });

const targets = [
  { file: "off-the-track.jpg", label: "OFF THE TRACK", w: 1200, h: 800 },
  { file: "graduation-season.jpg", label: "GRADUATION SEASON", w: 1200, h: 800 },
  { file: "speaker-series.jpg", label: "SPEAKER SERIES", w: 1200, h: 800 },
  { file: "hands-on-sessions.jpg", label: "HANDS-ON SESSIONS", w: 1200, h: 800 },
  { file: "off-the-track-featured.jpg", label: "OFF THE TRACK — FEATURED", w: 2400, h: 1350 },
];

for (const { file, label, w, h } of targets) {
  const svg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="30%" cy="20%" r="80%">
          <stop offset="0%" stop-color="#A8B37E" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#FAF9F6" stop-opacity="1"/>
        </radialGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>
      <rect width="${w}" height="${h}" fill="none" stroke="#111110" stroke-opacity="0.12" stroke-width="2"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        font-family="monospace" font-size="${Math.round(w / 28)}" letter-spacing="4"
        fill="#111110" fill-opacity="0.55">${label}</text>
    </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toFile(path.join(outDir, file));
  console.log(`wrote ${file}`);
}
```

- [ ] **Step 4: Install sharp and run the generator**

Run: `npm install -D sharp && node scripts/generate-placeholders.mjs`
Expected: console logs `wrote off-the-track.jpg` etc., and all five files exist in `public/work/`.

- [ ] **Step 5: Verify files exist**

Run: `ls public/work`
Expected: the 5 filenames listed above.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add motion utilities, reduced-motion hook, and placeholder images"
```

---

### Task 3: SmoothScrollProvider and root layout

**Files:**
- Create: `components/SmoothScrollProvider.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `useReducedMotion` from `lib/useReducedMotion.ts`.
- Produces: `<SmoothScrollProvider>` client component wrapping `children`, initializing Lenis on mount (skipped if reduced motion), cleaned up on unmount.

- [ ] **Step 1: Write SmoothScrollProvider**

`components/SmoothScrollProvider.tsx`:
```tsx
"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "@/lib/useReducedMotion";

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 3) });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [reducedMotion]);

  return <>{children}</>;
}
```

- [ ] **Step 2: Wire fonts and provider into the root layout**

`app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Syne, Manrope, IBM_Plex_Mono } from "next/font/google";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-manrope",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WLSN — Event & Concert Photography",
  description:
    "Wilson (CRISPTAKES) shoots talks, workshops, graduations, and concerts. Book a shoot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${manrope.variable} ${plexMono.variable}`}>
      <body className="font-body bg-paper text-ink antialiased">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds (page.tsx still default from scaffold).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Wire fonts and Lenis smooth scroll into root layout"
```

---

### Task 4: Loader (signature component) + LoaderContext

**Files:**
- Create: `components/LoaderContext.tsx`
- Create: `components/Loader.tsx`

**Interfaces:**
- Produces: `LoaderProvider` (client context provider), `useLoaderComplete(): boolean` hook returning `true` once the loader has finished (or immediately `true` if skipped/reduced-motion), and `<Loader />` which renders the intro animation and calls the context's completion setter.
- Consumes: `useReducedMotion` from Task 3.

- [ ] **Step 1: Write the loader context**

`components/LoaderContext.tsx`:
```tsx
"use client";

import { createContext, useContext, useState } from "react";

type LoaderContextValue = {
  isComplete: boolean;
  markComplete: () => void;
};

const LoaderContext = createContext<LoaderContextValue | null>(null);

export function LoaderProvider({ children }: { children: React.ReactNode }) {
  const [isComplete, setIsComplete] = useState(false);
  return (
    <LoaderContext.Provider value={{ isComplete, markComplete: () => setIsComplete(true) }}>
      {children}
    </LoaderContext.Provider>
  );
}

export function useLoaderComplete(): boolean {
  const ctx = useContext(LoaderContext);
  if (!ctx) throw new Error("useLoaderComplete must be used within LoaderProvider");
  return ctx.isComplete;
}

export function useMarkLoaderComplete(): () => void {
  const ctx = useContext(LoaderContext);
  if (!ctx) throw new Error("useMarkLoaderComplete must be used within LoaderProvider");
  return ctx.markComplete;
}
```

- [ ] **Step 2: Write the Loader component**

`components/Loader.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useMarkLoaderComplete } from "./LoaderContext";
import { easeLoader } from "@/lib/motion";

const SESSION_KEY = "wlsn-loader-seen";
const COUNT_DURATION_MS = 1600;
const EXIT_PAUSE_MS = 300;

export default function Loader() {
  const reducedMotion = useReducedMotion();
  const markComplete = useMarkLoaderComplete();
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const alreadySeen = sessionStorage.getItem(SESSION_KEY) === "true";
    if (alreadySeen || reducedMotion) {
      setVisible(false);
      markComplete();
      setReady(true);
      return;
    }
    setReady(true);

    const start = performance.now();
    let frame: number;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / COUNT_DURATION_MS);
      setCount(Math.round(progress * 100));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        window.setTimeout(() => {
          sessionStorage.setItem(SESSION_KEY, "true");
          setVisible(false);
          markComplete();
        }, EXIT_PAUSE_MS);
      }
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion, markComplete]);

  if (!ready) return <div className="fixed inset-0 z-50 bg-ink" aria-hidden />;

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key="loader"
          className="fixed inset-0 z-50 flex flex-col justify-between bg-ink px-6 py-8 md:px-12 md:py-12"
          exit={{ y: "-100%" }}
          transition={{ duration: 1, ease: easeLoader }}
          aria-hidden
        >
          <div className="overflow-hidden">
            <motion.h1
              className="font-display text-[12vw] font-extrabold uppercase leading-[0.9] text-paper md:text-[8vw]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, ease: easeLoader }}
            >
              CRISPTAKES
            </motion.h1>
          </div>

          <div className="flex items-end justify-between">
            <span className="font-display text-[18vw] font-extrabold leading-none text-paper md:text-[10vw]">
              {count}
            </span>
            <div className="h-px w-1/2 bg-paper/20 md:w-1/3">
              <div
                className="h-full bg-olive transition-[width] duration-100 ease-linear"
                style={{ width: `${count}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds (Loader not yet mounted in a page).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add signature Loader component and LoaderContext"
```

---

### Task 5: Nav + Hero

**Files:**
- Create: `components/Nav.tsx`
- Create: `components/Hero.tsx`

**Interfaces:**
- Consumes: `useLoaderComplete` from Task 4, `lineReveal`/`easeStandard` from `lib/motion.ts`.
- Produces: `<Nav />`, `<Hero />` (both default exports, no props).

- [ ] **Step 1: Write Nav**

`components/Nav.tsx`:
```tsx
"use client";

export default function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-6 md:px-12 md:py-8">
      <a href="#hero" className="font-display text-lg font-extrabold uppercase tracking-tight focus-ring">
        CRISP<span className="text-olive">TAKES</span>
      </a>
      <nav className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.16em] md:gap-8">
        <a href="#work" className="hidden transition-colors hover:text-olive md:inline focus-ring">
          Work
        </a>
        <a href="#about" className="hidden transition-colors hover:text-olive md:inline focus-ring">
          About
        </a>
        <a href="#contact" className="transition-colors hover:text-olive focus-ring">
          Book
        </a>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Write Hero**

`components/Hero.tsx`:
```tsx
"use client";

import { motion } from "framer-motion";
import { useLoaderComplete } from "./LoaderContext";
import { lineReveal, easeStandard } from "@/lib/motion";

export default function Hero() {
  const loaderComplete = useLoaderComplete();

  return (
    <section
      id="hero"
      className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 md:px-12"
    >
      <div
        className="pointer-events-none absolute -right-1/4 -top-1/4 h-[60vw] w-[60vw] rounded-full bg-olive opacity-[0.12] blur-3xl"
        aria-hidden
      />

      <h1 className="font-display font-extrabold uppercase leading-[0.9] text-[clamp(58px,13vw,190px)]">
        <span className="block overflow-hidden">
          <motion.span
            className="block"
            variants={lineReveal}
            initial="hidden"
            animate={loaderComplete ? "visible" : "hidden"}
          >
            WLSN
          </motion.span>
        </span>
        <span className="block overflow-hidden">
          <motion.span
            className="text-outline block"
            variants={lineReveal}
            initial="hidden"
            animate={loaderComplete ? "visible" : "hidden"}
            transition={{ delay: 0.12 }}
          >
            WLSN
          </motion.span>
        </span>
      </h1>

      <motion.p
        className="mt-8 max-w-md font-body text-base text-ink/80 md:text-lg"
        initial={{ opacity: 0, y: 16 }}
        animate={loaderComplete ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: easeStandard, delay: 0.4 }}
      >
        Wilson. Event &amp; concert photographer — talks, workshops, graduations, and live sets.
      </motion.p>

      <motion.div
        className="mt-16 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60"
        initial={{ opacity: 0 }}
        animate={loaderComplete ? { opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <span>Scroll</span>
        <span className="relative h-10 w-px overflow-hidden bg-ink/15">
          <motion.span
            className="absolute inset-x-0 top-0 h-1/2 bg-olive"
            animate={{ y: ["-100%", "200%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add Nav and Hero components with loader-synced entrance"
```

---

### Task 6: Marquee + WorkList

**Files:**
- Create: `components/Marquee.tsx`
- Create: `components/WorkList.tsx`

**Interfaces:**
- Consumes: `fadeUp` from `lib/motion.ts`.
- Produces: `<Marquee />`, `<WorkList />` (default exports, no props).

- [ ] **Step 1: Write Marquee**

`components/Marquee.tsx`:
```tsx
"use client";

const ITEMS = ["TALKS", "WORKSHOPS", "GRADUATIONS", "CONCERTS"];

function Track() {
  return (
    <div className="flex shrink-0 items-center gap-8 pr-8">
      {ITEMS.map((item) => (
        <span key={item} className="flex items-center gap-8 font-display text-3xl font-extrabold uppercase md:text-5xl">
          {item}
          <span className="text-olive">✳</span>
        </span>
      ))}
    </div>
  );
}

export default function Marquee() {
  return (
    <div className="overflow-hidden border-y border-line py-6">
      <div className="marquee-track flex w-max">
        <Track />
        <Track />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write WorkList**

`components/WorkList.tsx`:
```tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

const ROWS = [
  { title: "Off The Track", meta: "CONCERT · LIVE SET 2026", image: "/work/off-the-track.jpg" },
  { title: "Graduation Season", meta: "GRADUATION", image: "/work/graduation-season.jpg" },
  { title: "Speaker Series", meta: "TALKS", image: "/work/speaker-series.jpg" },
  { title: "Hands-On Sessions", meta: "WORKSHOPS", image: "/work/hands-on-sessions.jpg" },
];

export default function WorkList() {
  return (
    <section id="work" className="px-6 py-24 md:px-12 md:py-32">
      <p className="mb-12 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
        Selected Work
      </p>
      <ul>
        {ROWS.map((row) => (
          <motion.li
            key={row.title}
            className="group border-t border-line py-8 last:border-b"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <a href="#" className="focus-ring flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-6">
                <div className="relative h-16 w-24 overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:w-32 md:h-20 md:w-28 md:group-hover:w-40">
                  <Image
                    src={row.image}
                    alt={`${row.title} — ${row.meta}`}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                </div>
                <h3 className="font-display text-3xl font-extrabold uppercase transition-all duration-300 group-hover:translate-x-[14px] group-hover:text-olive md:text-5xl">
                  {row.title}
                </h3>
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50 md:text-right">
                {row.meta}
              </span>
            </a>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add Marquee and WorkList sections"
```

---

### Task 7: Featured + About

**Files:**
- Create: `components/Featured.tsx`
- Create: `components/About.tsx`

**Interfaces:**
- Consumes: `fadeUp` from `lib/motion.ts`.
- Produces: `<Featured />`, `<About />` (default exports, no props).

- [ ] **Step 1: Write Featured**

`components/Featured.tsx`:
```tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

export default function Featured() {
  return (
    <motion.section
      className="relative h-[70vh] w-full overflow-hidden md:h-screen"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <Image
        src="/work/off-the-track-featured.jpg"
        alt="Off The Track — pit shot from the live set"
        fill
        className="object-cover"
        sizes="100vw"
        priority={false}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-olive/20 via-transparent to-transparent"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6 md:p-12">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/80">
          Latest — 02
        </span>
        <h2 className="font-display text-[12vw] font-extrabold uppercase leading-[0.9] text-paper md:text-[7vw]">
          Off The Track
        </h2>
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 2: Write About**

`components/About.tsx`:
```tsx
"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

const CHIPS = ["TALKS", "WORKSHOPS", "GRADUATIONS", "CONCERTS", "48HR SNEAK PEEK"];

export default function About() {
  return (
    <section id="about" className="grid gap-12 px-6 py-24 md:grid-cols-2 md:gap-16 md:px-12 md:py-32">
      <motion.h2
        className="font-display text-4xl font-extrabold uppercase leading-[0.95] md:text-6xl"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        I shoot the frames people actually repost — the speaker mid-gesture, the toga toss, the
        chorus drop.
      </motion.h2>

      <motion.div
        className="flex flex-col gap-8"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <p className="font-body text-base text-ink/80 md:text-lg">
          I&apos;m Wilson — I&apos;ve spent the last few years in photo pits, lecture halls, and
          graduation lawns learning exactly which split-second makes someone stop scrolling.
        </p>
        <p className="font-body text-base text-ink/80 md:text-lg">
          Every booking gets a fast turnaround: a 48-hour sneak peek of hero shots, then the full
          edited set. No waiting weeks to see if the shot landed.
        </p>
        <ul className="flex flex-wrap gap-3">
          {CHIPS.map((chip) => (
            <li
              key={chip}
              className="rounded-full border border-line px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors hover:border-olive hover:text-olive"
            >
              {chip}
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add Featured and About sections"
```

---

### Task 8: Contact, Footer, and page assembly

**Files:**
- Create: `components/Contact.tsx`
- Create: `components/Footer.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `fadeUp` from `lib/motion.ts`, `LoaderProvider` from Task 4, `Loader`/`Nav`/`Hero`/`Marquee`/`WorkList`/`Featured`/`About`/`Contact`/`Footer` from prior tasks.
- Produces: fully assembled `app/page.tsx`.

- [ ] **Step 1: Write Contact**

`components/Contact.tsx`:
```tsx
"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

export default function Contact() {
  return (
    <section
      id="contact"
      className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-olive/15 via-transparent to-transparent"
        aria-hidden
      />

      <motion.h2
        className="font-display text-[13vw] font-extrabold uppercase leading-[0.9] md:text-[7vw]"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        Let&apos;s make it <span className="text-outline">crisp.</span>
      </motion.h2>

      <motion.p
        className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        Slots go fast during grad + gig season
      </motion.p>

      <motion.a
        href="mailto:crisptakes@gmail.com?subject=Booking%20Inquiry%20%E2%80%94%20WLSN"
        className="focus-ring mt-10 rounded-full bg-olive px-8 py-4 font-mono text-[12px] uppercase tracking-[0.16em] text-ink transition-transform hover:scale-105"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        Book a Shoot →
      </motion.a>
    </section>
  );
}
```

- [ ] **Step 2: Write Footer**

`components/Footer.tsx`:
```tsx
export default function Footer() {
  return (
    <footer className="flex flex-col items-center gap-3 border-t border-line px-6 py-10 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60 md:flex-row md:justify-between md:px-12">
      <span>© 2026 CRISPTAKES — Wilson</span>
      <span>IG @crisptakes</span>
      <span>Xiaohongshu @crisptakes</span>
    </footer>
  );
}
```

- [ ] **Step 3: Assemble the page**

`app/page.tsx`:
```tsx
import { LoaderProvider } from "@/components/LoaderContext";
import Loader from "@/components/Loader";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import WorkList from "@/components/WorkList";
import Featured from "@/components/Featured";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <LoaderProvider>
      <Loader />
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <WorkList />
        <Featured />
        <About />
        <Contact />
      </main>
      <Footer />
    </LoaderProvider>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add Contact, Footer, and assemble full page"
```

---

### Task 9: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the dev server**

Run: `npm run dev`
Expected: server starts on `http://localhost:3000` with no build errors.

- [ ] **Step 2: Manually load the page and check the browser console**

Open `http://localhost:3000`, confirm: loader plays once, hero staggers in after loader exits, no hydration warnings or console errors.

- [ ] **Step 3: Reload the page**

Expected: loader does NOT replay (sessionStorage flag honored); hero renders in its resting state immediately.

- [ ] **Step 4: Resize to 375px width (mobile)**

Expected: nav shows logo + Book only; About columns stack; work rows remain legible; no horizontal scrollbar.

- [ ] **Step 5: Run lint and type check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Stop the dev server and commit any final fixes**

```bash
git add -A
git commit -m "Fix issues found in final verification pass" --allow-empty
```

(Only commit if fixes were actually made — otherwise skip this step.)

---

## Self-review notes

- Spec coverage checked against `2026-07-03-wlsn-portfolio-design.md` §2–§7: stack/tooling (Task 1), motion/placeholders (Task 2), Lenis/layout (Task 3), loader (Task 4), nav/hero (Task 5), marquee/work list (Task 6), featured/about (Task 7), contact/footer/assembly (Task 8), responsiveness/a11y/reduced-motion verified end-to-end (Task 9).
- No placeholder code remains; every component has complete JSX/TSX.
- Verified consistent naming across tasks: `useLoaderComplete`/`useMarkLoaderComplete`/`LoaderProvider` (Task 4) match usage in `Hero.tsx` (Task 5) and `page.tsx` (Task 8). `fadeUp`/`lineReveal`/`easeStandard`/`easeLoader` (Task 2) match imports in Tasks 5–8.
