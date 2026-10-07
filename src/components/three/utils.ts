import * as THREE from "three";

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Avancement 0 → 1 de `p` entre `a` et `b`. */
export const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
export const easeIn = (t: number) => t * t * t;
/** Interpolation exponentielle indépendante de la fréquence d’images. */
export const damp = (current: number, target: number, lambda: number, dt: number) => lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Générateur pseudo-aléatoire reproductible (mulberry32) : la même casse à chaque visite. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rectangle aux coins arrondis (arcs de cercle), centré sur l’origine. */
export function roundedRectPath<T extends THREE.Path>(path: T, w: number, h: number, r: number): T {
  const x = w / 2;
  const y = h / 2;
  path.moveTo(-x + r, -y);
  path.lineTo(x - r, -y);
  path.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x, y - r);
  path.absarc(x - r, y - r, r, 0, Math.PI / 2, false);
  path.lineTo(-x + r, y);
  path.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(-x, -y + r);
  path.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
}

/** Plaque extrudée aux coins arrondis, centrée en profondeur. Le biseau est compté dans `w`, `h` et `depth`. */
export function roundedSlab(w: number, h: number, r: number, depth: number, bevel = 0, curveSegments = 18) {
  const shape = roundedRectPath(new THREE.Shape(), w - bevel * 2, h - bevel * 2, Math.max(0.001, r - bevel));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.0005, depth - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments,
  });
  geometry.center();
  return geometry;
}

/** Surface plane aux coins arrondis, avec des UV 0 → 1 sur toute sa largeur et sa hauteur. */
export function roundedPlane(w: number, h: number, r: number, curveSegments = 18) {
  const geometry = new THREE.ShapeGeometry(roundedRectPath(new THREE.Shape(), w, h, r), curveSegments);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / w + 0.5, position.getY(i) / h + 0.5);
  uv.needsUpdate = true;
  return geometry;
}

/** WebGL disponible et pas désactivé (pilotes bloqués, navigateur durci…). */
export function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;
    (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Libère la mémoire GPU d’une scène : géométries, matériaux et textures. */
export function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of materials) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
      const uniforms = (material as THREE.ShaderMaterial).uniforms;
      if (uniforms) for (const u of Object.values(uniforms)) if (u.value instanceof THREE.Texture) u.value.dispose();
      material.dispose();
    }
  });
}

/** Famille de police réellement chargée par next/font (ex. « Inter ») pour dessiner dans un canvas. */
export function cssFont(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

/** Police du site pour les canvas : SF Pro sur les appareils Apple, Inter ailleurs. */
export function siteFont() {
  return `-apple-system, BlinkMacSystemFont, ${cssFont("--font-inter", "Inter")}, "Helvetica Neue", Arial, sans-serif`;
}
