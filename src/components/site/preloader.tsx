"use client";

import { createTimeline, scrambleText, spring, svg } from "animejs";
import { useEffect, useRef } from "react";
import { LOGO_PATH } from "@/components/icons";
import { getLenis, whenLenis } from "@/lib/lenis-store";
import { finishIntro, isIntroPending, waitForStage } from "@/lib/page-gate";

// Libération différée de la page au démontage : en développement, React monte, démonte puis
// remonte chaque effet (StrictMode) ; le remontage annule cette libération et rejoue l’entrée.
let releaseTimer: number | undefined;

/**
 * Écran de préchargement, au premier passage de la session (anime.js) : le pictogramme se
 * dessine trait par trait puis se remplit, la barre et le compteur suivent le chargement de la
 * scène 3D, et le rideau se lève pendant que le téléphone entre en scène. Affiché par le CSS dès
 * le premier rendu (html[data-intro]), jamais si l’appareil demande moins d’animations ; il
 * s’efface seul si le script ne prend pas la main.
 */
export function Preloader({ name }: { name: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.clearTimeout(releaseTimer);
    const root = rootRef.current;
    if (!root || !isIntroPending()) return;
    root.style.animation = "none"; // le script a pris la main : plus besoin du filet de sécurité CSS
    const cancelLenis = whenLenis((lenis) => lenis.stop());

    const q = <T extends Element = HTMLElement>(key: string) => root.querySelector<T>(`[data-pl="${key}"]`)!;
    const [outline] = svg.createDrawable(q<SVGPathElement>("path"));
    const count = q("count");
    const progress = { value: 0 };
    const renderCount = () => {
      count.textContent = String(Math.round(progress.value)).padStart(3, "0");
    };
    const hasStage = Boolean(document.querySelector("[data-stage]"));

    let disposed = false;
    const enter = createTimeline({ defaults: { ease: "outExpo" } })
      .add(q("mark"), { opacity: [0, 1], y: [16, 0], duration: 800 }, 0)
      .add(outline, { draw: ["0 0", "0 1"], duration: 1400, ease: "inOutQuad" }, 60)
      .add(q("path"), { fillOpacity: [0, 1], duration: 600, ease: "outQuad" }, 1150)
      .add(q("word"), { clipPath: ["inset(0% 100% 0% 0%)", "inset(0% 0% 0% 0%)"], duration: 1200, ease: "inOutExpo" }, 350)
      .add(q("bar"), { scaleX: [0, 0.7], duration: 1400, ease: "outCubic" }, 0)
      .add(progress, { value: [0, 70], duration: 1400, ease: "outCubic", onUpdate: renderCount }, 0)
      .add(q("status"), { innerHTML: scrambleText({ chars: "A-Z", revealRate: 40 }) }, 150);

    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    Promise.all([enter.then(() => {}), fontsReady, hasStage ? waitForStage(4500) : Promise.resolve()]).then(() => {
      if (disposed) return;
      createTimeline({ defaults: { ease: "outCubic" } })
        .add(q("bar"), { scaleX: 1, duration: 550 }, 0)
        .add(progress, { value: 100, duration: 550, onUpdate: renderCount }, 0)
        .add(q("status"), { innerHTML: scrambleText({ text: "Seconde vie activée", chars: "A-Z", revealRate: 50 }) }, 0)
        .add(q("mark"), { scale: [1, 1.12, 1], ease: spring({ stiffness: 120, damping: 9 }) }, 150)
        .then(() => {
          if (disposed) return;
          // Le rideau se lève ; la scène démarre son entrée à mi-course pour que les deux se chevauchent.
          createTimeline()
            .add(q("content"), { y: [0, -70], opacity: [1, 0], duration: 600, ease: "inQuad" }, 0)
            .add(root, { clipPath: ["inset(0% 0% 0% 0%)", "inset(0% 0% 100% 0%)"], duration: 1050, ease: "inOutExpo" }, 200)
            .call(() => {
              finishIntro();
              getLenis()?.start();
            }, 520)
            .then(() => {
              root.hidden = true;
            });
        });
    });

    return () => {
      disposed = true;
      cancelLenis();
      enter.revert();
      // Démontage en cours de route (navigation) : la page ne doit pas rester figée.
      releaseTimer = window.setTimeout(() => {
        finishIntro();
        getLenis()?.start();
      });
    };
  }, []);

  return (
    <div ref={rootRef} className="preloader" aria-hidden>
      <div className="preloader-glow" />
      <div data-pl="content" className="preloader-content">
        <svg data-pl="mark" viewBox="0 0 539 860" className="preloader-mark">
          <path data-pl="path" fillRule="evenodd" d={LOGO_PATH} className="preloader-path" />
        </svg>
        <p data-pl="word" className="preloader-word">
          {name}
        </p>
        <span className="preloader-bar">
          <span data-pl="bar" />
        </span>
      </div>
      <p data-pl="status" className="preloader-status">
        Diagnostic en cours
      </p>
      <p data-pl="count" className="preloader-count">
        000
      </p>
    </div>
  );
}
