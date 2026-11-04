"use client";

import { useState } from "react";
import Image from "next/image";
import type { PublicPreset } from "@/lib/presets";
import BeforeAfter from "@/components/site/BeforeAfter";
import Link from "next/link";

export default function PresetsSection({ presets }: { presets: PublicPreset[] }) {
  const [pick, setPick] = useState(0);
  const preset = presets[pick] ?? presets[0];
  if (!preset) return null;
  const photo = preset.pairs[0]?.after.src || preset.collage[0]?.src;
  return (
    <section id="presets" className="bg-char px-5 py-16 text-bone md:px-12 md:py-[120px]">
      <div className="mb-6 md:mb-12 md:flex md:items-baseline md:justify-between">
        <h2 className="text-[72px] leading-[.86] tracking-[-.035em] md:text-[min(12.5vw,180px)] md:leading-[.85]">Presets <i className="text-signal">for sale</i></h2>
        <p className="ct-label mt-3 text-[10px] md:mt-0 md:text-right md:text-[12px] md:tracking-[.06em]">Drag to compare<br className="hidden md:inline" /> Lightroom desktop + mobile</p>
      </div>
      <div className="md:grid md:grid-cols-12 md:gap-6">
        <div className="md:col-span-8">
          {preset.pairs.length > 0 ? <BeforeAfter key={preset.slug} pairs={preset.pairs} name={preset.name} sizes="(min-width: 768px) 66vw, 100vw" /> : photo ? <div className="relative aspect-[3/2]"><Image src={photo} alt={`${preset.name} preset preview`} fill sizes="(min-width: 768px) 66vw, 100vw" className="object-cover" /></div> : <p className="py-20 text-center text-bone/60">Preview coming soon</p>}
        </div>
        <div className="mt-4 flex flex-col md:col-span-4 md:mt-0">
          {presets.map((p, i) => (
            <button key={p.slug} type="button" onClick={() => setPick(i)} className={`focus-ring flex items-baseline justify-between border-t border-bone py-4 text-left transition-opacity md:flex-col md:items-stretch md:gap-1.5 md:py-6 ${i === pick ? "opacity-100" : "opacity-40"}`}>
              <span className="flex items-baseline justify-between">
                <span className="text-[32px] leading-none md:text-[52px] md:tracking-[-.02em]">{p.name} <span className="text-signal">{i === pick ? "●" : ""}</span></span>
                <span className="hidden text-[26px] italic md:inline">{p.price}</span>
              </span>
              <span className="ct-label text-[9px] md:text-[11px] md:tracking-[.06em]">{p.description}</span>
              <span className="text-[22px] italic md:hidden">{p.price}</span>
            </button>
          ))}
          {preset.buyUrl ? <a href={preset.buyUrl} className="focus-ring mt-4 flex justify-between rounded-full border border-bone px-6 py-4 text-[24px] italic transition-colors hover:border-signal hover:bg-signal hover:text-white md:mt-auto md:px-7 md:py-[18px] md:text-[30px]">Buy {preset.name}<span>→</span></a> : <button type="button" disabled className="mt-4 rounded-full border border-bone/40 px-6 py-4 text-left text-[24px] italic text-bone/60 md:mt-auto md:px-7 md:py-[18px] md:text-[30px]">Coming soon</button>}
        </div>
      </div>
      <Link href="/presets" className="focus-ring mt-8 inline-block underline underline-offset-4">View all presets and bundle options →</Link>
    </section>
  );
}
