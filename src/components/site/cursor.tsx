"use client";

import gsap from "gsap";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const INTERACTIVE = 'a[href], button:not(:disabled), [role="button"], [role="radio"], [role="tab"], [role="option"], label, summary, select, [data-cursor]';
const TEXT_ENTRY =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, [contenteditable="true"], iframe';

type CursorState = "idle" | "hover" | "label" | "text";

/**
 * Curseur personnalisé (souris uniquement) : un point gris qui suit le pointeur et un anneau qui
 * le rattrape avec inertie. Il s’efface sur les liens et boutons (leur texte reste lisible) et
 * affiche un libellé sur les éléments qui portent data-cursor-label (« Voir », « Tarifs »…).
 * Le pointeur natif reste visible : le curseur décore, il ne remplace rien. Masqué en CSS sur
 * les écrans tactiles.
 */
export function Cursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const resetRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const ringPos = root.querySelector<HTMLElement>("[data-cursor-ring]")!;
    const dotPos = root.querySelector<HTMLElement>("[data-cursor-dot]")!;
    const label = root.querySelector<HTMLElement>("[data-cursor-text]")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ringX = gsap.quickTo(ringPos, "x", { duration: reduce ? 0 : 0.55, ease: "power3.out" });
    const ringY = gsap.quickTo(ringPos, "y", { duration: reduce ? 0 : 0.55, ease: "power3.out" });
    const dotX = gsap.quickTo(dotPos, "x", { duration: reduce ? 0 : 0.1, ease: "power2.out" });
    const dotY = gsap.quickTo(dotPos, "y", { duration: reduce ? 0 : 0.1, ease: "power2.out" });

    let state: CursorState = "idle";
    let shown = false;
    const setState = (next: CursorState, text = "") => {
      if (next === "label") label.textContent = text;
      if (next === state) return;
      state = next;
      root.dataset.state = next;
    };
    resetRef.current = () => setState("idle");

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (!shown) {
        shown = true;
        gsap.set([ringPos, dotPos], { x: event.clientX, y: event.clientY });
        root.dataset.visible = "true";
      }
      ringX(event.clientX);
      ringY(event.clientY);
      dotX(event.clientX);
      dotY(event.clientY);
    };

    const over = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest(TEXT_ENTRY)) return setState("text");
      const labelled = target.closest<HTMLElement>("[data-cursor-label]");
      if (labelled) return setState("label", labelled.dataset.cursorLabel ?? "");
      setState(target.closest(INTERACTIVE) ? "hover" : "idle");
    };

    const down = () => (root.dataset.pressed = "true");
    const up = () => delete root.dataset.pressed;
    const leave = () => {
      shown = false;
      delete root.dataset.visible;
    };

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  // L’élément survolé a disparu avec l’ancienne page.
  useEffect(() => {
    resetRef.current();
  }, [pathname]);

  return (
    <div ref={rootRef} className="cursor" aria-hidden data-state="idle">
      <div className="cursor-pos" data-cursor-ring>
        <div className="cursor-ring">
          <span className="cursor-text" data-cursor-text />
        </div>
      </div>
      <div className="cursor-pos" data-cursor-dot>
        <div className="cursor-dot" />
      </div>
    </div>
  );
}
