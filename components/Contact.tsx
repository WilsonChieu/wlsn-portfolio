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
        className="font-display text-[13vw] font-bold uppercase leading-[0.9] md:text-[7vw]"
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
