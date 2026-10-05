"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { GalleryPhoto } from "@/components/site/ShootGallery";
import { pad2, stepIndex } from "@/lib/work-nav";

interface PhotoViewerProps {
  title: string;
  photos: GalleryPhoto[];
  index: number;
  onStep: (delta: number) => void;
  onGo: (index: number) => void;
  onClose: () => void;
}

const SWIPE_PX = 40;

export default function PhotoViewer({ title, photos, index, onStep, onGo, onClose }: PhotoViewerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const startX = useRef<number | null>(null);
  const n = photos.length;
  const photo = photos[index];
  const lo = Math.max(0, Math.min(n - 9, index - 4));
  // Neighbours rendered with the same `sizes` as the main image, so the browser preloads the exact variant it will show.
  const neighbours = Array.from(new Set([stepIndex(index, 1, n), stepIndex(index, -1, n)])).filter((i) => i !== index);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onStep(1);
      else if (e.key === "ArrowLeft") onStep(-1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStep, onClose]);

  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    // The viewer is portalled outside the page, so making the page inert keeps Tab inside the dialog.
    const page = document.querySelector<HTMLElement>(".ct-site:not([role=dialog])");
    page?.setAttribute("inert", "");
    closeRef.current?.focus();
    return () => {
      document.documentElement.style.overflow = prev;
      page?.removeAttribute("inert");
    };
  }, []);

  if (!photo) return null;
  const counter = `${pad2(index + 1)} / ${pad2(n)}`;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${title} — photo ${counter}`} data-lenis-prevent className="ct-site fixed inset-0 z-[70] flex flex-col bg-night font-serif text-bone antialiased">
      <div className="flex items-center justify-between px-5 pb-3 pt-[max(16px,env(safe-area-inset-top))] md:grid md:grid-cols-[1fr_auto_1fr] md:px-12 md:py-[22px]">
        <span className="hidden text-[26px] italic md:block">{title}</span>
        <span className="font-jet text-[12px] tracking-[.14em] md:text-[13px]">{counter}</span>
        <button ref={closeRef} type="button" onClick={onClose} className="focus-ring ct-label justify-self-end py-3 pl-5 text-[12px] hover:text-signal md:py-0">Close ✕</button>
      </div>

      <div
        className="relative min-h-0 flex-1 touch-pan-y select-none md:px-[120px]"
        onPointerDown={(e) => { startX.current = e.clientX; }}
        onPointerUp={(e) => {
          if (startX.current === null || e.pointerType === "mouse") return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > SWIPE_PX) onStep(dx < 0 ? 1 : -1);
        }}
      >
        <div className="relative h-full w-full">
          <Image key={photo.id} src={photo.src} alt={photo.alt} fill priority sizes="100vw" className="object-contain" />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-0">
          {neighbours.map((i) => (
            <Image key={photos[i].id} src={photos[i].src} alt="" fill loading="eager" sizes="100vw" className="object-contain" />
          ))}
        </div>
        {n > 1 && (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => onStep(-1)} className="focus-ring absolute inset-y-0 left-0 hidden w-1/2 cursor-w-resize items-center pl-10 text-[56px] opacity-60 hover:opacity-100 md:flex">←</button>
            <button type="button" aria-label="Next photo" onClick={() => onStep(1)} className="focus-ring absolute inset-y-0 right-0 hidden w-1/2 cursor-e-resize items-center justify-end pr-10 text-[56px] opacity-60 hover:opacity-100 md:flex">→</button>
          </>
        )}
      </div>

      <p className="px-5 pb-2 pt-4 text-center text-[24px] italic md:hidden">{title}</p>
      {n > 1 && (
        <div className="flex items-center justify-between px-5 pb-[max(34px,env(safe-area-inset-bottom))] pt-1 md:hidden">
          <button type="button" aria-label="Previous photo" onClick={() => onStep(-1)} className="focus-ring flex h-[52px] w-[52px] items-center justify-center rounded-full border border-bone text-[24px]">←</button>
          <span className="ct-label text-[10px] opacity-60">Swipe</span>
          <button type="button" aria-label="Next photo" onClick={() => onStep(1)} className="focus-ring flex h-[52px] w-[52px] items-center justify-center rounded-full border border-bone text-[24px]">→</button>
        </div>
      )}
      {n > 1 && (
        <div className="hidden justify-center gap-1.5 px-12 pb-6 pt-5 md:flex">
          {photos.slice(lo, lo + 9).map((t, j) => (
            <button key={t.id} type="button" aria-label={`Photo ${lo + j + 1}`} onClick={() => onGo(lo + j)} className={`focus-ring relative h-[46px] w-[68px] overflow-hidden transition-opacity ${lo + j === index ? "opacity-100 outline outline-1 outline-offset-2 outline-bone" : "opacity-40"}`}>
              <Image src={t.src} alt="" fill sizes="68px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
