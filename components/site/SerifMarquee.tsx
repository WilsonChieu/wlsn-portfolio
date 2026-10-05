import { MARQUEE_TEXT } from "@/lib/site-content";

export default function SerifMarquee() {
  return (
    <div className="overflow-hidden whitespace-nowrap border-y border-char py-3 text-[40px] italic leading-none md:py-5 md:text-[76px]" aria-hidden>
      <div className="ct-marquee inline-flex">
        <span className="pr-[.6em]">{MARQUEE_TEXT}</span>
        <span className="pr-[.6em]">{MARQUEE_TEXT}</span>
      </div>
    </div>
  );
}
