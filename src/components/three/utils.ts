import * as THREE from "three";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";

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

/*
 * Coins « continus » à la manière d’Apple : la courbure naît progressivement au lieu de sauter
 * d’un coup comme sur un arc de cercle, ce qui évite la cassure des reflets là où le bord
 * rejoint l’arrondi. Chaque coin est un quart de superellipse |x|ⁿ + |y|ⁿ = aⁿ qui commence à
 * CORNER_SPREAD × r du sommet et passe, sur la diagonale, au même point qu’un arc de rayon r.
 */
const CORNER_SPREAD = 1.55;
export const CORNER_POWER = -1 / Math.log2(1 - (Math.SQRT2 - 1) / (Math.SQRT2 * CORNER_SPREAD));

/** Étendue d’un coin de rayon visuel `r` sur chaque bord (bornée par la taille du rectangle). */
export const cornerExtent = (w: number, h: number, r: number) => Math.min(r * CORNER_SPREAD, w / 2, h / 2);

/** Rectangle aux coins continus, centré sur l’origine, parcouru dans le sens trigonométrique. */
export function roundedRectPath<T extends THREE.Path>(path: T, w: number, h: number, r: number, segments = 24): T {
  const x = w / 2;
  const y = h / 2;
  const a = cornerExtent(w, h, r);
  const e = 2 / CORNER_POWER;
  const corner = (cx: number, cy: number, start: number) => {
    for (let i = 1; i <= segments; i++) {
      const t = start + (i / segments) * (Math.PI / 2);
      const c = Math.cos(t);
      const s = Math.sin(t);
      path.lineTo(cx + a * Math.sign(c) * Math.abs(c) ** e, cy + a * Math.sign(s) * Math.abs(s) ** e);
    }
  };
  path.moveTo(-x + a, -y);
  path.lineTo(x - a, -y);
  corner(x - a, -y + a, -Math.PI / 2);
  path.lineTo(x, y - a);
  corner(x - a, y - a, 0);
  path.lineTo(-x + a, y);
  corner(-x + a, y - a, Math.PI / 2);
  path.lineTo(-x, -y + a);
  corner(-x + a, -y + a, Math.PI);
  return path;
}

/** Distance signée (négative à l’intérieur) au contour de `roundedRectPath`, exacte près du bord. */
export function roundedRectDistance(px: number, py: number, w: number, h: number, r: number) {
  const a = cornerExtent(w, h, r);
  const qx = Math.abs(px) - (w / 2 - a);
  const qy = Math.abs(py) - (h / 2 - a);
  if (qx > 0 && qy > 0) {
    const n = CORNER_POWER;
    const f = (qx ** n + qy ** n) ** (1 / n);
    return (f - a) / Math.hypot((qx / f) ** (n - 1), (qy / f) ** (n - 1));
  }
  return Math.max(qx, qy) - a;
}

/** La même distance en GLSL : `roundedRectDistance(p, demi-largeur et demi-hauteur, étendue du coin)`. */
export const ROUNDED_RECT_GLSL = /* glsl */ `
  float roundedRectDistance(vec2 p, vec2 halfSize, float a) {
    vec2 q = abs(p) - halfSize + a;
    if (q.x > 0.0 && q.y > 0.0) {
      float n = ${CORNER_POWER.toFixed(5)};
      float f = pow(pow(q.x, n) + pow(q.y, n), 1.0 / n);
      return (f - a) / length(pow(q / f, vec2(n - 1.0)));
    }
    return max(q.x, q.y) - a;
  }
`;

/**
 * Plaque extrudée aux coins continus, centrée en profondeur. Le biseau est compté dans `w`, `h`
 * et `depth`. Normales lissées sur les arrondis, arêtes vives conservées : les reflets glissent
 * sur le biseau au lieu de s’y briser en facettes.
 */
export function roundedSlab(w: number, h: number, r: number, depth: number, bevel = 0, segments = 24) {
  const shape = roundedRectPath(new THREE.Shape(), w - bevel * 2, h - bevel * 2, Math.max(0.001, r - bevel), segments);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.0005, depth - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
  });
  geometry.center();
  return toCreasedNormals(geometry, Math.PI / 5);
}

/** Surface plane aux coins continus, avec des UV 0 → 1 sur toute sa largeur et sa hauteur. */
export function roundedPlane(w: number, h: number, r: number, segments = 24) {
  const geometry = new THREE.ShapeGeometry(roundedRectPath(new THREE.Shape(), w, h, r, segments));
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
