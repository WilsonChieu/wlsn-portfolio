"use client";

import { useEffect, useState, type ReactNode } from "react";

const SCROLL_THRESHOLD = 64;

export default function ScrollHeader({ children }: { children: ReactNode }) {
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
      {children}
    </header>
  );
}
