"use client";

import { useGSAP } from "@gsap/react";
import { animate, scrambleText } from "animejs";
import clsx from "clsx";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useRef, useState, type ReactNode } from "react";
import { markStageReady, resetStageReady, whenPageVisible } from "@/lib/page-gate";
import type { PhoneScene, Quality } from "./phone-scene";
import { supportsWebGL } from "./utils";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const PARTS = [
  { anchor: "glass", label: "Vitre avant", phone: false },
  { anchor: "display", label: "Écran", phone: true },
  { anchor: "frame", label: "Châssis & boutons", phone: false },
  { anchor: "board", label: "Carte mère", phone: true },
  { anchor: "port", label: "Connecteur de charge", short: "Connecteur", phone: true },
  { anchor: "battery", label: "Batterie", phone: true },
  { anchor: "back", label: "Vitre arrière", phone: false },
  { anchor: "camera", label: "Caméra", phone: true },
];

type Mode = "loading" | "3d" | "static";

/**
 * Scène d’ouverture de l’accueil : un long passage dont le contenu reste à l’écran (sticky)
 * pendant que le défilement raconte la réparation en 3D. Une seule timeline GSAP, pilotée par
 * ScrollTrigger, anime les textes et transmet sa progression à la scène three.js, qui suit à
 * l’image près. Sans WebGL ou si l’appareil demande moins d’animations : la photo de l’atelier
 * et le texte d’accroche, sans défilement prolongé.
 */
export function PhoneStage({ intro, finale, fallback }: { intro: ReactNode; finale: ReactNode; fallback: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("loading");

  useGSAP(
    (context) => {
      const section = sectionRef.current!;
      const canvas = canvasRef.current!;
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce || !supportsWebGL()) {
        setMode("static");
        markStageReady();
        return;
      }

      const q = <T extends Element = HTMLElement>(selector: string) => section.querySelector<T>(selector)!;
      const qa = <T extends Element = HTMLElement>(selector: string) => [...section.querySelectorAll<T>(selector)];
      let scene: PhoneScene | null = null;
      let disposed = false;
      const cleanups: (() => void)[] = [];
      resetStageReady();

      // ---------------------------------------------------------- Textes pilotés par le défilement
      const meterText = q("[data-meter-text]");
      let meterState = "";
      const setMeter = (text: string) => {
        if (text === meterState) return;
        meterState = text;
        meterText.textContent = text;
      };
      const scramble = (el: Element | null) => {
        if (el) animate(el, { innerHTML: scrambleText({ chars: "A-Z0-9", revealRate: 70 }) });
      };

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: 0.6 },
        onUpdate: () => {
          const p = timeline.progress();
          scene?.setProgress(p);
          const repair = Math.min(1, Math.max(0, (p - 0.1) / 0.35));
          setMeter(repair >= 1 ? "Écran réparé" : repair > 0 ? `Réparation ${String(Math.round(repair * 100)).padStart(3, "0")} %` : "Faites défiler pour réparer");
          section.dataset.repaired = String(repair >= 1);
        },
      });
      timeline
        .to(q("[data-chapter='intro']"), { autoAlpha: 0, y: -90, duration: 0.12, ease: "power2.in" }, 0.03)
        .fromTo(q("[data-meter-fill]"), { scaleX: 0 }, { scaleX: 1, duration: 0.35 }, 0.1)
        .to(q("[data-meter]"), { autoAlpha: 0, y: 20, duration: 0.04 }, 0.55)
        // Centrage par GSAP (xPercent/yPercent) : il remplace la propriété CSS translate dès qu’il anime.
        .fromTo(q(".stage-word"), { xPercent: -32, yPercent: -50, autoAlpha: 0 }, { xPercent: -68, yPercent: -50, autoAlpha: 1, duration: 0.42 }, 0.28)
        .to(q(".stage-word"), { autoAlpha: 0, duration: 0.06 }, 0.62)
        .fromTo(q("[data-chapter='repair']"), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.05, ease: "power2.out" }, 0.46)
        .call(() => scramble(q("[data-chapter='repair'] [data-scramble]")), [], 0.47)
        .to(q("[data-chapter='repair']"), { autoAlpha: 0, y: -50, duration: 0.05, ease: "power2.in" }, 0.58)
        .fromTo(q("[data-chapter='parts']"), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.05, ease: "power2.out" }, 0.68)
        .call(() => scramble(q("[data-chapter='parts'] [data-scramble]")), [], 0.69)
        .fromTo(qa("[data-label-inner]"), { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.03, stagger: 0.007, ease: "back.out(2)" }, 0.7)
        .fromTo(qa("[data-label-line]"), { scaleX: 0 }, { scaleX: 1, duration: 0.03, stagger: 0.007 }, 0.71)
        .to(qa("[data-label-inner]"), { autoAlpha: 0, duration: 0.03 }, 0.85)
        .to(q("[data-chapter='parts']"), { autoAlpha: 0, y: -50, duration: 0.04, ease: "power2.in" }, 0.85)
        .fromTo(q("[data-chapter='finale']"), { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.07, ease: "power2.out" }, 0.91)
        .set({}, {}, 1);

      // ------------------------------------------------------------------ Entrée de l’accroche
      const title = q("[data-intro-title]");
      const items = qa("[data-intro-item]");
      gsap.set([title, ...items], { autoAlpha: 0 });
      let introPlayed = false;
      const playTextIntro = () => {
        if (introPlayed) return;
        introPlayed = true;
        context.add(() => {
          const split = SplitText.create(title, { type: "lines,words,chars", mask: "lines" });
          // Perspective sur chaque ligne : les lettres basculent vraiment en 3D.
          gsap.set(split.masks, { perspective: 700, overflowClipMargin: "0.15em" });
          gsap
            .timeline({ defaults: { ease: "expo.out" } })
            .set(title, { autoAlpha: 1 })
            .from(split.chars, { yPercent: 120, rotateX: -80, transformOrigin: "50% 100% -20px", duration: 1.3, stagger: 0.022 }, 0.15)
            .fromTo(items, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.09, clearProps: "transform" }, 0.55)
            .call(() => split.revert(), [], "+=0.1");
        });
      };

      // --------------------------------------------------------------------------- Scène 3D
      const coarse = matchMedia("(pointer: coarse)").matches;
      const nav = navigator as Navigator & { deviceMemory?: number };
      const quality: Quality = coarse || (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 ? "low" : "high";
      const labels = qa("[data-anchor]").map((el) => ({ el, anchor: el.dataset.anchor! }));
      const sticky = q(".stage-sticky");

      import("./phone-scene")
        .then(async ({ PhoneScene }) => {
          if (disposed) return;
          scene = new PhoneScene(canvas, { quality, labels });
          scene.onContextLostCallback = () => setMode("static");
          const rect = sticky.getBoundingClientRect();
          scene.resize(rect.width, rect.height);
          scene.setProgress(timeline.progress());
          await scene.init();
          if (disposed) return;
          gsap.ticker.add(scene.tick);
          setMode("3d");

          // Page déjà avancée (retour arrière) : pas de chute, la scène reprend où on en était.
          const deep = timeline.progress() > 0.15;
          if (deep) scene.skipIntro();
          else scene.prepareIntro();
          markStageReady();
          cleanups.push(
            whenPageVisible(() => {
              if (!deep) scene?.playIntro(() => section.classList.add("is-impact"));
              playTextIntro();
            }),
          );
        })
        .catch(() => {
          setMode("static");
          markStageReady();
          playTextIntro();
        });

      // Taille, visibilité et pointeur.
      const resize = new ResizeObserver(([entry]) => scene?.resize(entry.contentRect.width, entry.contentRect.height));
      resize.observe(sticky);
      const io = new IntersectionObserver(([entry]) => scene?.setVisible(entry.isIntersecting && !document.hidden));
      io.observe(section);
      const onVisibility = () => scene?.setVisible(!document.hidden && section.getBoundingClientRect().bottom > 0);
      document.addEventListener("visibilitychange", onVisibility);
      const onPointer = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        scene?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
      };
      window.addEventListener("pointermove", onPointer, { passive: true });

      // Filet de sécurité : si la scène tarde, l’accroche s’affiche quand même.
      const fallbackTimer = window.setTimeout(() => whenPageVisible(playTextIntro), 5000);

      return () => {
        disposed = true;
        window.clearTimeout(fallbackTimer);
        for (const cleanup of cleanups) cleanup();
        resize.disconnect();
        io.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pointermove", onPointer);
        if (scene) {
          gsap.ticker.remove(scene.tick);
          scene.dispose();
        }
      };
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} data-stage data-mode={mode} data-header-tone="dark" className="stage" aria-label="Accueil">
      <div className="stage-sticky">
        <div className="stage-bg" aria-hidden />
        <p className="stage-word" aria-hidden>
          Seconde vie
        </p>
        <canvas ref={canvasRef} className="stage-canvas" aria-hidden />
        <div className="stage-fallback">{fallback}</div>

        <div data-chapter="intro" className="stage-chapter stage-chapter--intro">
          <div className="container-page">{intro}</div>
        </div>

        <div data-chapter="repair" className="stage-chapter stage-chapter--repair" aria-hidden>
          <div className="container-page">
            <p className="stage-kicker" data-scramble>
              02 — Réparation
            </p>
            <p className="stage-display">
              Réparé<span className="text-gradient">.</span>
            </p>
            <p className="stage-note">Vitre remplacée, écran testé : comme au premier jour.</p>
          </div>
        </div>

        <div data-chapter="parts" className="stage-chapter stage-chapter--parts">
          <div className="container-page">
            <p className="stage-kicker" data-scramble>
              03 — Diagnostic
            </p>
            <h2 className="stage-heading">
              Chaque pièce
              <br />
              <span className="text-gradient">compte.</span>
            </h2>
            <p className="stage-note">
              Écran, batterie, connecteur, caméra, carte mère : on identifie la pièce en cause et on ne remplace que ce qui doit l’être.
            </p>
          </div>
        </div>

        <div className="stage-labels" aria-hidden>
          {PARTS.map((part, index) => (
            <div key={part.anchor} data-anchor={part.anchor} data-side="right" className={clsx("stage-label", !part.phone && "max-md:hidden")}>
              {/* Trois niveaux : position (scène 3D), alignement du point sur la pièce (CSS), apparition (GSAP) */}
              <div className="stage-label-align">
                <div data-label-inner className="stage-label-inner">
                  <span className="stage-label-dot" />
                  <span data-label-line className="stage-label-line" />
                  <span className="stage-label-text">
                    <span className="stage-label-index">{String(index + 1).padStart(2, "0")}</span>
                    {"short" in part ? (
                      <>
                        <span className="max-md:hidden">{part.label}</span>
                        <span className="md:hidden">{part.short}</span>
                      </>
                    ) : (
                      part.label
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div data-chapter="finale" className="stage-chapter stage-chapter--finale">
          <div className="container-page">{finale}</div>
        </div>

        <div data-meter className="stage-meter" aria-hidden>
          <span className="stage-meter-track">
            <span data-meter-fill className="stage-meter-fill" />
          </span>
          <span data-meter-text className="stage-meter-text">
            Faites défiler pour réparer
          </span>
        </div>
      </div>
    </section>
  );
}
