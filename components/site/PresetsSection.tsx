"use client";

import { useState } from "react";
import Image from "next/image";
import { PRESETS } from "@/lib/site-content";

export default function PresetsSection({ covers }: { covers: Record<string, string> }) {
  const [pick, setPick] = useState(0);
  const [split, setSplit] = useState(50);
  const preset = PRESETS[pick];
  const photo = covers[preset.photo] || preset.photo;
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" && e.type === "pointermove" && !e.buttons) return;
    const r = e.currentTarget.getBoundingClientRect();
    setSplit(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
  };
  return (
    <section id="presets" className="bg-char px-5 py-16 text-bone md:px-12 md:py-[120px]">
      <div className="mb-6 md:mb-12 md:flex md:items-baseline md:justify-between">
        <h2 className="text-[72px] leading-[.86] tracking-[-.035em] md:text-[min(12.5vw,180px)] md:leading-[.85]">Presets <i className="text-signal">for sale</i></h2>
        <p className="ct-label mt-3 text-[10px] md:mt-0 md:text-right md:text-[12px] md:tracking-[.06em]">Drag to compare<br className="hidden md:inline" /> Lightroom desktop + mobile</p>
      </div>
      <div className="md:grid md:grid-cols-12 md:gap-6">
        <div onPointerMove={move} onPointerDown={move} className="relative aspect-[4/5] cursor-ew-resize touch-none overflow-hidden md:col-span-8 md:aspect-[3/2]">
          <Image src={photo} alt="" fill sizes="(min-width: 768px) 66vw, 100vw" className="object-cover [filter:saturate(.45)_contrast(.78)_brightness(1.08)]" />
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
            <Image src={photo} alt={`${preset.name} preset applied`} fill sizes="(min-width: 768px) 66vw, 100vw" className="object-cover" />
          </div>
          <div className="pointer-events-none absolute inset-y-0 w-px bg-white" style={{ left: `${split}%` }} />
          <span className="pointer-events-none absolute bottom-2.5 left-3.5 text-[30px] italic text-white md:bottom-4 md:left-5 md:text-[44px]">After</span>
          <span className="pointer-events-none absolute bottom-2.5 right-3.5 text-[30px] italic text-white md:bottom-4 md:right-5 md:text-[44px]">Before</span>
        </div>
        <div className="mt-4 flex flex-col md:col-span-4 md:mt-0">
          {PRESETS.map((p, i) => (
            <button key={p.name} type="button" onClick={() => setPick(i)} className={`focus-ring flex items-baseline justify-between border-t border-bone py-4 text-left transition-opacity md:flex-col md:items-stretch md:gap-1.5 md:py-6 ${i === pick ? "opacity-100" : "opacity-40"}`}>
              <span className="flex items-baseline justify-between">
                <span className="text-[32px] leading-none md:text-[52px] md:tracking-[-.02em]">{p.name} <span className="text-signal">{i === pick ? "●" : ""}</span></span>
                <span className="hidden text-[26px] italic md:inline">{p.price}</span>
              </span>
              <span className="ct-label text-[9px] md:text-[11px] md:tracking-[.06em]">{p.tag}</span>
              <span className="text-[22px] italic md:hidden">{p.price}</span>
            </button>
          ))}
          {preset.buyUrl ? <a href={preset.buyUrl} className="focus-ring mt-4 flex justify-between rounded-full border border-bone px-6 py-4 text-[24px] italic transition-colors hover:border-signal hover:bg-signal hover:text-white md:mt-auto md:px-7 md:py-[18px] md:text-[30px]">Buy {preset.name}<span>→</span></a> : <button type="button" disabled className="mt-4 rounded-full border border-bone/40 px-6 py-4 text-left text-[24px] italic text-bone/60 md:mt-auto md:px-7 md:py-[18px] md:text-[30px]">Coming soon</button>}
        </div>
      </div>
    </section>
  );
}
