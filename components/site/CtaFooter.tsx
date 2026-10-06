import { CTA, INSTAGRAM, WHATSAPP_URL, XIAOHONGSHU } from "@/lib/site-content";

export default function CtaFooter() {
  return (
    <footer data-cursor-tone="light" className="bg-signal px-5 pb-8 pt-16 text-white md:px-12 md:pb-10 md:pt-[120px]">
      <p className="ct-label mb-[18px] text-[10px] md:mb-7 md:text-[13px] md:tracking-[.06em]">{CTA.kicker}</p>
      <div className="md:flex md:items-end md:justify-between md:gap-10">
        <p className="text-[92px] leading-[.84] tracking-[-.035em] md:text-[min(17.4vw,250px)] md:leading-[.82]">
          {CTA.line1}<br />{CTA.line2}<i>{CTA.italic}</i>
        </p>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="focus-ring mt-8 flex flex-none justify-between gap-6 rounded-full bg-white px-6 py-[18px] text-[26px] italic text-char transition-colors hover:bg-char hover:text-white md:mb-6 md:mt-0 md:px-10 md:py-6 md:text-[36px]">
          Book a Shoot<span>→</span>
        </a>
      </div>
      <div className="ct-label mt-14 flex flex-col gap-2.5 border-t border-white pt-4 text-[10px] md:mt-[100px] md:flex-row-reverse md:justify-between md:pt-5 md:text-[12px] md:tracking-[.06em]">
        <span className="flex flex-col gap-2.5 md:flex-row md:gap-6">
          <a href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer" className="focus-ring py-1 hover:text-char md:py-0">{INSTAGRAM.label}</a>
          {XIAOHONGSHU.url ? <a href={XIAOHONGSHU.url} target="_blank" rel="noopener noreferrer" className="focus-ring py-1 hover:text-char md:py-0">{XIAOHONGSHU.label}</a> : <span className="py-1 md:py-0">{XIAOHONGSHU.label}</span>}
        </span>
        <span>© {new Date().getFullYear()} CRISPTAKES — Wilson</span>
      </div>
    </footer>
  );
}
