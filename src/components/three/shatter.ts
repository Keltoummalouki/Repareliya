import * as THREE from "three";
import { roundedRectPath, seeded } from "./utils";

/*
 * Vitre brisée : un motif de fissures radial autour d’un point d’impact (triangulation de
 * Delaunay), chaque triangle devenant un éclat de verre épais. Tous les éclats tiennent dans une
 * seule géométrie ; c’est le GPU qui les écarte, les fait tourner et les ramène (uExplode),
 * dessine les fissures sur leurs arêtes et la vague lumineuse qui les « répare » (uHeal).
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

function insideRoundedRect(x: number, y: number, w: number, h: number, r: number) {
  const qx = Math.abs(x) - (w / 2 - r);
  const qy = Math.abs(y) - (h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r < 0;
}

function shardPoints(w: number, h: number, r: number, impact: THREE.Vector2, density: number, rand: () => number) {
  const points: Point[] = [];
  // Contour : points régulièrement espacés, numérotés pour reconnaître les arêtes du bord.
  const outline = roundedRectPath(new THREE.Path(), w, h, r);
  const spaced = outline.getSpacedPoints(Math.round(44 * Math.max(0.7, density)));
  spaced.pop(); // le dernier point recouvre le premier
  spaced.forEach((p, i) => points.push({ x: p.x * 0.99999, y: p.y * 0.99999, boundary: i }));
  const boundaryCount = points.length;

  // Anneaux de plus en plus espacés autour de l’impact : éclats fins au centre, larges au loin.
  points.push({ x: impact.x, y: impact.y, boundary: -1 });
  for (let ring = 0; ring < 11; ring++) {
    const radius = 0.034 * 1.42 ** ring;
    const count = Math.max(5, Math.round((6 + ring * 3.2) * density));
    const offset = rand() * Math.PI * 2;
    for (let k = 0; k < count; k++) {
      const angle = offset + (k / count) * Math.PI * 2 + (rand() - 0.5) * ((Math.PI * 2) / count) * 0.7;
      const distance = radius * (0.8 + rand() * 0.4);
      const x = impact.x + Math.cos(angle) * distance;
      const y = impact.y + Math.sin(angle) * distance;
      if (insideRoundedRect(x, y, w - 0.06, h - 0.06, r)) points.push({ x, y, boundary: -1 });
    }
  }
  for (let i = 0; i < Math.round(16 * density); i++) {
    const x = (rand() - 0.5) * (w - 0.1);
    const y = (rand() - 0.5) * (h - 0.1);
    if (insideRoundedRect(x, y, w - 0.08, h - 0.08, r)) points.push({ x, y, boundary: -1 });
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

/** Matériau verre physique (reflets de l’environnement) dont le shader déplace chaque éclat. */
export function createShardMaterial(uniforms: ShardUniforms) {
  // Diffusion noire : le verre ne renvoie que des reflets (pas de voile laiteux sous les lampes).
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    ior: 1.52,
    specularIntensity: 1,
    envMapIntensity: 1.15,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

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
        vGlassPos = position.xy;`,
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
        varying float vShardT;`,
      )
      .replace(
        "#include <opaque_fragment>",
        /* glsl */ `
        // Fissures : les arêtes des éclats, d’une largeur constante à l’écran.
        vec3 baryWidth = fwidth(vBary);
        vec3 baryEdge = smoothstep(vec3(0.0), baryWidth * 1.3, vBary);
        float crackLine = 1.0 - min(min(baryEdge.x, baryEdge.y), baryEdge.z);
        // Vague de réparation : elle part de l’impact et efface les fissures sur son passage.
        float fromImpact = length(vGlassPos - uImpact);
        float healRadius = uHeal * ${HEAL_REACH.toFixed(2)};
        float broken = smoothstep(healRadius - 0.05, healRadius, fromImpact);
        float waveFront = (1.0 - smoothstep(0.0, 0.06, abs(fromImpact - healRadius))) * step(0.0005, uHeal) * (1.0 - step(0.9995, uHeal));
        // Les fissures se lisent sur la vitre en place ; sur les éclats en vol, il ne reste qu’un liseré.
        float crack = crackLine * broken * uCrack * (1.0 - vShardT * 0.75);
        outgoingLight += vec3(1.0, 0.92, 0.82) * crack * 1.2;
        outgoingLight += vec3(0.16, 0.5, 1.0) * waveFront * 2.8;
        float shine = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
        diffuseColor.a = clamp(diffuseColor.a + shine * 0.16 + crack * 0.8 + waveFront * 0.9, 0.0, 0.85);
        // Vitre réparée et en place : un seul panneau lisse, les tranches internes des éclats disparaissent.
        float innerFace = step(8.5, vBary.x);
        diffuseColor.a *= 1.0 - innerFace * uHeal * (1.0 - vShardT);
        // Liseré de Fresnel : vue de biais (dos, vue éclatée), la vitre se dessine par ses reflets.
        float grazing = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 3.0);
        outgoingLight += vec3(0.78, 0.84, 0.95) * grazing * uSheen * 0.9;
        diffuseColor.a = clamp(diffuseColor.a + (grazing * 0.55 + 0.07) * uSheen * (1.0 - innerFace), 0.0, 0.9);
        #include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () => "repareliya-shards";
  return material;
}
