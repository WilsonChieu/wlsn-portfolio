"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { desktopRows, mobileRows, orientationOf } from "@/lib/editorial";
import PhotoViewer from "@/components/site/PhotoViewer";
import { pad2, photoIndex, stepIndex } from "@/lib/work-nav";

export interface GalleryPhoto {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
}

type Mode = "editorial" | "grid";
const MODE_KEY = "ct-gallery-mode";

// Declared at module level so re-renders (e.g. opening the viewer) don't remount every image.
function Photo({ photo, label, ratio, sizes, onOpen }: { photo: GalleryPhoto; label: string; ratio: string; sizes: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} data-photo={photo.id} className="focus-ring group flex w-full cursor-zoom-in flex-col gap-1.5 text-left md:gap-2.5">
      <span className="relative block w-full overflow-hidden bg-well" style={{ aspectRatio: ratio }}>
        <Image src={photo.src} alt={photo.alt} fill sizes={sizes} className="object-cover transition-transform duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] motion-safe:group-hover:scale-[1.03]" />
      </span>
      <span className="font-jet text-[10px] tracking-[.12em] text-mute md:text-[11px]">{label}</span>
    </button>
  );
}

function urlWithPhoto(id: string | null): string {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("photo", id);
  else url.searchParams.delete("photo");
  return url.toString();
}

export default function ShootGallery({ title, photos }: { title: string; photos: GalleryPhoto[] }) {
  const [mode, setMode] = useState<Mode>("editorial");
  const shapes = useMemo(() => photos.map((p) => orientationOf(p.width, p.height)), [photos]);
  const desk = useMemo(() => desktopRows(shapes), [shapes]);
  const mob = useMemo(() => mobileRows(shapes), [shapes]);
  const n = photos.length;

  useEffect(() => {
    try {
      if (sessionStorage.getItem(MODE_KEY) === "grid") setMode("grid");
    } catch {}
  }, []);
  const choose = (m: Mode) => {
    setMode(m);
    try {
      sessionStorage.setItem(MODE_KEY, m);
    } catch {}
  };
  const [index, setIndex] = useState(-1);
  const open = (i: number) => {
    window.history.pushState({ ctPhoto: true }, "", urlWithPhoto(photos[i].id));
    setIndex(i);
  };
  const go = useCallback((i: number) => {
    window.history.replaceState(window.history.state, "", urlWithPhoto(photos[i].id));
    setIndex(i);
  }, [photos]);
  const step = useCallback((d: number) => {
    setIndex((i) => {
      const nextI = stepIndex(i, d, photos.length);
      window.history.replaceState(window.history.state, "", urlWithPhoto(photos[nextI].id));
      return nextI;
    });
  }, [photos]);
  const close = useCallback(() => {
    // Closing pops our own history entry so Back and the ✕ button behave the same.
    if (window.history.state?.ctPhoto) window.history.back();
    else {
      window.history.replaceState(null, "", urlWithPhoto(null));
      setIndex(-1);
    }
  }, []);

  useEffect(() => {
    const sync = () => setIndex(photoIndex(photos, new URLSearchParams(window.location.search).get("photo")));
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [photos]);

  const lastOpen = useRef<string | null>(null);
  useEffect(() => {
    if (index >= 0) {
      lastOpen.current = photos[index]?.id ?? null;
      // Warm the neighbours so stepping through the set feels instant.
      for (const d of [1, -1]) {
        const p = photos[stepIndex(index, d, photos.length)];
        if (p) new window.Image().src = `${process.env.NEXT_PUBLIC_PHOTO_BASE_URL}/${p.src}/w1920.jpg`;
      }
    } else if (lastOpen.current) {
      // Return keyboard focus to the photo that was open.
      document.querySelector<HTMLElement>(`[data-photo="${lastOpen.current}"]`)?.focus();
      lastOpen.current = null;
    }
  }, [index, photos]);

  const pill = (m: Mode, label: string) => (
    <button type="button" onClick={() => choose(m)} aria-pressed={mode === m} className={`focus-ring rounded-full px-[18px] py-2.5 md:px-5 md:py-2 ${mode === m ? "bg-char text-bone" : ""}`}>{label}</button>
  );
  const label = (i: number) => `${pad2(i + 1)} / ${pad2(n)}`;

  return (
    <>
      <div className="mt-2 flex self-start rounded-full border border-char p-[3px] text-[19px] md:col-span-3 md:col-start-10 md:mt-0 md:self-auto md:justify-self-end md:p-1 md:text-[22px]">
        {pill("editorial", "Editorial")}
        {pill("grid", "Grid")}
      </div>

      <div className="col-span-12 mt-6 md:mt-0">
        {n === 0 && <p className="text-[32px] italic text-mute">No photos yet.</p>}

        {mode === "editorial" && n > 0 && (
          <>
            <div className="hidden flex-col gap-20 md:flex">
              {desk.map((row, r) => (
                <div key={r} className="grid grid-cols-12 gap-6" style={{ alignItems: row.align }}>
                  {row.items.map((it) => (
                    <div key={it.index} style={{ gridColumn: `${it.start} / span ${it.span}` }}>
                      <Photo photo={photos[it.index]} label={label(it.index)} ratio={it.ratio} sizes={`${Math.round((it.span / 12) * 100)}vw`} onOpen={() => open(it.index)} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-7 md:hidden">
              {mob.map((row, r) => (
                <div key={r} className={`grid gap-2 ${row.items.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {row.items.map((it) => (
                    <Photo key={it.index} photo={photos[it.index]} label={label(it.index)} ratio={it.ratio} sizes={row.items.length > 1 ? "50vw" : "100vw"} onOpen={() => open(it.index)} />
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {mode === "grid" && n > 0 && (
          <div className="grid grid-cols-3 gap-1 md:grid-cols-6 md:gap-2">
            {photos.map((p, i) => (
              <button key={p.id} type="button" onClick={() => open(i)} data-photo={p.id} className="focus-ring relative aspect-square cursor-zoom-in overflow-hidden bg-well">
                <Image src={p.src} alt={p.alt} fill sizes="(min-width: 768px) 16vw, 33vw" className="object-cover transition-opacity duration-300 hover:opacity-75" />
              </button>
            ))}
          </div>
        )}
      </div>

      {index >= 0 && <PhotoViewer title={title} photos={photos} index={index} onStep={step} onGo={go} onClose={close} />}
    </>
  );
}
