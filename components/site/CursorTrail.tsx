"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Desktop-only flourish from the design: a red cursor that grows into "View" over photos, trailing fading dots.
// Over red sections (data-cursor-tone="light") it turns white so it stays visible.
export default function CursorTrail() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mounted) return;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    const cursor = cursorRef.current;
    if (!fine || reduced || !canvas || !cursor) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    document.documentElement.classList.add("ct-cursor-none");
    const disc = cursor.firstElementChild as HTMLElement;
    const label = disc.firstElementChild as HTMLElement;
    const pts: { x: number; y: number; l: number; light: boolean }[] = [];
    let x = -999,
      y = -999,
      cx = -999,
      cy = -999;
    let lx: number | null = null,
      ly = 0;
    let inside = false,
      hover = false,
      light = false,
      raf = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      raf = 0;
      // Points are stored in page coordinates so the trail scrolls with the page, as in the design.
      const px = x + scrollX,
        py = y + scrollY;
      if (inside) {
        if (lx === null) {
          lx = px;
          ly = py;
        }
        const dx = px - lx,
          dy = py - ly,
          n = Math.floor(Math.hypot(dx, dy) / 7);
        for (let i = 1; i <= n; i++)
          pts.push({ x: lx + (dx * i) / n, y: ly + (dy * i) / n, l: 1, light });
        if (n) {
          lx = px;
          ly = py;
        }
      } else lx = null;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of pts) p.l *= 0.93;
      for (const tone of [false, true]) {
        ctx.fillStyle = tone ? "#ffffff" : "#ec3013";
        ctx.beginPath();
        for (const p of pts) {
          if (p.light !== tone) continue;
          const r = 2.4 * p.l,
            sx = p.x - scrollX,
            sy = p.y - scrollY;
          ctx.moveTo(sx + r, sy);
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
        }
        ctx.fill();
      }
      const alive = pts.filter((p) => p.l > 0.08).slice(-160);
      pts.length = 0;
      pts.push(...alive);
      const ox = cx,
        oy = cy;
      cx += (x - cx) * 0.4;
      cy += (y - cy) * 0.4;
      cursor.style.opacity = inside ? "1" : "0";
      cursor.style.transform = `translate(${cx}px,${cy}px)`;
      disc.style.transform = `scale(${hover ? 1 : 0.12})`;
      disc.style.backgroundColor = light ? "#ffffff" : "";
      label.style.color = light ? "#ec3013" : "";
      label.style.opacity = hover ? "1" : "0";
      if (pts.length || Math.abs(cx - ox) + Math.abs(cy - oy) > 0.2) wake();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      if (!inside) {
        cx = x;
        cy = y;
      }
      inside = true;
      const target = e.target as Element | null;
      hover = !!target?.closest?.('[data-cursor="view"]');
      light = !!target?.closest?.('[data-cursor-tone="light"]');
      wake();
    };
    const onScroll = () => {
      const target = inside ? document.elementFromPoint(x, y) : null;
      hover = !!target?.closest('[data-cursor="view"]');
      light = !!target?.closest('[data-cursor-tone="light"]');
      wake();
    };
    const onLeave = () => {
      inside = false;
      hover = false;
      light = false;
      wake();
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.documentElement.classList.remove("ct-cursor-none");
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [mounted]);

  if (!mounted) return null;

  // A portal keeps viewport coordinates independent of animated page transforms.
  return createPortal(
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[80] h-screen w-screen"
      />
      <div
        ref={cursorRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[81] opacity-0"
      >
        <div className="-ml-[42px] -mt-[42px] flex h-[84px] w-[84px] scale-[.12] items-center justify-center rounded-full bg-signal font-serif text-[24px] italic text-white transition-transform duration-200 ease-[cubic-bezier(.23,1,.32,1)]">
          <span className="opacity-0 transition-opacity duration-200">
            View
          </span>
        </div>
      </div>
    </>,
    document.body,
  );
}
