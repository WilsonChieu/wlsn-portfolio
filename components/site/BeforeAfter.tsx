"use client";

import { useState } from "react";
import Image from "next/image";
import type { PublicPhoto } from "@/lib/presets";

const KEY_STEP = 5;

export default function BeforeAfter({ pairs, name, sizes = "(min-width: 768px) 58vw, 100vw" }: { pairs: { before: PublicPhoto; after: PublicPhoto }[]; name: string; sizes?: string }) {
  const [pick, setPick] = useState(0);
  const [split, setSplit] = useState(50);
  const pair = pairs[Math.min(pick, pairs.length - 1)];
  if (!pair) return null;

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" && e.type === "pointermove" && !e.buttons) return;
    const r = e.currentTarget.getBoundingClientRect();
    setSplit(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setSplit((s) => Math.max(0, s - KEY_STEP));
    else if (e.key === "ArrowRight") setSplit((s) => Math.min(100, s + KEY_STEP));
    else return;
    e.preventDefault();
  };

  return (
    <div>
      <div
        onPointerMove={move}
        onPointerDown={move}
        className="relative cursor-ew-resize touch-none select-none overflow-hidden bg-well"
        style={{ aspectRatio: `${pair.after.width} / ${pair.after.height}` }}
      >
        <Image src={pair.before.src} alt={`${name} — before`} fill sizes={sizes} className="object-cover" draggable={false} />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
          <Image src={pair.after.src} alt={`${name} — after`} fill sizes={sizes} className="object-cover" draggable={false} />
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-px bg-white" style={{ left: `${split}%` }} />
        <button
          type="button"
          role="slider"
          aria-label={`Compare before and after for ${name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(split)}
          onKeyDown={key}
          className="focus-ring absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[18px] text-char"
          style={{ left: `${split}%` }}
        >
          ↔
        </button>
        <span className="pointer-events-none absolute bottom-2.5 left-3.5 text-[26px] italic text-white md:bottom-4 md:left-5 md:text-[36px]">Before</span>
        <span className="pointer-events-none absolute bottom-2.5 right-3.5 text-[26px] italic text-white md:bottom-4 md:right-5 md:text-[36px]">After</span>
      </div>
      {pairs.length > 1 && (
        <div className="mt-3 flex gap-2">
          {pairs.map((p, i) => (
            <button key={p.after.id} type="button" onClick={() => setPick(i)} aria-label={`Example ${i + 1}`} aria-pressed={i === pick} className={`focus-ring relative h-12 w-16 overflow-hidden transition-opacity ${i === pick ? "opacity-100 ring-1 ring-current" : "opacity-50 hover:opacity-80"}`}>
              <Image src={p.after.src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
