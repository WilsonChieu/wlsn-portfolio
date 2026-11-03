import { ABOUT } from "@/lib/site-content";

export default function AboutSection() {
  return (
    <section id="about" className="flex flex-col gap-6 px-5 pb-20 pt-10 md:grid md:grid-cols-12 md:gap-6 md:px-12 md:pb-40">
      <p className="ct-label text-[10px] md:col-span-2 md:pt-5 md:text-[12px] md:tracking-[.06em]">About</p>
      <p className="text-[44px] leading-none tracking-[-.02em] [text-wrap:pretty] md:col-span-10 md:col-start-3 md:text-[min(6.4vw,92px)] md:tracking-[-.025em]">
        {ABOUT.lead.plain}<i>{ABOUT.lead.italic}</i> <i className="text-signal">{ABOUT.lead.accent}</i>
      </p>
      <p className="text-[20px] leading-[1.35] [text-wrap:pretty] md:col-span-4 md:col-start-3 md:mt-16 md:text-[25px]">{ABOUT.left}</p>
      <p className="text-[20px] leading-[1.35] [text-wrap:pretty] md:col-span-4 md:col-start-8 md:mt-16 md:text-[25px]">{ABOUT.right}</p>
    </section>
  );
}
