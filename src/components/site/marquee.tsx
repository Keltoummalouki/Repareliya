"use client";

import { useGSAP } from "@gsap/react";
import clsx from "clsx";
import gsap from "gsap";
import { useRef, type ReactNode } from "react";
import { getLenis } from "@/lib/lenis-store";

gsap.registerPlugin(useGSAP);

/**
 * Bandeau qui défile sans fin. Sa vitesse et son inclinaison suivent l’élan du défilement de la
 * page (Lenis), et il change de sens quand on remonte. Les copies servant à boucler restent
 * cliquables, mais muettes pour les lecteurs d’écran et hors du parcours clavier. Immobile si
 * l’appareil demande moins d’animations.
 */
export function Marquee({
  children,
  speed = 60,
  reverse = false,
  copies = 4,
  pauseOnHover = false,
  className,
  trackClassName,
}: {
  children: ReactNode;
  /** Pixels par seconde, au repos. */
  speed?: number;
  reverse?: boolean;
  copies?: number;
  pauseOnHover?: boolean;
  className?: string;
  trackClassName?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current!;
      const track = root.firstElementChild as HTMLElement;
      // Copies cliquables à la souris, mais hors du parcours clavier (elles sont muettes pour les lecteurs d’écran).
      for (const el of root.querySelectorAll("[data-marquee-clone] :is(a, button)")) el.setAttribute("tabindex", "-1");
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const loop = gsap.to(track, { xPercent: -100 / copies, ease: "none", repeat: -1, duration: 1 });
      const setDuration = () => {
        const progress = loop.progress();
        loop.duration(Math.max(4, track.scrollWidth / copies / speed));
        // Loin dans les répétitions : la boucle peut tourner à l’envers sans jamais buter sur le début.
        loop.totalTime(loop.duration() * (500 + progress));
      };
      setDuration();

      let direction = reverse ? -1 : 1;
      let boost = 0;
      let hovering = false;
      const skew = gsap.quickTo(track, "skewX", { duration: 0.5, ease: "power3.out" });
      const tick = () => {
        const velocity = getLenis()?.velocity ?? 0;
        if (Math.abs(velocity) > 0.5) direction = (velocity > 0 ? 1 : -1) * (reverse ? -1 : 1);
        boost += (Math.min(Math.abs(velocity) * 0.18, 6) - boost) * 0.08;
        loop.timeScale(hovering ? 0.15 * direction : direction * (1 + boost));
        skew(gsap.utils.clamp(-8, 8, -velocity * 0.25));
      };
      gsap.ticker.add(tick);

      const resize = new ResizeObserver(setDuration);
      resize.observe(track);
      const enter = () => (hovering = pauseOnHover);
      const leave = () => (hovering = false);
      root.addEventListener("pointerenter", enter);
      root.addEventListener("pointerleave", leave);
      return () => {
        gsap.ticker.remove(tick);
        resize.disconnect();
        root.removeEventListener("pointerenter", enter);
        root.removeEventListener("pointerleave", leave);
      };
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className={clsx("marquee", className)}>
      <div className={clsx("marquee-track", trackClassName)}>
        {Array.from({ length: copies }, (_, index) =>
          index === 0 ? (
            <div key={index} className="marquee-copy">
              {children}
            </div>
          ) : (
            <div key={index} className="marquee-copy" aria-hidden data-marquee-clone>
              {children}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
