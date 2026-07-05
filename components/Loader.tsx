"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMarkLoaderComplete } from "./LoaderContext";
import {
  easeLoader,
  easeStandard,
  doorDuration,
  doorEase,
  loaderCountDurationMs,
  loaderHoldMs,
  loaderContentExitDuration,
} from "@/lib/motion";

const SESSION_KEY = "wlsn-loader-seen";

export default function Loader() {
  const markComplete = useMarkLoaderComplete();
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [contentVisible, setContentVisible] = useState(true);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alreadySeen = sessionStorage.getItem(SESSION_KEY) === "true";
    if (alreadySeen) {
      setMounted(false);
      markComplete(false);
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
    let holdTimeout: ReturnType<typeof setTimeout>;
    let contentExitTimeout: ReturnType<typeof setTimeout>;

    function tick(now: number) {
      if (start === null) start = now;
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / loaderCountDurationMs);
      const value = Math.round(progress * 100);
      if (countRef.current) countRef.current.textContent = String(value);
      if (barRef.current) barRef.current.style.width = `${value}%`;
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        sessionStorage.setItem(SESSION_KEY, "true");
        holdTimeout = setTimeout(() => {
          setContentVisible(false);
          contentExitTimeout = setTimeout(() => {
            setDoorsOpen(true);
            markComplete(true);
          }, loaderContentExitDuration * 1000);
        }, loaderHoldMs);
      }
    }
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(holdTimeout);
      clearTimeout(contentExitTimeout);
    };
  }, [markComplete]);

  if (!ready) return <div className="fixed inset-0 z-50 bg-ink" aria-hidden />;

  return (
    <AnimatePresence>
      {mounted && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-hidden>
          <motion.div
            className="absolute inset-y-0 left-0 w-[calc(50%+1px)] border-r border-olive bg-ink"
            initial={{ x: "0%", boxShadow: "2px 0 28px rgba(127,140,79,0.35)" }}
            animate={{
              x: doorsOpen ? "-100%" : "0%",
              boxShadow: doorsOpen
                ? "2px 0 28px rgba(127,140,79,0)"
                : "2px 0 28px rgba(127,140,79,0.35)",
            }}
            transition={{ duration: doorDuration, ease: doorEase }}
          />
          <motion.div
            className="absolute inset-y-0 right-0 w-[calc(50%+1px)] border-l border-olive bg-ink"
            initial={{ x: "0%", boxShadow: "-2px 0 28px rgba(127,140,79,0.35)" }}
            animate={{
              x: doorsOpen ? "100%" : "0%",
              boxShadow: doorsOpen
                ? "-2px 0 28px rgba(127,140,79,0)"
                : "-2px 0 28px rgba(127,140,79,0.35)",
            }}
            transition={{ duration: doorDuration, ease: doorEase }}
            onAnimationComplete={() => {
              if (doorsOpen) setMounted(false);
            }}
          />

          <motion.div
            className="pointer-events-none absolute inset-0 flex flex-col justify-between px-6 py-8 md:px-12 md:py-12"
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: contentVisible ? 1 : 0, scale: contentVisible ? 1 : 0.98 }}
            transition={{ duration: loaderContentExitDuration, ease: easeStandard }}
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
        </div>
      )}
    </AnimatePresence>
  );
}
