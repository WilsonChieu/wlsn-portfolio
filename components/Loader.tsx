"use client";

import { useEffect, useRef, useState } from "react";
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
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alreadySeen = sessionStorage.getItem(SESSION_KEY) === "true";
    if (alreadySeen || reducedMotion) {
      setVisible(false);
      markComplete();
      setReady(true);
      return;
    }
    setReady(true);

    // Measure elapsed time from the first *painted* frame, not from this
    // synchronous effect call — on slower devices, mounting every other
    // section's client component competes for the main thread right here,
    // so a performance.now() captured now can already be well behind the
    // clock rAF timestamps use, making the animation appear to skip straight
    // to its end.
    let start: number | null = null;
    let frame: number;

    function tick(now: number) {
      if (start === null) start = now;
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / COUNT_DURATION_MS);
      const value = Math.round(progress * 100);
      if (countRef.current) countRef.current.textContent = String(value);
      if (barRef.current) barRef.current.style.width = `${value}%`;
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
              className="font-display text-[12vw] font-bold uppercase leading-[0.9] text-paper md:text-[8vw]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, ease: easeLoader }}
            >
              CRISPTAKES
            </motion.h1>
          </div>

          <div className="flex items-end justify-between">
            <span
              ref={countRef}
              className="font-display text-[18vw] font-bold leading-none text-paper md:text-[10vw]"
            >
              0
            </span>
            <div className="h-px w-1/2 bg-paper/20 md:w-1/3">
              <div ref={barRef} className="h-full bg-olive" style={{ width: "0%" }} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
