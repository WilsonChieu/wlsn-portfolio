"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const scrollRef = useRef<Lenis | null>(null);

  const scrollToHash = useCallback((hash: string, immediate = false) => {
    let id: string;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return false; }
    const section = document.getElementById(id);
    if (!section) return false;
    const headerBottom = document.querySelector(".ct-header-wrap")?.getBoundingClientRect().bottom ?? 0;
    const padding = parseFloat(getComputedStyle(section).paddingTop) || 0;
    // Align the section's content, rather than its padded outer box, below the floating header.
    const top = Math.max(0, section.getBoundingClientRect().top + window.scrollY + padding - headerBottom - 24);
    if (scrollRef.current) scrollRef.current.scrollTo(top, { immediate, force: true });
    else window.scrollTo({ top, behavior: "instant" });
    return true;
  }, []);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ duration: 0.8, anchors: false, easing: (t) => 1 - Math.pow(1 - t, 3) });
    scrollRef.current = lenis;
    let rafId = 0;
    function raf(time: number) { lenis.raf(time); rafId = requestAnimationFrame(raf); }
    rafId = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(rafId); lenis.destroy(); scrollRef.current = null; };
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
      if (!scrollToHash(url.hash)) return;
      event.preventDefault();
      if (url.hash !== location.hash) window.history.pushState(window.history.state, "", url.href);
    };
    const onHistory = () => { if (location.hash) scrollToHash(location.hash, true); };
    document.addEventListener("click", onClick, true);
    window.addEventListener("hashchange", onHistory);
    window.addEventListener("popstate", onHistory);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("hashchange", onHistory);
      window.removeEventListener("popstate", onHistory);
    };
  }, [scrollToHash]);

  useEffect(() => {
    scrollRef.current?.scrollTo(window.scrollY, { immediate: true, force: true });
    if (location.hash) {
      const frame = requestAnimationFrame(() => scrollToHash(location.hash, true));
      return () => cancelAnimationFrame(frame);
    }
    if (scrollRef.current) scrollRef.current.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, scrollToHash]);

  return <>{children}</>;
}
