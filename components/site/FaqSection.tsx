"use client";

import { useState } from "react";
import { FAQ, PRESETS_ENABLED } from "@/lib/site-content";

const ITEMS = FAQ.filter((f) => PRESETS_ENABLED || !f.presetsOnly);

export default function FaqSection() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="px-5 py-[72px] md:grid md:grid-cols-12 md:gap-6 md:px-12 md:py-[140px]">
      <h2 className="mb-7 text-[110px] italic leading-[.8] tracking-[-.03em] md:col-span-4 md:mb-0 md:text-[min(13.9vw,200px)]">FAQ</h2>
      <div className="flex flex-col border-b border-char md:col-span-7 md:col-start-6">
        {ITEMS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="border-t border-char">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="focus-ring flex w-full items-center justify-between gap-4 py-[18px] text-left text-[26px] leading-[1.05] hover:italic md:gap-6 md:py-[26px] md:text-[40px] md:tracking-[-.01em]"
              >
                <span>{f.q}</span>
                <span aria-hidden className="text-[30px] not-italic text-signal md:text-[44px]">{isOpen ? "–" : "+"}</span>
              </button>
              {isOpen && <p className="pb-5 text-[19px] leading-[1.35] text-[#3a3634] [text-wrap:pretty] md:pb-[30px] md:pr-20 md:text-[24px]">{f.a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
