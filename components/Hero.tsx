"use client";

import { motion } from "framer-motion";
import { useLoaderComplete, useLoaderPlayedIntro } from "./LoaderContext";
import { lineReveal, easeStandard, heroStartDelay } from "@/lib/motion";

export default function Hero() {
  const loaderComplete = useLoaderComplete();
  const playedIntro = useLoaderPlayedIntro();
  const syncDelay = playedIntro ? heroStartDelay : 0;

  return (
    <section
      id="hero"
      className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 md:px-12"
    >
      <div
        className="pointer-events-none absolute -right-1/4 -top-1/4 h-[60vw] w-[60vw] rounded-full bg-olive opacity-[0.12] blur-3xl"
        aria-hidden
      />

      <h1 className="font-display font-bold uppercase leading-[0.9] text-[clamp(58px,13vw,190px)]">
        <span className="block overflow-hidden">
          <motion.span
            className="block"
            variants={lineReveal}
            initial="hidden"
            animate={loaderComplete ? "visible" : "hidden"}
            transition={{ duration: 0.9, ease: easeStandard, delay: syncDelay }}
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
            transition={{ duration: 0.9, ease: easeStandard, delay: syncDelay + 0.12 }}
          >
            WLSN
          </motion.span>
        </span>
      </h1>

      <motion.p
        className="mt-8 max-w-md font-body text-base text-ink/80 md:text-lg"
        initial={{ opacity: 0, y: 16 }}
        animate={loaderComplete ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: easeStandard, delay: syncDelay + 0.4 }}
      >
        Wilson. Event &amp; concert photographer — talks, workshops, graduations, and live sets.
      </motion.p>

      <motion.div
        className="mt-16 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60"
        initial={{ opacity: 0 }}
        animate={loaderComplete ? { opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: syncDelay + 0.6 }}
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
