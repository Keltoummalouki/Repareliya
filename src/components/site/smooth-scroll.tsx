"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getLenis, setLenis } from "@/lib/lenis-store";

gsap.registerPlugin(ScrollTrigger);

/**
 * Défilement fluide du site public (Lenis), cadencé par le ticker de GSAP : ScrollTrigger,
 * la scène 3D et le défilement avancent sur la même image.
 * Lenis respecte prefers-reduced-motion (défilement 1:1, sans inertie) et laisse défiler
 * nativement les listes internes (menus déroulants, calendrier) grâce à allowNestedScroll.
 */
export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.95,
      // Les ancres (#tarifs…) défilent en douceur ; même décalage que scroll-padding-top.
      anchors: { offset: -96 },
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
    });
    setLenis(lenis);

    const offScroll = lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      offScroll();
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  // Nouvelle page : nouvelles dimensions.
  useEffect(() => {
    getLenis()?.resize();
  }, [pathname]);

  return null;
}
