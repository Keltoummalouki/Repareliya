"use client";

import gsap from "gsap";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getLenis } from "@/lib/lenis-store";
import { holdPage } from "@/lib/page-gate";

const LABELS: Record<string, string> = {
  "/": "Accueil",
  "/tarifs": "Tarifs",
  "/devis": "Devis",
  "/accessoires": "Accessoires",
  "/realisations": "Réalisations",
  "/avis": "Avis",
  "/contact": "Contact",
  "/mentions-legales": "Mentions légales",
  "/confidentialite": "Confidentialité",
};

const labelFor = (pathname: string) => LABELS[pathname] ?? (pathname.startsWith("/reparation") ? "Réparation" : "Repareliya");

type Phase = "idle" | "covering" | "covered";

/**
 * Transition entre les pages du site public : un clic sur un lien interne fait monter deux
 * rideaux (orange puis sombre) portant le nom de la destination ; la navigation part une fois
 * l’écran couvert, et les rideaux se lèvent quand la nouvelle page a remplacé son squelette.
 * Ignorée pour les ancres et filtres de la même page, les nouveaux onglets, les touches de
 * modification et si l’appareil demande moins d’animations.
 */
export function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const phase = useRef<Phase>("idle");
  const release = useRef<() => void>(() => {});
  const safety = useRef<number | undefined>(undefined);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const revealRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = rootRef.current!;
    const label = root.querySelector<HTMLElement>("[data-curtain-label]")!;
    const panels = root.querySelectorAll<HTMLElement>("[data-curtain-panel]");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");

    const setLabel = (text: string) => {
      label.replaceChildren(
        ...[...text].map((char) => {
          const span = document.createElement("span");
          span.textContent = char === " " ? " " : char;
          return span;
        }),
      );
      return label.children;
    };

    const cover = (href: string, destination: string) => {
      if (phase.current !== "idle") return router.push(href);
      phase.current = "covering";
      release.current = holdPage();
      root.dataset.active = "true";
      const chars = setLabel(labelFor(destination));
      timeline.current?.kill();
      timeline.current = gsap
        .timeline()
        // y: 0 — GSAP lirait sinon le translateY(100%) du CSS comme un décalage en pixels, qui s’ajouterait à yPercent.
        .set(panels, { y: 0, yPercent: 100 })
        .to(panels, { yPercent: 0, duration: 0.5, ease: "power4.inOut", stagger: 0.07 })
        .fromTo(chars, { yPercent: 115 }, { yPercent: 0, duration: 0.45, ease: "power3.out", stagger: 0.022 }, 0.28)
        .add(() => {
          phase.current = "covered";
          getLenis()?.scrollTo(0, { immediate: true, force: true });
          router.push(href);
          // La navigation n’aboutit pas (erreur réseau…) : on rend quand même la main.
          safety.current = window.setTimeout(() => revealRef.current(), 5000);
        });
    };

    revealRef.current = () => {
      if (phase.current !== "covered") return;
      window.clearTimeout(safety.current);
      phase.current = "idle";
      release.current();
      timeline.current?.kill();
      timeline.current = gsap
        .timeline({ onComplete: () => delete root.dataset.active })
        .to(label.children, { yPercent: -115, duration: 0.35, ease: "power2.in", stagger: 0.015 })
        .to([...panels].reverse(), { yPercent: -100, duration: 0.75, ease: "power4.inOut", stagger: 0.08 }, 0.1);
    };

    const onClick = (event: MouseEvent) => {
      if (reduce.matches || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      if (/^\/(admin|d)(\/|$)/.test(url.pathname)) return;
      // Le lien next/link voit l’événement annulé et laisse la navigation à ce composant ;
      // ses autres gestionnaires (fermeture du menu mobile…) s’exécutent normalement.
      event.preventDefault();
      cover(url.pathname + url.search + url.hash, url.pathname);
    };

    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.clearTimeout(safety.current);
      timeline.current?.kill();
      release.current();
    };
  }, [router]);

  // Nouvelle page affichée : on attend qu’elle remplace son squelette de chargement (au plus 1,5 s).
  useEffect(() => {
    if (phase.current !== "covered") return;
    const until = performance.now() + 1500;
    let frame = 0;
    const check = () => {
      if (document.querySelector('main [aria-busy="true"]') && performance.now() < until) {
        frame = requestAnimationFrame(check);
        return;
      }
      revealRef.current();
    };
    frame = requestAnimationFrame(check);
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <div ref={rootRef} className="curtain" aria-hidden>
      <div data-curtain-panel className="curtain-panel curtain-panel--brand" />
      <div data-curtain-panel className="curtain-panel curtain-panel--night">
        <p className="curtain-caption">Repareliya · Atelier de réparation</p>
        <p data-curtain-label className="curtain-label" />
      </div>
    </div>
  );
}
