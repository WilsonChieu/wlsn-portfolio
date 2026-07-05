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

// Loader timing — all in one place so the exit sequence can be tuned without
// hunting through Loader.tsx. Ms-suffixed values feed setTimeout/rAF math;
// unsuffixed values are Framer Motion durations in seconds.
export const loaderCountDurationMs = 1600;
export const loaderHoldMs = 300;
export const loaderContentExitDuration = 0.35;
export const doorDuration = 1.1;
export const doorEase = easeLoader;

// Post-loader entrance sync (Hero/Nav). Only applied when the intro actually
// played — on repeat visits (loader skipped via sessionStorage) there's no
// door animation to sync against, so these delays are skipped entirely.
export const heroStartDelay = loaderContentExitDuration;
export const navRevealDelay = 0.9;

// Genre panels (Selected Work section)
export const panelExpandDuration = 0.7;
export const panelContentSwapDuration = 0.4;
