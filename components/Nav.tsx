"use client";

export default function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-6 md:px-12 md:py-8">
      <a href="#hero" className="font-display text-lg font-extrabold uppercase tracking-tight focus-ring">
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
    </header>
  );
}
