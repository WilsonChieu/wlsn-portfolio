"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

const ROWS = [
  { title: "Off The Track", meta: "CONCERT · LIVE SET 2026", image: "/work/off-the-track.jpg" },
  { title: "Graduation Season", meta: "GRADUATION", image: "/work/graduation-season.jpg" },
  { title: "Speaker Series", meta: "TALKS", image: "/work/speaker-series.jpg" },
  { title: "Hands-On Sessions", meta: "WORKSHOPS", image: "/work/hands-on-sessions.jpg" },
];

const ROW_FADE_MASK =
  "linear-gradient(to right, black 0%, black 45%, transparent 88%)";

export default function WorkList() {
  return (
    <section id="work" className="px-6 py-24 md:px-12 md:py-32">
      <p className="mb-12 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
        Selected Work
      </p>
      <ul>
        {ROWS.map((row) => (
          <motion.li
            key={row.title}
            className="group relative overflow-hidden border-t border-line py-8 last:border-b"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:opacity-100"
              style={{
                maskImage: ROW_FADE_MASK,
                WebkitMaskImage: ROW_FADE_MASK,
              }}
              aria-hidden
            >
              <Image src={row.image} alt="" fill className="object-cover" sizes="100vw" />
            </div>

            <a
              href="#"
              className="focus-ring relative z-10 flex w-full flex-col items-start gap-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex w-full min-w-0 items-center gap-4 md:gap-6">
                <div className="relative h-14 w-20 shrink-0 overflow-hidden md:h-20 md:w-28">
                  <Image
                    src={row.image}
                    alt={`${row.title} — ${row.meta}`}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                </div>
                <h3 className="min-w-0 flex-1 break-words font-display text-2xl font-bold uppercase leading-[0.95] transition-all duration-300 group-hover:translate-x-[14px] group-hover:text-olive md:text-5xl">
                  {row.title}
                </h3>
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50 md:text-right">
                {row.meta}
              </span>
            </a>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
