"use client";

import { animate, stagger } from "animejs";
import clsx from "clsx";
import gsap from "gsap";
import { useEffect, useRef } from "react";

type Dot = { x: number; y: number; s: number; o: number };

/** Événement à déclencher sur le parent de la grille pour lancer une onde depuis un point (coordonnées écran). */
export const RIPPLE_EVENT = "dotgrid:ripple";

/**
 * Trame de points (anime.js) en fond de section : une onde la traverse au clic, ou quand le
 * parent déclenche RIPPLE_EVENT ; les points grossissent autour du pointeur, comme sous une loupe.
 * Dessinée dans un seul canvas, à la couleur du texte (currentColor). Fixe si l’appareil
 * demande moins d’animations.
 */
export function DotGrid({ className, gap = 34, radius = 1.4 }: { className?: string; gap?: number; radius?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const host = canvas.parentElement!;
    const ctx = canvas.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const base = 0.28;
    let dots: Dot[] = [];
    let cols = 1;
    let rows = 1;
    let width = 0;
    let height = 0;
    let color = "#fff";
    const accent = "#2997ff";
    const pointer = { x: -9999, y: -9999, inside: false };
    let animating = 0;
    let looping = false;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const dot of dots) {
        let s = dot.s;
        let o = dot.o;
        if (pointer.inside) {
          const d = Math.hypot(dot.x - pointer.x, dot.y - pointer.y);
          const lens = Math.max(0, 1 - d / 140);
          s += lens * 1.6;
          o = Math.min(1, o + lens * 0.6);
        }
        ctx.globalAlpha = o;
        ctx.fillStyle = s > 1.6 ? accent : color;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, radius * s, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const loop = () => draw();
    const syncLoop = () => {
      const need = !reduce && (pointer.inside || animating > 0);
      if (need && !looping) gsap.ticker.add(loop);
      if (!need && looping) gsap.ticker.remove(loop);
      looping = need;
      if (!need) draw();
    };

    const layout = () => {
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      color = getComputedStyle(canvas).color;
      cols = Math.max(1, Math.floor(width / gap));
      rows = Math.max(1, Math.floor(height / gap));
      const offsetX = (width - (cols - 1) * gap) / 2;
      const offsetY = (height - (rows - 1) * gap) / 2;
      dots = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) dots.push({ x: offsetX + c * gap, y: offsetY + r * gap, s: 1, o: base });
      draw();
    };

    const ripple = (clientX: number, clientY: number) => {
      if (reduce || !dots.length) return;
      const rect = canvas.getBoundingClientRect();
      const col = Math.min(cols - 1, Math.max(0, Math.round((clientX - rect.left - (width - (cols - 1) * gap) / 2) / gap)));
      const row = Math.min(rows - 1, Math.max(0, Math.round((clientY - rect.top - (height - (rows - 1) * gap) / 2) / gap)));
      animating++;
      syncLoop();
      animate(dots, {
        s: [
          { to: 2.8, duration: 240, ease: "outSine" },
          { to: 1, duration: 1100, ease: "outElastic(1, .55)" },
        ],
        o: [
          { to: 1, duration: 240, ease: "outSine" },
          { to: base, duration: 1100, ease: "outQuad" },
        ],
        delay: stagger(32, { grid: [cols, rows], from: row * cols + col }),
        onComplete: () => {
          animating = Math.max(0, animating - 1);
          syncLoop();
        },
      });
    };

    const onRipple = (event: Event) => {
      const { x, y } = (event as CustomEvent<{ x: number; y: number }>).detail;
      ripple(x, y);
    };
    const onDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("a, button, input, textarea, select, label")) return;
      ripple(event.clientX, event.clientY);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      if (!pointer.inside) {
        pointer.inside = true;
        syncLoop();
      }
    };
    const onLeave = () => {
      pointer.inside = false;
      syncLoop();
    };

    layout();
    const resize = new ResizeObserver(layout);
    resize.observe(host);
    host.addEventListener(RIPPLE_EVENT, onRipple);
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    const theme = new MutationObserver(() => {
      color = getComputedStyle(canvas).color;
      draw();
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      resize.disconnect();
      theme.disconnect();
      host.removeEventListener(RIPPLE_EVENT, onRipple);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      gsap.ticker.remove(loop);
    };
  }, [gap, radius]);

  return <canvas ref={canvasRef} className={clsx("pointer-events-none absolute inset-0", className)} aria-hidden />;
}
