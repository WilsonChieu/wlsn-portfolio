"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useLoaderComplete } from "./LoaderContext";
import { lineReveal, easeStandard } from "@/lib/motion";

export default function Featured() {
  const loaderComplete = useLoaderComplete();

  return (
    <section
      id="hero"
      className="relative flex h-screen w-full flex-col justify-center overflow-hidden bg-gradient-to-br from-ink via-ink to-[#222319]"
    >
      {/* Photo, capped at its native resolution so it's never upscaled —
          on screens larger than the source image, the gradient behind it
          shows through at the edges instead of a stretched, blurry photo. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-full w-full max-w-[2400px] max-h-[1600px]">
          <Image
            src="/work/concerts/off-the-track/off-the-track.jpg"
            alt="Off The Track — pit shot from the live set"
            fill
            className="object-cover"
            sizes="(max-width: 2400px) 100vw, 2400px"
            quality={90}
            priority={true}
          />
        </div>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-ink/40" aria-hidden />

      {/* Bottom gradient */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent"
        aria-hidden
      />

      {/* Hero content */}
      <div className="relative z-10 px-6 md:px-12">
        <h1 className="font-display font-bold uppercase leading-[0.9] text-[clamp(58px,13vw,190px)]">
          <span className="block overflow-hidden">
            <motion.span
              className="block text-paper"
              variants={lineReveal}
              initial="hidden"
              animate={loaderComplete ? "visible" : "hidden"}
            >
              WLSN
            </motion.span>
          </span>
          <span className="block overflow-hidden">
            <motion.span
              className="text-outline-paper block"
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
          className="mt-8 max-w-md font-body text-base text-paper/80 md:text-lg"
          initial={{ opacity: 0, y: 16 }}
          animate={loaderComplete ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: easeStandard, delay: 0.4 }}
        >
          Wilson. Event &amp; concert photographer — talks, workshops, graduations, and live sets.
        </motion.p>

        <motion.div
          className="mt-16 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-paper/60"
          initial={{ opacity: 0 }}
          animate={loaderComplete ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <span>Scroll</span>
          <span className="relative h-10 w-px overflow-hidden bg-paper/20">
            <motion.span
              className="absolute inset-x-0 top-0 h-1/2 bg-olive-soft"
              animate={{ y: ["-100%", "200%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </span>
        </motion.div>
      </div>

      {/* Featured label bottom-right */}
      <motion.div
        className="absolute bottom-0 right-0 z-10 flex flex-col gap-1 p-6 text-right md:p-12"
        initial={{ opacity: 0 }}
        animate={loaderComplete ? { opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.7 }}
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/50">
          Latest — 02
        </span>
        <span className="font-display text-2xl font-bold uppercase text-paper/90 md:text-3xl">
          Off The Track
        </span>
      </motion.div>
    </section>
  );
}
