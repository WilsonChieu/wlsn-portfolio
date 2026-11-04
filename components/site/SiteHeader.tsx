"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { WHATSAPP_URL } from "@/lib/site-content";
type Props = {
  genres?: { slug: string; title: string }[];
  current?: string;
  presetsEnabled?: boolean;
};
function MenuIcon({ open }: { open: boolean }) {
  return <span aria-hidden="true" className={`ct-menu-icon ${open ? "is-open" : ""}`}><span /><span /><span /></span>;
}
export default function SiteHeader({ genres, current, presetsEnabled = false }: Props) {
  const [active, setActive] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const navId = useId();
  const menuRef = useRef<HTMLDialogElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, right: 0, top: 0, bottom: 0, ready: false });
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    if (!menuOpen) { menu.close(); setIconOpen(false); return; }
    menu.showModal();
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setIconOpen(true));
    });
    menu.querySelector<HTMLButtonElement>("button")?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = matchMedia("(min-width: 768px)");
    const onResize = () => { if (desktop.matches) setMenuOpen(false); };
    desktop.addEventListener("change", onResize);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = overflow;
      desktop.removeEventListener("change", onResize);
    };
  }, [menuOpen]);
  const selectedId = current ?? active;
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () => {
      const link = nav.querySelector<HTMLElement>("[aria-current]");
      if (!link) return;
      if (!nav.clientWidth) return;
      setIndicator({ left: link.offsetLeft, right: nav.clientWidth - link.offsetLeft - link.offsetWidth, top: link.offsetTop, bottom: nav.clientHeight - link.offsetTop - link.offsetHeight, ready: true });
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
  }, [genres, presetsEnabled]);
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
        ...(presetsEnabled ? [{ id: "presets", label: "Presets", href: "/#presets" }] : []),
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
            onClick={() => setMenuOpen(false)}
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
              style={{ clipPath: `inset(${indicator.top}px ${indicator.right}px ${indicator.bottom}px ${indicator.left}px round 30px)` }}
            >
              {links.map((link) => <span key={link.id} className="ct-nav-link">{link.label}</span>)}
            </div>
            {links.map((link) => {
              const selected = (current ?? active) === link.id;
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
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
            Let’s talk
            <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M7 17 17 7M7 7h10v10" />
            </svg>
          </a>
          <button type="button" className="focus-ring ct-menu-toggle" aria-expanded={menuOpen} aria-controls={navId} aria-label={menuOpen ? "Close navigation" : "Open navigation"} onClick={() => setMenuOpen((open) => !open)}>
            <MenuIcon open={iconOpen} />
          </button>
        </div>
      </header>
      <dialog ref={menuRef} id={navId} className="ct-mobile-menu" aria-label="Navigation" onCancel={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)} data-lenis-prevent>
        <div className="ct-mobile-menu-bar">
          <Link href="/" className="focus-ring ct-brand" aria-label="Crisptakes home" onClick={() => setMenuOpen(false)}>crisp<span>takes</span><span className="ct-brand-dot" /></Link>
          <button type="button" className="focus-ring ct-menu-toggle" aria-label="Close navigation" onClick={() => setMenuOpen(false)}>
            <MenuIcon open={iconOpen} />
          </button>
        </div>
        <nav className="ct-mobile-menu-links" aria-label={genres ? "Photography categories" : "Main navigation"}>
          {links.map((link) => <Link key={link.id} href={link.href} className="focus-ring ct-mobile-menu-link" aria-current={(current ?? active) === link.id ? (genres ? "page" : "location") : undefined} onClick={() => setMenuOpen(false)}>{link.label}</Link>)}
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="focus-ring ct-mobile-menu-contact" onClick={() => setMenuOpen(false)}>Let’s talk
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M7 7h10v10" /></svg>
          </a>
        </nav>
      </dialog>
    </>
  );
}
