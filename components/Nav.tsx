import ScrollHeader from "@/components/ScrollHeader";

export default function Nav() {
  return (
    <ScrollHeader>
      <a href="#hero" className="font-display text-lg font-bold uppercase tracking-tight focus-ring">
        CRISP<span className="text-olive">TAKES</span>
      </a>
      <nav className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.16em] md:gap-8">
        <a href="#work" className="hidden transition-colors hover:text-olive md:inline focus-ring">
          Work
        </a>
        <a href="#about" className="hidden transition-colors hover:text-olive md:inline focus-ring">
          About
        </a>
        <a href="#contact" className="transition-colors hover:text-olive focus-ring">
          Book
        </a>
      </nav>
    </ScrollHeader>
  );
}
