"use client";

import gsap from "gsap";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ShardField } from "./shard-field";
import { supportsWebGL } from "./utils";

/**
 * Fond 3D des pages intérieures (éclats de verre), fixe derrière le haut de la page.
 * Chargé à la première page intérieure visitée puis conservé d’une page à l’autre (un seul
 * contexte WebGL) ; masqué sur l’accueil, qui a sa propre scène. L’image n’est recalculée que
 * tant que le haut de la page est à l’écran. Moins d’animations demandées : une image fixe.
 */
export function ShardBackdrop() {
  const pathname = usePathname();
  const active = pathname !== "/";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<ShardField | null>(null);
  const [ready, setReady] = useState(false);
  const firstPath = useRef(pathname);

  // Création à la première page intérieure, destruction au démontage du site.
  useEffect(() => {
    if (!active || fieldRef.current || !supportsWebGL()) return;
    let cancelled = false;
    const canvas = canvasRef.current!;
    import("./shard-field").then(({ ShardField }) => {
      if (cancelled) return;
      const quality = matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency ?? 8) <= 4 ? "low" : "high";
      const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      const field = new ShardField(canvas, { quality, theme });
      field.resize(window.innerWidth, window.innerHeight);
      field.setScroll(window.scrollY);
      fieldRef.current = field;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(
    () => () => {
      fieldRef.current?.dispose();
      fieldRef.current = null;
    },
    [],
  );

  // Boucle de rendu, thème, pointeur et défilement.
  useEffect(() => {
    const field = fieldRef.current;
    if (!ready || !field) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let looping = false;
    const update = () => {
      const shouldRun = active && !document.hidden && window.scrollY < window.innerHeight * 1.3;
      field.running = shouldRun;
      if (reduce) {
        if (shouldRun) field.renderFrame();
        return;
      }
      if (shouldRun && !looping) gsap.ticker.add(field.tick);
      if (!shouldRun && looping) gsap.ticker.remove(field.tick);
      looping = shouldRun;
    };
    const onScroll = () => {
      field.setScroll(window.scrollY);
      update();
    };
    const onResize = () => {
      field.resize(window.innerWidth, window.innerHeight);
      if (reduce) field.renderFrame();
    };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "mouse") field.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
    };
    const themeObserver = new MutationObserver(() => {
      field.setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
      if (reduce) field.renderFrame();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      themeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", update);
      gsap.ticker.remove(field.tick);
    };
  }, [ready, active]);

  // Changement de page intérieure : tourbillon.
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    if (active && !matchMedia("(prefers-reduced-motion: reduce)").matches) fieldRef.current?.swirl();
  }, [pathname, active]);

  return (
    <div className="shard-backdrop" data-hidden={!active || !ready} aria-hidden>
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
