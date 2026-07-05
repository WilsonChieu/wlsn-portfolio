"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { fadeUp, easeStandard, panelExpandDuration, panelContentSwapDuration } from "@/lib/motion";
import { useReducedMotion } from "@/lib/useReducedMotion";

const PANELS = [
  {
    label: "CONCERTS",
    image: "/work/concerts.jpg",
    meta: "LIVE SETS · SHOT FROM THE PIT",
  },
  {
    label: "GRADUATIONS",
    image: "/work/graduations.jpg",
    meta: "CAPS, GOWNS, THE TOGA TOSS",
  },
  {
    label: "TALKS",
    image: "/work/talks.jpg",
    meta: "SPEAKERS MID-GESTURE",
  },
  {
    label: "WORKSHOPS",
    image: "/work/workshops.jpg",
    meta: "HANDS-ON, UP CLOSE",
  },
];

const ACTIVE_GROW = 3.5;
const MIN_PANEL_SIZE = 80;

export default function WorkList() {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function focusPanel(index: number) {
    const buttons = containerRef.current?.querySelectorAll("button");
    (buttons?.[index] as HTMLButtonElement | undefined)?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const next = (index + 1) % PANELS.length;
      setActiveIndex(next);
      focusPanel(next);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const prev = (index - 1 + PANELS.length) % PANELS.length;
      setActiveIndex(prev);
      focusPanel(prev);
    }
  }

  return (
    <section id="work" className="relative">
      <motion.p
        className="px-6 pt-24 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50 md:px-12 md:pt-32"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        01 — The Proof
      </motion.p>

      <div
        ref={containerRef}
        onMouseLeave={() => setActiveIndex(0)}
        className="mt-8 flex h-[100svh] flex-col gap-[2px] bg-line md:flex-row"
      >
        {PANELS.map((panel, index) => {
          const isActive = activeIndex === index;
          return (
            <motion.button
              key={panel.label}
              type="button"
              aria-pressed={isActive}
              aria-label={panel.label}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className="focus-ring group relative flex overflow-hidden bg-ink text-left"
              style={{ flexBasis: 0, minWidth: MIN_PANEL_SIZE, minHeight: MIN_PANEL_SIZE }}
              animate={{ flexGrow: isActive ? ACTIVE_GROW : 1 }}
              transition={{ duration: reducedMotion ? 0 : panelExpandDuration, ease: easeStandard }}
            >
              <motion.div
                className="absolute inset-0"
                animate={{ scale: reducedMotion ? 1 : isActive ? 1 : 1.08 }}
                transition={{ duration: reducedMotion ? 0 : panelExpandDuration, ease: easeStandard }}
              >
                <Image
                  src={panel.image}
                  alt={panel.label}
                  fill
                  className="object-cover transition-[filter] duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
                  style={{ filter: isActive ? "grayscale(0)" : "grayscale(1) brightness(0.75)" }}
                  sizes="(min-width: 768px) 60vw, 100vw"
                />
              </motion.div>

              <div className="pointer-events-none absolute inset-0 bg-ink/25" aria-hidden />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-olive/10 via-transparent to-transparent transition-opacity duration-700"
                style={{ opacity: isActive ? 1 : 0 }}
                aria-hidden
              />

              <span className="absolute left-3 top-3 font-mono text-[10px] uppercase text-paper/40 md:left-4 md:top-4">
                F/{String(index + 1).padStart(2, "0")}
              </span>

              {/* Collapsed label: on mobile the band is short (flexGrow controls
                  height there), so a vertical label would need far more room
                  than the band has — it runs horizontally bottom-left instead,
                  like a dim preview of the active title. Desktop bands stay
                  full-height (flexGrow controls width instead), so the classic
                  vertical-rl treatment fits fine there. */}
              <span
                className="absolute inset-0 flex items-end justify-start whitespace-nowrap p-4 font-display text-lg font-bold uppercase tracking-wide text-paper transition-opacity md:items-center md:justify-center md:p-0 md:text-2xl md:tracking-widest md:[writing-mode:vertical-rl]"
                style={{
                  opacity: isActive ? 0 : 1,
                  transitionDuration: `${panelContentSwapDuration * 1000}ms`,
                }}
              >
                {panel.label}
              </span>

              <div
                className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6 transition-all md:p-10"
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: isActive || reducedMotion ? "translateY(0)" : "translateY(8px)",
                  transitionDuration: `${panelContentSwapDuration * 1000}ms`,
                }}
              >
                <h3 className="font-display text-3xl font-bold uppercase leading-[0.95] text-paper md:text-5xl">
                  {panel.label}
                </h3>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper/70">
                  {panel.meta}
                </p>
                <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-olive-soft">
                  View →
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
