"use client";

import Image from "next/image";
import Link from "next/link";
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
  const frame = frames[frames.length - 1];
  const total = frames.length;
  return (
    <section className="relative h-[205vw] overflow-hidden md:h-[min(59.7vw,860px)]">
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
            <Image src={frame.cover} alt={frame.title} fill priority sizes="(min-width: 768px) 24vw, 54vw" className="object-cover" />
          </div>
          {(["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"] as const).map((pos) => (
            <span key={pos} aria-hidden className={`ct-fade pointer-events-none absolute h-4 w-4 -m-2.5 border-char md:h-[22px] md:w-[22px] md:-m-3.5 ${pos}`} />
          ))}
          <div className="ct-label absolute left-0 right-0 top-[calc(100%+14px)] flex items-start justify-between gap-3 text-[10px] leading-[1.5] md:top-[calc(100%+18px)] md:text-[11px]">
            <span className="flex-none whitespace-nowrap" data-frame-label>Frame {pad2(total)} / {pad2(total)}</span>
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
