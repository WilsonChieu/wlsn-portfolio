"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import { useReducedMotion } from "@/lib/useReducedMotion";

const ROWS = [
  { title: "Off The Track", meta: "CONCERT · LIVE SET 2026", image: "/work/off-the-track.jpg" },
  { title: "Graduation Season", meta: "GRADUATION", image: "/work/graduation-season.jpg" },
  { title: "Speaker Series", meta: "TALKS", image: "/work/speaker-series.jpg" },
  { title: "Hands-On Sessions", meta: "WORKSHOPS", image: "/work/hands-on-sessions.jpg" },
];

const PREVIEW_WIDTH = 288;
const PREVIEW_HEIGHT = 192;

export default function WorkList() {
  const reducedMotion = useReducedMotion();
  const listRef = useRef<HTMLUListElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 400, damping: 32, mass: 0.6 });
  const springY = useSpring(mouseY, { stiffness: 400, damping: 32, mass: 0.6 });
  const previewX = useTransform(springX, (v) => v - PREVIEW_WIDTH / 2);
  const previewY = useTransform(springY, (v) => v - PREVIEW_HEIGHT / 2);

  function handleMouseMove(event: React.MouseEvent<HTMLUListElement>) {
    const rect = listRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(event.clientX - rect.left);
    mouseY.set(event.clientY - rect.top);
  }

  const active = activeIndex !== null ? ROWS[activeIndex] : null;

  return (
    <section id="work" className="px-6 py-24 md:px-12 md:py-32">
      <p className="mb-12 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
        Selected Work
      </p>
      <ul
        ref={listRef}
        className="relative"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setActiveIndex(null)}
      >
        {ROWS.map((row, index) => (
          <motion.li
            key={row.title}
            className="group border-t border-line py-8 last:border-b"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            onMouseEnter={() => setActiveIndex(index)}
          >
            <a href="#" className="focus-ring flex w-full flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
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

        {!reducedMotion && (
          <motion.div
            className="pointer-events-none absolute left-0 top-0 z-10 hidden overflow-hidden md:block"
            style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, x: previewX, y: previewY }}
            initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
            animate={
              active
                ? { opacity: 1, scale: 1, rotate: -3 }
                : { opacity: 0, scale: 0.6, rotate: -6 }
            }
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
          >
            {ROWS.map((row) => (
              <Image
                key={row.image}
                src={row.image}
                alt=""
                fill
                className="object-cover transition-opacity duration-150"
                style={{ opacity: active?.image === row.image ? 1 : 0 }}
                sizes="300px"
              />
            ))}
          </motion.div>
        )}
      </ul>
    </section>
  );
}
