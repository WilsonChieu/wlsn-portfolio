"use client";

import { useEffect, useState } from "react";

const SCROLL_THRESHOLD = 64;

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-6 transition-all duration-300 md:px-12 md:py-8 ${
        scrolled
          ? "border-b border-line bg-paper/90 py-5 text-ink shadow-sm backdrop-blur-md md:py-6"
          : "border-b border-transparent bg-transparent text-paper"
      }`}
    >
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
    </header>
  );
}
