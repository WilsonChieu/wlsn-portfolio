"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PRESETS_ENABLED, WHATSAPP_URL } from "@/lib/site-content";
type Props = {
  genres?: { slug: string; title: string }[];
  current?: string;
};
export default function SiteHeader({ genres, current }: Props) {
  const [active, setActive] = useState("home");
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, right: 0, ready: false });
  const selectedId = current ?? active;
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () => {
      const link = nav.querySelector<HTMLElement>("[aria-current]");
      if (!link) return;
      setIndicator({ left: link.offsetLeft, right: nav.clientWidth - link.offsetLeft - link.offsetWidth, ready: true });
    };
    update();
    const resize = new ResizeObserver(update);
    resize.observe(nav);
    nav.querySelectorAll("a").forEach((link) => resize.observe(link));
    return () => resize.disconnect();
  }, [selectedId, genres]);
  useEffect(() => {
    if (genres) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-15% 0px -55% 0px" },
    );
    ["home", "work", "about", "presets", "faq"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [genres]);
  const links = genres
    ? genres.map((g) => ({
        id: g.slug,
        label: g.title,
        href: `/work/${g.slug}`,
      }))
    : [
        { id: "home", label: "Home", href: "/#home" },
        { id: "work", label: "Work", href: "/#work" },
        { id: "about", label: "About", href: "/#about" },
        ...(PRESETS_ENABLED ? [{ id: "presets", label: "Presets", href: "/#presets" }] : []),
        { id: "faq", label: "FAQ", href: "/#faq" },
      ];
  return (
    <>
      <header className="ct-header-wrap">
        <div className="ct-header">
          <Link
            href="/"
            className="focus-ring ct-brand"
            aria-label="Crisptakes home"
          >
            crisp<span>takes</span>
            <span className="ct-brand-dot" />
          </Link>
          <nav
            ref={navRef}
            aria-label={genres ? "Photography categories" : "Main navigation"}
            className="ct-nav"
          >
            <div
              aria-hidden="true"
              className={`ct-nav-indicator ${indicator.ready ? "is-ready" : ""}`}
              style={{ clipPath: `inset(0 ${indicator.right}px 0 ${indicator.left}px round 30px)` }}
            >
              {links.map((link) => <span key={link.id} className="ct-nav-link">{link.label}</span>)}
            </div>
            {links.map((link) => {
              const selected = (current ?? active) === link.id;
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  aria-current={
                    selected ? (genres ? "page" : "location") : undefined
                  }
                  className={`focus-ring ct-nav-link ${selected ? "is-active" : ""}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring ct-book"
          >
            Let’s talk <span aria-hidden>↗</span>
          </a>
        </div>
      </header>

    </>
  );
}
