"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import BookingModal from "./BookingModal";

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
        className="break-words font-display text-[11vw] font-bold uppercase leading-[0.9] md:text-[7vw]"
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

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <BookingModal />
      </motion.div>
    </section>
  );
}
