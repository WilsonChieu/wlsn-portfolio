import Image from "next/image";
import Link from "next/link";
import { pad2, plural, workSummary } from "@/lib/work-nav";
import type { WorkGenre } from "@/lib/works";

const ROW_MASK = "linear-gradient(to right,black 0%,black 45%,transparent 88%)";

export default function SelectedWork({ genres }: { genres: WorkGenre[] }) {
  return (
    <section id="work" className="px-5 pb-14 pt-[72px] md:px-12 md:pb-[120px] md:pt-[140px]">
      <div className="mb-6 flex items-baseline justify-between md:mb-10">
        <h2 className="text-[64px] leading-[.9] tracking-[-.03em] md:text-[min(8.3vw,120px)]">Selected <i>work</i></h2>
        <span className="ct-label hidden text-[12px] tracking-[.06em] md:inline">{workSummary(genres)}</span>
      </div>
      <p className="ct-label mb-5 text-[10px] md:hidden">{workSummary(genres)}</p>

      <ul className="hidden border-b border-char md:block">
        {genres.map((g, i) => (
          <li key={g.slug} className="border-t border-char">
            <Link href={`/work/${g.slug}`} data-cursor="view" className="focus-ring group relative block overflow-hidden">
              {g.cover && (
                <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:opacity-100" style={{ maskImage: ROW_MASK, WebkitMaskImage: ROW_MASK }}>
                  <Image src={g.cover} alt="" fill sizes="100vw" className="object-cover" />
                </div>
              )}
              <div className="relative grid grid-cols-[90px_1fr_auto] items-center gap-6 py-16">
                <span className="font-jet text-[13px] font-medium text-char/55 transition-colors group-hover:text-bone/75">{pad2(i + 1)}</span>
                <span className="text-[min(11.8vw,170px)] leading-[.9] tracking-[-.03em] transition-all duration-300 [text-shadow:0_2px_10px_rgba(17,17,16,0)] group-hover:translate-x-[14px] group-hover:italic group-hover:text-bone group-hover:[text-shadow:0_2px_10px_rgba(17,17,16,.7)]">{g.title}</span>
                <span className="ct-label text-right text-[12px] tracking-[.16em] text-char/55 transition-colors group-hover:text-bone/75">{g.meta} · {plural(g.events.length, "event")}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <ul className="flex flex-col gap-10 md:hidden">
        {genres.map((g, i) => (
          <li key={g.slug}>
            <Link href={`/work/${g.slug}`} className="focus-ring flex flex-col gap-3 border-t border-char pt-4">
              <span className="ct-label flex justify-between text-[10px]"><span>{pad2(i + 1)}</span><span>{g.meta} · {plural(g.events.length, "event")}</span></span>
              <span className="relative block aspect-[3/2] bg-well">
                {g.cover && <Image src={g.cover} alt="" fill sizes="100vw" className="object-cover" />}
              </span>
              <span className="flex items-end justify-between"><span className="text-[60px] leading-[.9] tracking-[-.03em]">{g.title}</span><span className="text-[26px] italic">→</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
