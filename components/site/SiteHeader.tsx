import Link from "next/link";
import { PRESETS_ENABLED, WHATSAPP_URL } from "@/lib/site-content";

export default function SiteHeader() {
  const link = "focus-ring transition-colors hover:text-signal";
  return (
    <header className="ct-fade flex items-center justify-between border-b border-char px-5 py-3 md:px-12 md:py-7">
      <Link href="/" className={`${link} text-[22px] tracking-[.04em] md:text-[30px]`}>CRISPTAKES</Link>
      <nav className="flex items-center gap-9 text-[20px] md:text-[22px]">
        <a href="#work" className={`${link} hidden md:inline`}>Work</a>
        {PRESETS_ENABLED && <a href="#presets" className={`${link} hidden md:inline`}>Presets</a>}
        <a href="#faq" className={`${link} hidden md:inline`}>FAQ</a>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={`${link} italic text-signal`}>
          <span className="md:hidden">Book →</span>
          <span className="hidden md:inline">Book a shoot →</span>
        </a>
      </nav>
    </header>
  );
}
