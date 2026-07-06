"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import { WORKS } from "@/lib/works";

const ROW_FADE_MASK = "linear-gradient(to right, black 0%, black 45%, transparent 88%)";

export default function WorkList() {
  return (
    <section id="work" className="px-6 py-24 md:px-12 md:py-32">
      <p className="mb-12 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
        Selected Work
      </p>
      <ul>
        {WORKS.map((work) => (
          <motion.li
            key={work.slug}
            className="group relative overflow-hidden border-t border-line py-14 last:border-b md:py-20"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:opacity-100"
              style={{ maskImage: ROW_FADE_MASK, WebkitMaskImage: ROW_FADE_MASK }}
              aria-hidden
            >
              <Image src={work.cover} alt="" fill className="object-cover" sizes="100vw" />
            </div>

            <Link
              href={`/work/${work.slug}`}
              className="focus-ring relative z-10 flex w-full flex-col items-start gap-4 md:flex-row md:items-center md:justify-between"
            >
              <h3 className="min-w-0 flex-1 break-words font-display text-2xl font-bold uppercase leading-[0.95] text-ink transition-all duration-300 [text-shadow:0_2px_10px_rgba(17,17,16,0)] group-hover:translate-x-[14px] group-hover:text-paper group-hover:[text-shadow:0_2px_10px_rgba(17,17,16,0.7)] md:text-5xl">
                {work.title}
              </h3>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50 transition-colors duration-300 group-hover:text-paper/60 md:text-right">
                {work.meta}
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
