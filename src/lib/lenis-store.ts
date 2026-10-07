import type Lenis from "lenis";

// Instance Lenis du site public (créée par <SmoothScroll />), partagée avec les composants
// qui doivent figer ou déplacer le défilement : menu mobile, préchargement, transitions de page.
let instance: Lenis | null = null;
const waiting = new Set<(lenis: Lenis) => void>();

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
  if (!lenis) return;
  for (const callback of waiting) callback(lenis);
  waiting.clear();
}

export function getLenis() {
  return instance;
}

/** Appelle `callback` dès que Lenis existe (tout de suite s’il existe déjà). Renvoie de quoi annuler. */
export function whenLenis(callback: (lenis: Lenis) => void) {
  if (instance) {
    callback(instance);
    return () => {};
  }
  waiting.add(callback);
  return () => waiting.delete(callback);
}
