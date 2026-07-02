"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

export default function Featured() {
  return (
    <motion.section
      className="relative h-[70vh] w-full overflow-hidden md:h-screen"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <Image
        src="/work/off-the-track-featured.jpg"
        alt="Off The Track — pit shot from the live set"
        fill
        className="object-cover"
        sizes="100vw"
        priority={false}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-olive/20 via-transparent to-transparent"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6 md:p-12">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/80">
          Latest — 02
        </span>
        <h2 className="font-display text-[12vw] font-bold uppercase leading-[0.9] text-paper md:text-[7vw]">
          Off The Track
        </h2>
      </div>
    </motion.section>
  );
}
