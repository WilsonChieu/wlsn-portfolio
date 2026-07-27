"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

const CHIPS = ["EVENTS", "WORKSHOPS", "GRADUATIONS", "CONCERTS", "48HR SNEAK PEEK"];

export default function About() {
  return (
    <section id="about" className="grid gap-12 px-6 py-24 md:grid-cols-2 md:gap-16 md:px-12 md:py-32">
      <motion.h2
        className="font-display text-4xl font-bold uppercase leading-[0.95] md:text-6xl"
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
