"use client";

import { motion } from "framer-motion";
import { useLoaderComplete, useLoaderPlayedIntro } from "./LoaderContext";
import { navRevealDelay } from "@/lib/motion";

export default function Nav() {
  const loaderComplete = useLoaderComplete();
  const playedIntro = useLoaderPlayedIntro();

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-6 md:px-12 md:py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: loaderComplete ? 1 : 0 }}
      transition={{ duration: 0.6, delay: playedIntro ? navRevealDelay : 0 }}
    >
      <a href="#hero" className="font-display text-lg font-bold uppercase tracking-tight focus-ring">
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
    </motion.header>
  );
}
