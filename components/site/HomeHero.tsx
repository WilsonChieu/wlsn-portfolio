"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { INTRO_SEEN_KEY, introAction } from "@/lib/intro";
import { HERO_LINE, HERO_TAGS } from "@/lib/site-content";
import { pad2, type ShootRef } from "@/lib/work-nav";

function Word({ text, className }: { text: string; className?: string }) {
  return (
    <div className={`whitespace-nowrap leading-[.86] tracking-[-.045em] ${className ?? ""}`}>
      {[...text].map((ch, i) => (
        <span key={i} className="-mx-[.04em] inline-block overflow-hidden px-[.04em] pb-[.06em] align-top">
          <span className="ct-rise inline-block">{ch}</span>
        </span>
      ))}
    </div>
  );
}

export default function HomeHero({ frames, featured }: { frames: ShootRef[]; featured: ShootRef | null }) {
  const rootRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const [current, setCurrent] = useState(Math.max(0, frames.length - 1));
  const [previous, setPrevious] = useState<number | null>(null);
  const frame = frames[current];
  const currentRef = useRef(current);
  currentRef.current = current;
  const total = frames.length;
  useEffect(() => {
    const root = rootRef.current;
    const overlay = overlayRef.current;
    if (!root || !overlay) return;
    const html = document.documentElement;
    let seen = false;
    try {
      seen = sessionStorage.getItem(INTRO_SEEN_KEY) !== null;
    } catch {}
    const action = introAction({
      flag: html.dataset.intro,
      seen,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      hidden: document.hidden,
      frames: frames.length,
    });
    const anims: Animation[] = [];
    const timers: number[] = [];
    let slideTimer = 0;
    let raf = 0;

    const advance = () => {
      if (document.hidden) return;
      const c = currentRef.current;
      setPrevious(c);
      setCurrent((c + 1) % frames.length);
    };
    const startSlides = () => {
      if (frames.length > 1) slideTimer = window.setInterval(advance, 2600);
    };

    const mountedAt = performance.now();
    let startedAt: number | null = null;
    const settle = () => {
      html.dataset.intro = "skip";
      try {
        sessionStorage.setItem(INTRO_SEEN_KEY, "1");
      } catch {}
    };

    if (action === "skip") {
      settle();
      startSlides();
      return () => window.clearInterval(slideTimer);
    }

    const runIntro = () => {
      startedAt = performance.now();

      // Registered before any animation so an exception below can't leave the page covered.
      timers.push(
        window.setTimeout(() => {
          anims.forEach((a) => a.finish());
          settle();
        }, 6000)
      );
      const A = (el: Element | null, kf: Keyframe[], o: KeyframeAnimationOptions) => {
        if (!el) return;
        const a = el.animate(kf, { fill: "both", ...o });
        anims.push(a);
        return a;
      };
      const q = (s: string) => root.querySelectorAll(s);
      const one = (s: string) => overlay.querySelector(s);
      const ease = "cubic-bezier(.83,0,.17,1)";
      const out = "cubic-bezier(.16,1,.3,1)";
      const SPLIT = 1650;

      try {
        const t0 = performance.now();
        const count = (t: number) => {
          const k = Math.min(1, (t - t0) / 1200);
          const v = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          if (countRef.current) countRef.current.textContent = String(Math.round(v * 100)).padStart(3, "0");
          if (k < 1) raf = requestAnimationFrame(count);
        };
        raf = requestAnimationFrame(count);

        A(one("[data-label]"), [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-24px)" }], { duration: 380, delay: 1300, easing: "cubic-bezier(.4,0,1,1)" });
        A(one("[data-seam]"), [{ transform: "scaleX(0)", opacity: 1 }, { transform: "scaleX(1)", opacity: 1 }], { duration: 420, delay: 1300, easing: out });
        A(one("[data-seam]"), [{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: SPLIT + 100, fill: "forwards", composite: "replace" });
        A(one('[data-half="top"]'), [{ transform: "translate3d(0,0,0)" }, { transform: "translate3d(0,-100%,0)" }], { duration: 1100, delay: SPLIT, easing: ease });
        const last = A(one('[data-half="bot"]'), [{ transform: "translate3d(0,0,0)" }, { transform: "translate3d(0,100%,0)" }], { duration: 1100, delay: SPLIT, easing: ease });
        if (last) last.onfinish = settle;

        q(".ct-rise").forEach((el, i) => A(el, [{ transform: "translate3d(0,105%,0)" }, { transform: "translate3d(0,0,0)" }], { duration: 1100, delay: SPLIT + 300 + i * 50, easing: out }));
        q(".ct-shot").forEach((el) => A(el, [{ clipPath: "inset(50% 0 50% 0)" }, { clipPath: "inset(0% 0 0% 0)" }], { duration: 1000, delay: SPLIT + 450, easing: ease }));
        q(".ct-fade").forEach((el, i) => A(el, [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 900, delay: SPLIT + 650 + i * 50, easing: out }));
        document.querySelectorAll("header.ct-fade").forEach((el) => A(el, [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 900, delay: SPLIT + 650, easing: out }));

        // The burst: flick through every frame once while the window opens, ending on the last.
        frames.forEach((_, i) => timers.push(window.setTimeout(() => { setPrevious(null); setCurrent(i); }, SPLIT + 600 + i * 120)));
        timers.push(window.setTimeout(startSlides, SPLIT + 600 + frames.length * 120 + 1800));
      } catch {
        anims.forEach((x) => x.cancel());
        settle();
        startSlides();
      }
    };

    // A pre-rendered or background page starts its intro the moment it is actually shown.
    const onVisible = () => {
      if (document.hidden) return;
      document.removeEventListener("visibilitychange", onVisible);
      runIntro();
    };
    if (action === "play") runIntro();
    else document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      // Leaving mid-intro (e.g. clicking a hero frame) must not leave the hidden pre-state behind for the next
      // visit to /. React's dev-only double effect run cleans up instantly, so that case is ignored.
      if (performance.now() - mountedAt > 50) {
        if (startedAt === null) html.dataset.intro = "skip";
        else settle();
      }
      anims.forEach((a) => a.cancel());
      timers.forEach((t) => window.clearTimeout(t));
      window.clearInterval(slideTimer);
      cancelAnimationFrame(raf);
    };
  }, [frames]);

  return (
    <section ref={rootRef} className="relative h-[205vw] overflow-hidden md:h-[min(59.7vw,860px)]">
        <div ref={overlayRef} aria-hidden className="ct-overlay pointer-events-none fixed inset-0 z-50">
          <div data-half="top" className="absolute inset-x-0 top-0 h-1/2 bg-char will-change-transform" />
          <div data-half="bot" className="absolute inset-x-0 bottom-0 h-[50.2%] bg-char will-change-transform" />
          <div data-seam className="absolute inset-x-0 top-1/2 h-px origin-center scale-x-0 bg-signal" />
          <div data-label className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-bone">
            <span className="ct-label text-[10px] md:text-[12px] md:tracking-[.2em]">CRISPTAKES — developing</span>
            <span ref={countRef} className="text-[110px] italic leading-[.9] tracking-[-.03em] md:text-[200px]">000</span>
          </div>
        </div>

      <div className="ct-fade ct-label absolute left-5 right-5 top-5 flex justify-between text-[10px] md:left-12 md:right-12 md:top-9 md:text-[12px]">
        <span>{HERO_TAGS}</span>
        {featured && (
          <Link href={`/work/${featured.genreSlug}/${featured.eventSlug}`} className="focus-ring hidden hover:text-signal md:inline">
            <span className="text-signal-dark">Latest —</span> {featured.title}
          </Link>
        )}
      </div>

      {/* Mobile: absolutely placed like the 390 frame. Desktop: the prototype's flex row (Crisp · photo · takes). */}
      <div className="md:absolute md:inset-x-[2.5vw] md:top-[min(10.4vw,150px)] md:flex md:items-start md:justify-between">
      <Word text="Crisp" className="absolute left-3 top-[14.4vw] text-[38.5vw] md:static md:text-[min(20.83vw,300px)]" />

      {frame && (
        <Link
          href={`/work/${frame.genreSlug}/${frame.eventSlug}`}
          data-cursor="view"
          aria-label={`Open ${frame.title}`}
          className="focus-ring absolute left-[38.5vw] top-[53.8vw] block h-[71.8vw] w-[53.8vw] md:relative md:left-auto md:top-auto md:mt-[min(1.4vw,20px)] md:h-[min(33vw,476px)] md:w-[min(23.6vw,340px)] md:flex-none"
        >
          <div className="ct-shot absolute inset-0 overflow-hidden bg-well" data-shot-frames>
            {previous !== null && frames[previous] && (
              <Image key={`p${previous}`} src={frames[previous].cover} alt="" fill sizes="(min-width: 768px) 24vw, 54vw" className="object-cover" />
            )}
            <Image key={`c${current}`} src={frame.cover} alt={frame.title} fill priority sizes="(min-width: 768px) 24vw, 54vw" className={`object-cover ${previous !== null ? "ct-wipe" : ""}`} />
          </div>
          {(["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"] as const).map((pos) => (
            <span key={pos} aria-hidden className={`ct-fade pointer-events-none absolute h-4 w-4 -m-2.5 border-char md:h-[22px] md:w-[22px] md:-m-3.5 ${pos}`} />
          ))}
          <div className="ct-label absolute left-0 right-0 top-[calc(100%+14px)] flex items-start justify-between gap-3 text-[10px] leading-[1.5] md:top-[calc(100%+18px)] md:text-[11px]">
            <span className="flex-none whitespace-nowrap" data-frame-label>Frame {pad2(current + 1)} / {pad2(total)}</span>
            <span className="max-w-[110px] text-right [text-wrap:balance] md:max-w-[170px]" data-frame-title>{frame.title}</span>
          </div>
        </Link>
      )}

      <Word text="takes" className="absolute right-3 top-[142vw] text-[38.5vw] italic text-signal md:static md:mt-[min(20.83vw,300px)] md:text-[min(20.83vw,300px)]" />
      </div>

      <p className="ct-fade absolute left-5 top-[179.5vw] w-[85vw] text-[24px] leading-[1.15] [text-wrap:pretty] md:bottom-14 md:left-12 md:top-auto md:w-[min(30.5vw,440px)] md:text-[min(2.2vw,32px)]">
        {HERO_LINE.plain}<i>{HERO_LINE.italic}</i>
      </p>
      <div className="ct-fade ct-label absolute bottom-[60px] right-12 hidden items-center gap-3.5 text-[12px] md:flex">
        <span>Scroll</span>
        <span className="h-px w-16 bg-char" />
      </div>
    </section>
  );
}
