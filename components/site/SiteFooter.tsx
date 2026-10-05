import { WHATSAPP_URL } from "@/lib/site-content";

export default function SiteFooter() {
  return (
    <footer className="ct-label flex flex-col gap-3.5 border-t border-char px-5 pb-10 pt-6 text-[11px] tracking-[.12em] md:flex-row md:justify-between md:px-12 md:py-6 md:text-[12px]">
      <span className="md:order-1">© {new Date().getFullYear()} CRISPTAKES — Wilson</span>
      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="focus-ring order-first py-1.5 text-signal hover:text-char md:order-2 md:py-0">Book a shoot →</a>
    </footer>
  );
}
