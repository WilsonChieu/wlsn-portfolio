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
              className="font-display text-[12vw] font-bold uppercase leading-[0.9] text-paper md:text-[8vw]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, ease: easeLoader }}
            >
              CRISPTAKES
            </motion.h1>
          </div>

          <div className="flex items-end justify-between">
            <span className="font-display text-[18vw] font-bold leading-none text-paper md:text-[10vw]">
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
