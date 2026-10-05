"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import PhotoViewer from "@/components/site/PhotoViewer";
import { photoIndex, stepIndex } from "@/lib/work-nav";

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
function Photo({ photo, onOpen }: { photo: GalleryPhoto; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} data-photo={photo.id} data-cursor="view" className="focus-ring group mb-4 block w-full cursor-zoom-in break-inside-avoid overflow-hidden bg-well md:mb-6">
      <Image
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="block h-auto w-full transition-transform duration-[800ms] ease-[cubic-bezier(.2,.7,.2,1)] motion-safe:group-hover:scale-[1.02]"
      />
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
  // history.back() resolves asynchronously; without this a double-click or held Esc pops twice and leaves the page.
  const closing = useRef(false);
  const close = useCallback(() => {
    if (closing.current) return;
    // Closing pops our own history entry so Back and the ✕ button behave the same.
    if (window.history.state?.ctPhoto) {
      closing.current = true;
      window.history.back();
    } else {
      window.history.replaceState(null, "", urlWithPhoto(null));
      setIndex(-1);
    }
  }, []);

  useEffect(() => {
    const sync = () => {
      closing.current = false;
      setIndex(photoIndex(photos, new URLSearchParams(window.location.search).get("photo")));
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [photos]);

  const lastOpen = useRef<string | null>(null);
  useEffect(() => {
    if (index >= 0) {
      lastOpen.current = photos[index]?.id ?? null;
    } else if (lastOpen.current) {
      // Return keyboard focus to the photo that was open.
      document.querySelector<HTMLElement>(`[data-photo="${lastOpen.current}"]`)?.focus();
      lastOpen.current = null;
    }
  }, [index, photos]);

  const pill = (m: Mode, label: string) => (
    <button type="button" onClick={() => choose(m)} aria-pressed={mode === m} className={`focus-ring rounded-full px-[18px] py-2.5 md:px-5 md:py-2 ${mode === m ? "bg-char text-bone" : ""}`}>{label}</button>
  );

  return (
    <>
      <div className="mt-2 flex self-start rounded-full border border-char p-[3px] text-[19px] md:col-span-3 md:col-start-10 md:mt-0 md:self-auto md:justify-self-end md:p-1 md:text-[22px]">
        {pill("editorial", "Editorial")}
        {pill("grid", "Grid")}
      </div>

      <div className="col-span-12 mt-6 md:mt-0">
        {n === 0 && <p className="text-[32px] italic text-mute">No photos yet.</p>}

        {mode === "editorial" && n > 0 && (
          <div className="columns-1 gap-4 sm:columns-2 md:gap-6 lg:columns-3">
            {photos.map((p, i) => (
              <Photo key={p.id} photo={p} onOpen={() => open(i)} />
            ))}
          </div>
        )}

        {mode === "grid" && n > 0 && (
          <div className="grid grid-cols-3 gap-1 md:grid-cols-6 md:gap-2">
            {photos.map((p, i) => (
              <button key={p.id} type="button" onClick={() => open(i)} data-photo={p.id} data-cursor="view" className="focus-ring relative aspect-square cursor-zoom-in overflow-hidden bg-well">
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
