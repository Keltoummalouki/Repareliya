import * as THREE from "three";
import { cornerExtent, CORNER_POWER, ROUNDED_RECT_GLSL, roundedRectDistance, roundedRectPath, seeded } from "./utils";

/*
 * Vitre brisée : un motif de fissures radial autour d’un point d’impact (triangulation de
 * Delaunay), chaque triangle devenant un éclat de verre épais. Tous les éclats tiennent dans une
 * seule géométrie ; c’est le GPU qui les écarte, les fait tourner et les ramène (uExplode),
 * dessine les fissures sur leurs arêtes et la vague lumineuse qui les « répare » (uHeal).
 * Le contour exact de la vitre (coins continus, bord poli, sérigraphie noire) est tracé au pixel
 * près par le shader : les éclats du pourtour débordent légèrement et sont rognés.
 */

type Point = { x: number; y: number; boundary: number };

export type ShardUniforms = {
  uExplode: { value: number };
  uHeal: { value: number };
  uCrack: { value: number };
  /** Liseré de Fresnel (0 → 1), pour voir la vitre quand elle est présentée de biais. */
  uSheen: { value: number };
  uTime: { value: number };
  uImpact: { value: THREE.Vector2 };
};

/** Rayon de la vague de réparation pour uHeal = 1 : elle couvre toute la vitre depuis l’impact. */
export const HEAL_REACH = 1.9;

function shardPoints(w: number, h: number, r: number, impact: THREE.Vector2, density: number, rand: () => number) {
  const points: Point[] = [];
  // Contour : points régulièrement espacés, numérotés pour reconnaître les arêtes du bord.
  const outline = roundedRectPath(new THREE.Path(), w, h, r);
  const spaced = outline.getSpacedPoints(Math.round(44 * Math.max(0.7, density)));
  spaced.pop(); // le dernier point recouvre le premier
  // Une corde coupe l’arrondi d’un coin : on pousse le polygone vers l’extérieur d’au moins la
  // flèche de cette corde (rayon de courbure minimal ≈ 0,75 r), pour qu’il couvre toute la vitre.
  const step = outline.getLength() / spaced.length;
  const overhang = (step * step) / (8 * 0.75 * r) + 0.001;
  spaced.forEach((p, i) => {
    const prev = spaced[(i + spaced.length - 1) % spaced.length];
    const next = spaced[(i + 1) % spaced.length];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const length = Math.hypot(tx, ty) || 1;
    points.push({ x: p.x + (ty / length) * overhang, y: p.y - (tx / length) * overhang, boundary: i });
  });
  const boundaryCount = points.length;
  const inside = (x: number, y: number, margin: number) => roundedRectDistance(x, y, w, h, r) < -margin;

  // Casse d’un vrai impact : des fissures partent du point de choc en rayons qui ondulent et se
  // dédoublent en s’éloignant ; des points posés le long de chaque rayon, à des distances de plus
  // en plus espacées, en font des chaînes d’arêtes radiales (éclats fins au centre, larges au loin).
  points.push({ x: impact.x, y: impact.y, boundary: -1 });
  const maxRays = Math.round(36 * density);
  const startRays = Math.max(6, Math.round(9 * density));
  let rays = Array.from({ length: startRays }, (_, k) => ((k + (rand() - 0.5) * 0.6) / startRays) * Math.PI * 2);
  for (let ring = 0; ring < 11; ring++) {
    const radius = 0.034 * 1.42 ** ring;
    if (ring % 2 === 1 && rays.length < maxRays) {
      const gap = (Math.PI * 2) / rays.length;
      rays = rays.flatMap((angle) => (rand() < 0.6 ? [angle - gap * 0.25, angle + gap * 0.25] : [angle]));
    }
    rays = rays.map((angle) => angle + (rand() - 0.5) * 0.09);
    for (const angle of rays) {
      const distance = radius * (0.88 + rand() * 0.24);
      const x = impact.x + Math.cos(angle) * distance;
      const y = impact.y + Math.sin(angle) * distance;
      if (inside(x, y, 0.03)) points.push({ x, y, boundary: -1 });
    }
  }
  for (let i = 0; i < Math.round(6 * density); i++) {
    const x = (rand() - 0.5) * (w - 0.1);
    const y = (rand() - 0.5) * (h - 0.1);
    if (inside(x, y, 0.04)) points.push({ x, y, boundary: -1 });
  }
  return { points, boundaryCount };
}

type Triangle = { a: number; b: number; c: number; x: number; y: number; r2: number };

function circumcircle(points: Point[], a: number, b: number, c: number): Triangle {
  const A = points[a];
  const B = points[b];
  const C = points[c];
  const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
  if (Math.abs(d) < 1e-12) return { a, b, c, x: 0, y: 0, r2: Infinity };
  const a2 = A.x * A.x + A.y * A.y;
  const b2 = B.x * B.x + B.y * B.y;
  const c2 = C.x * C.x + C.y * C.y;
  const x = (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d;
  const y = (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d;
  return { a, b, c, x, y, r2: (A.x - x) ** 2 + (A.y - y) ** 2 };
}

/** Triangulation de Delaunay (Bowyer-Watson), suffisante pour quelques centaines de points. */
function delaunay(input: Point[]) {
  const n = input.length;
  const points = input.slice();
  points.push({ x: -100, y: -100, boundary: -1 }, { x: 100, y: -100, boundary: -1 }, { x: 0, y: 100, boundary: -1 });
  let triangles: Triangle[] = [circumcircle(points, n, n + 1, n + 2)];
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const edges = new Map<string, [number, number]>();
    const kept: Triangle[] = [];
    for (const t of triangles) {
      if ((p.x - t.x) ** 2 + (p.y - t.y) ** 2 < t.r2) {
        for (const [u, v] of [
          [t.a, t.b],
          [t.b, t.c],
          [t.c, t.a],
        ]) {
          const key = u < v ? `${u}:${v}` : `${v}:${u}`;
          if (edges.has(key)) edges.delete(key);
          else edges.set(key, [u, v]);
        }
      } else kept.push(t);
    }
    for (const [u, v] of edges.values()) kept.push(circumcircle(points, u, v, i));
    triangles = kept;
  }
  return triangles.filter((t) => t.a < n && t.b < n && t.c < n).map((t) => [t.a, t.b, t.c] as const);
}

export type ShardSet = { geometry: THREE.BufferGeometry; edges: Float32Array; count: number };

/**
 * Éclats de la vitre avant, centrés sur l’origine (épaisseur sur Z).
 * Chaque sommet porte le centre de son éclat (aCenter), quatre valeurs aléatoires (aRand) et ses
 * coordonnées barycentriques (aBary) : 1 sur un sommet, 0 sur l’arête opposée. Les arêtes du
 * contour reçoivent un décalage qui les exclut du dessin des fissures.
 */
export function buildShards(w: number, h: number, r: number, thickness: number, impact: THREE.Vector2, density: number): ShardSet {
  const rand = seeded(20260925);
  const { points, boundaryCount } = shardPoints(w, h, r, impact, density, rand);
  const triangles = delaunay(points).filter(([a, b, c]) => {
    const A = points[a];
    const B = points[b];
    const C = points[c];
    return Math.abs((B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x)) > 1e-6;
  });

  const vertexCount = triangles.length * 24;
  const position = new Float32Array(vertexCount * 3);
  const normal = new Float32Array(vertexCount * 3);
  const center = new Float32Array(vertexCount * 3);
  const random = new Float32Array(vertexCount * 4);
  const bary = new Float32Array(vertexCount * 3);
  const crackSegments: number[] = [];
  let v = 0;

  const isBoundaryEdge = (P: Point, Q: Point) => {
    if (P.boundary < 0 || Q.boundary < 0) return false;
    const gap = Math.abs(P.boundary - Q.boundary);
    return gap === 1 || gap === boundaryCount - 1;
  };

  for (const [ia, ib, ic] of triangles) {
    const A = points[ia];
    let B = points[ib];
    let C = points[ic];
    if ((B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x) < 0) [B, C] = [C, B];
    const cx = (A.x + B.x + C.x) / 3;
    const cy = (A.y + B.y + C.y) / 3;
    const rnd = [rand(), rand(), rand(), rand()];
    const top = thickness / 2;
    const bottom = -thickness / 2;
    const off = [isBoundaryEdge(B, C) ? 2 : 0, isBoundaryEdge(C, A) ? 2 : 0, isBoundaryEdge(A, B) ? 2 : 0];

    const push = (x: number, y: number, z: number, nx: number, ny: number, nz: number, b: number[]) => {
      position.set([x, y, z], v * 3);
      normal.set([nx, ny, nz], v * 3);
      center.set([cx, cy, 0], v * 3);
      random.set(rnd, v * 4);
      bary.set(b, v * 3);
      v++;
    };
    const none = [9, 9, 9];

    // Face avant : porte les fissures.
    push(A.x, A.y, top, 0, 0, 1, [1 + off[0], off[1], off[2]]);
    push(B.x, B.y, top, 0, 0, 1, [off[0], 1 + off[1], off[2]]);
    push(C.x, C.y, top, 0, 0, 1, [off[0], off[1], 1 + off[2]]);
    // Face arrière.
    push(A.x, A.y, bottom, 0, 0, -1, none);
    push(C.x, C.y, bottom, 0, 0, -1, none);
    push(B.x, B.y, bottom, 0, 0, -1, none);
    // Tranches.
    for (const [P, Q] of [
      [A, B],
      [B, C],
      [C, A],
    ]) {
      const dx = Q.x - P.x;
      const dy = Q.y - P.y;
      const length = Math.hypot(dx, dy) || 1;
      const nx = dy / length;
      const ny = -dx / length;
      // Tranche du bord de la vitre (8) ou tranche interne entre deux éclats (9), effacée une fois réparée.
      const side = isBoundaryEdge(P, Q) ? [8, 8, 8] : none;
      push(P.x, P.y, top, nx, ny, 0, side);
      push(P.x, P.y, bottom, nx, ny, 0, side);
      push(Q.x, Q.y, bottom, nx, ny, 0, side);
      push(P.x, P.y, top, nx, ny, 0, side);
      push(Q.x, Q.y, bottom, nx, ny, 0, side);
      push(Q.x, Q.y, top, nx, ny, 0, side);
      if (!isBoundaryEdge(P, Q)) crackSegments.push(P.x, P.y, Q.x, Q.y);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute("aCenter", new THREE.BufferAttribute(center, 3));
  geometry.setAttribute("aRand", new THREE.BufferAttribute(random, 4));
  geometry.setAttribute("aBary", new THREE.BufferAttribute(bary, 3));
  geometry.computeBoundingSphere();
  // Les éclats s’envolent loin de leur place : la sphère englobante doit le prévoir.
  if (geometry.boundingSphere) geometry.boundingSphere.radius += 2.5;
  return { geometry, edges: new Float32Array(crackSegments), count: triangles.length };
}

/** Contour de la vitre et largeur de la sérigraphie noire qui court sous son pourtour. */
export type GlassOutline = { w: number; h: number; r: number; ink: number };

/**
 * Matériau verre physique (reflets de l’environnement) dont le shader déplace chaque éclat.
 * Mélange prémultiplié : le reflet s’ajoute à pleine intensité par-dessus ce qui est derrière,
 * que le verre n’assombrit que très peu — comme une vraie vitre, au lieu d’un voile gris.
 */
export function createShardMaterial(uniforms: ShardUniforms, outline: GlassOutline) {
  // Diffusion noire : le verre ne renvoie que des reflets (pas de voile laiteux sous les lampes).
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    metalness: 0,
    roughness: 0.035,
    ior: 1.5,
    specularIntensity: 1,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const vec2 = (x: number, y: number) => `vec2(${x.toFixed(5)}, ${y.toFixed(5)})`;
  const half = vec2(outline.w / 2, outline.h / 2);
  const corner = cornerExtent(outline.w, outline.h, outline.r).toFixed(5);

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        uniform float uExplode;
        uniform float uTime;
        uniform vec2 uImpact;
        attribute vec3 aCenter;
        attribute vec4 aRand;
        attribute vec3 aBary;
        varying vec3 vBary;
        varying vec2 vGlassPos;
        varying float vShardT;
        varying float vFace;
        varying vec3 vAxisX;
        varying vec3 vAxisY;
        mat3 rotationAxis(vec3 axis, float angle) {
          axis = normalize(axis);
          float s = sin(angle);
          float c = cos(angle);
          float oc = 1.0 - c;
          return mat3(
            oc * axis.x * axis.x + c, oc * axis.x * axis.y + axis.z * s, oc * axis.z * axis.x - axis.y * s,
            oc * axis.x * axis.y - axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z + axis.x * s,
            oc * axis.z * axis.x + axis.y * s, oc * axis.y * axis.z - axis.x * s, oc * axis.z * axis.z + c
          );
        }`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        /* glsl */ `
        // Chaque éclat part avec son propre retard, loin de l’impact et surtout vers la caméra :
        // le nuage reste autour du téléphone au lieu d’envahir la page.
        float shardT = clamp(uExplode * (1.0 + aRand.w * 0.6) - aRand.w * 0.3, 0.0, 1.0);
        shardT = shardT * shardT * (3.0 - 2.0 * shardT);
        vec2 away = aCenter.xy - uImpact;
        float closeness = 1.0 - min(length(away), 1.0);
        vec3 shardDir = normalize(vec3(away * (0.75 + aRand.x * 0.6) + (aRand.yz - 0.5) * 0.45, 0.9 + aRand.z * 1.3));
        float travel = (0.12 + aRand.y * 0.55 + closeness * 0.35) * shardT;
        vShardT = shardT;
        float spin = shardT * ((aRand.x - 0.5) * 8.0 + sin(uTime * (0.35 + aRand.y * 0.5) + aRand.w * 6.2831) * 0.35);
        mat3 shardRot = rotationAxis(vec3(aRand.y - 0.5, aRand.z - 0.5, aRand.x - 0.5) + 0.001, spin);
        vec3 drift = vec3(0.0, sin(uTime * (0.5 + aRand.x * 0.5) + aRand.y * 6.2831) * 0.03, cos(uTime * 0.4 + aRand.z * 6.2831) * 0.02) * shardT;
        vec3 shardOffset = shardDir * travel + drift;
        vec3 objectNormal = shardRot * vec3(normal);
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif`,
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `
        vec3 transformed = shardRot * (position - aCenter) + aCenter + shardOffset;
        vBary = aBary;
        vGlassPos = position.xy;
        // Face avant (+1), arrière (−1) ou tranche (0), et axes de l’éclat en repère vue.
        vFace = normal.z;
        vAxisX = normalize(normalMatrix * (shardRot * vec3(1.0, 0.0, 0.0)));
        vAxisY = normalize(normalMatrix * (shardRot * vec3(0.0, 1.0, 0.0)));`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        uniform float uHeal;
        uniform float uCrack;
        uniform float uSheen;
        uniform vec2 uImpact;
        varying vec3 vBary;
        varying vec2 vGlassPos;
        varying float vShardT;
        varying float vFace;
        varying vec3 vAxisX;
        varying vec3 vAxisY;
        ${ROUNDED_RECT_GLSL}
        float crackHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float crackNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(crackHash(i), crackHash(i + vec2(1.0, 0.0)), u.x), mix(crackHash(i + vec2(0.0, 1.0)), crackHash(i + vec2(1.0, 1.0)), u.x), u.y);
        }`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        /* glsl */ `#include <normal_fragment_maps>
        // Distance au bord de la vitre (négative à l’intérieur).
        float glassEdge = roundedRectDistance(vGlassPos, ${half}, ${corner});
        // Bord poli « 2,5D » : sur le dernier millimètre et demi, la face avant s’arrondit vers
        // l’extérieur et accroche la lumière en un filet net, comme sur une vraie vitre de téléphone.
        float roll = smoothstep(-0.0016, 0.0, glassEdge) * step(0.5, vFace);
        if (roll > 0.0) {
          vec2 q = max(abs(vGlassPos) - ${half} + ${corner}, 0.0);
          vec2 outward = q.x > 0.0 && q.y > 0.0 ? pow(q, vec2(${(CORNER_POWER - 1).toFixed(5)})) : (q.x > 0.0 ? vec2(1.0, 0.0) : vec2(0.0, 1.0));
          outward = normalize(outward) * sign(vGlassPos);
          normal = normalize(mix(normal, normalize(vAxisX * outward.x + vAxisY * outward.y), roll * roll * 0.9));
        }`,
      )
      .replace(
        "#include <opaque_fragment>",
        /* glsl */ `
        // Fissures : les arêtes des éclats, d’une finesse constante à l’écran.
        vec3 baryWidth = fwidth(vBary);
        vec3 baryEdge = smoothstep(vec3(0.0), baryWidth * 0.95, vBary);
        float crackLine = 1.0 - min(min(baryEdge.x, baryEdge.y), baryEdge.z);
        // Vague de réparation : elle part de l’impact et efface les fissures sur son passage.
        float fromImpact = length(vGlassPos - uImpact);
        float healRadius = uHeal * ${HEAL_REACH.toFixed(2)};
        float broken = smoothstep(healRadius - 0.05, healRadius, fromImpact);
        float waveFront = (1.0 - smoothstep(0.0, 0.06, abs(fromImpact - healRadius))) * step(0.0005, uHeal) * (1.0 - step(0.9995, uHeal));
        // Les fissures se lisent sur la vitre en place ; sur les éclats en vol, il ne reste qu’un liseré.
        float crack = crackLine * broken * uCrack * (1.0 - vShardT * 0.9);

        // Une cassure n’accroche la lumière que là où sa face regarde une lampe : l’éclat varie le long
        // de chaque fissure et glisse quand le téléphone tourne ; il faiblit loin de l’impact.
        float glint = smoothstep(0.45, 0.9, crackNoise(vGlassPos * 26.0 + normal.xy * 4.0));
        float crackLight = crack * (0.16 + 0.84 * glint) * mix(1.0, 0.4, smoothstep(0.12, 0.9, fromImpact));
        // Orientation de l’arête la plus proche, dans le plan de la vitre : les vraies fissures sont
        // radiales (et concentriques tout près de l’impact) ; les arêtes en biais restent discrètes.
        mat2 glassToScreen = mat2(dFdx(vGlassPos), dFdy(vGlassPos));
        if (abs(determinant(glassToScreen)) > 1e-14) {
          vec3 bdx = dFdx(vBary);
          vec3 bdy = dFdy(vBary);
          vec2 db = vBary.x < min(vBary.y, vBary.z) ? vec2(bdx.x, bdy.x) : (vBary.y < vBary.z ? vec2(bdx.y, bdy.y) : vec2(bdx.z, bdy.z));
          vec2 edgeNormal = inverse(transpose(glassToScreen)) * db;
          vec2 outward = vGlassPos - uImpact;
          float align = abs(dot(normalize(edgeNormal), outward / max(length(outward), 1e-4)));
          float radial = 1.0 - smoothstep(0.3, 0.62, align);
          float ring = smoothstep(0.72, 0.95, align) * (1.0 - smoothstep(0.1, 0.32, fromImpact));
          crackLight *= mix(0.14, 1.0, max(radial, ring));
        }

        float side = 1.0 - abs(vFace);
        // Face arrière collée à la dalle (aucun reflet) tant que l’éclat est en place.
        float bonded = step(vFace, -0.5) * (1.0 - vShardT);
        // Vitre en place encore intacte (avant l’impact) ou déjà réparée (derrière la vague) : un seul
        // panneau, les tranches internes des éclats ne se voient pas.
        float innerFace = step(8.5, vBary.x);
        float healed = innerFace * max(max(uHeal * uHeal, 1.0 - broken), side * (1.0 - uCrack)) * (1.0 - vShardT);

        vec3 light = outgoingLight * (1.0 - bonded);
        float alpha = 0.035 * (1.0 - bonded);
        // Sérigraphie noire sous le pourtour : opaque, le reflet du verre passe par-dessus.
        float aa = fwidth(glassEdge) + 1e-6;
        float ink = smoothstep(-${outline.ink.toFixed(5)} - aa, -${outline.ink.toFixed(5)} + aa, glassEdge) * (1.0 - side) * (1.0 - bonded);
        alpha = mix(alpha, 1.0, ink);
        // Tranches des éclats : le verre épais s’y allume d’un liseré vert d’eau.
        float grazing = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 3.0);
        light += vec3(0.42, 0.62, 0.58) * side * (1.0 - healed) * (0.015 + 0.3 * grazing);
        alpha += side * (1.0 - healed) * 0.12;
        light += vec3(1.0, 0.95, 0.9) * crackLight * 0.9;
        alpha = max(alpha, crack * 0.15 + crackLight * 0.6);
        light += vec3(0.16, 0.5, 1.0) * waveFront * 2.4;
        alpha = max(alpha, waveFront * 0.55);
        // Liseré de Fresnel : vue de biais (dos, vue éclatée), la vitre se dessine aussi par ses bords.
        light += vec3(0.78, 0.84, 0.95) * grazing * uSheen * 0.5 * (1.0 - innerFace);
        alpha += (grazing * 0.3 + 0.04) * uSheen * (1.0 - innerFace);
        light *= 1.0 - healed;
        alpha *= 1.0 - healed;
        // Contour exact de la vitre, lissé au pixel : ce qui déborde est rogné.
        float coverage = 1.0 - smoothstep(-aa, aa, glassEdge);
        diffuseColor.a = clamp(alpha, 0.0, 1.0) * coverage;
        gl_FragColor = vec4(light * coverage, diffuseColor.a);`,
      );
  };
  material.customProgramCacheKey = () => "repareliya-shards";
  return material;
}
