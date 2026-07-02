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
            className="group border-t border-line py-8 last:border-b"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <a href="#" className="focus-ring flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-6">
                <div className="relative h-16 w-24 overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:w-32 md:h-20 md:w-28 md:group-hover:w-40">
                  <Image
                    src={row.image}
                    alt={`${row.title} — ${row.meta}`}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                </div>
                <h3 className="font-display text-3xl font-extrabold uppercase transition-all duration-300 group-hover:translate-x-[14px] group-hover:text-olive md:text-5xl">
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
