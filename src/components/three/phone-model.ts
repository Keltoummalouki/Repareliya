import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { LOGO_PATH } from "@/components/icons";
import { PhoneScreen } from "./screen";
import { buildShards, createShardMaterial, type ShardUniforms } from "./shatter";
import { Sparks } from "./sparks";
import { roundedPlane, roundedRectPath, roundedSlab, seeded, siteFont } from "./utils";

/*
 * Téléphone modélisé en code (aucun fichier 3D à télécharger) : châssis en titane, vitre
 * arrière dépolie frappée du pictogramme, module photo, et à l’intérieur batterie, carte mère
 * et connecteur de charge. Chaque pièce vit dans sa propre couche pour la vue éclatée.
 * Repère : 1 unité ≈ 10 cm, face avant vers +Z.
 */

export const PHONE = { w: 0.74, h: 1.5, d: 0.082, r: 0.118 } as const;
const { w: W, h: H, d: D, r: R } = PHONE;

export const LAYERS = ["glass", "display", "frame", "board", "port", "battery", "back", "camera"] as const;
export type LayerName = (typeof LAYERS)[number];

// Décalage de chaque couche dans la vue éclatée.
const EXPLODE: Record<LayerName, [number, number, number]> = {
  glass: [0, 0, 0.66],
  display: [0, 0, 0.43],
  frame: [0, 0, 0.16],
  board: [0, 0.05, -0.1],
  port: [0, -0.17, -0.1],
  battery: [0, -0.02, -0.32],
  back: [0, 0, -0.54],
  camera: [0.02, 0.05, -0.76],
};

export type PhoneModel = {
  root: THREE.Group;
  layers: Record<LayerName, THREE.Group>;
  explode: Record<LayerName, THREE.Vector3>;
  anchors: Record<string, THREE.Object3D>;
  shardUniforms: ShardUniforms;
  screen: PhoneScreen;
  sparks: Sparks;
  glass: { w: number; h: number; impact: THREE.Vector2 };
  dispose: () => void;
};

function createMaterials() {
  return {
    titanium: new THREE.MeshPhysicalMaterial({ color: 0x9c9ea3, metalness: 1, roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    polished: new THREE.MeshPhysicalMaterial({ color: 0xcdced2, metalness: 1, roughness: 0.14 }),
    backGlass: new THREE.MeshPhysicalMaterial({ color: 0x2b2d32, metalness: 0.2, roughness: 0.36, clearcoat: 1, clearcoatRoughness: 0.08 }),
    plateau: new THREE.MeshPhysicalMaterial({ color: 0x313338, metalness: 0.3, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.04 }),
    lens: new THREE.MeshPhysicalMaterial({
      color: 0x07080a,
      metalness: 0.4,
      roughness: 0.05,
      clearcoat: 1,
      iridescence: 1,
      iridescenceIOR: 1.7,
      iridescenceThicknessRange: [180, 520],
    }),
    lensCore: new THREE.MeshStandardMaterial({ color: 0x0c1b33, metalness: 0.2, roughness: 0.2, emissive: 0x0b1f45, emissiveIntensity: 0.7 }),
    flash: new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 0.35, roughness: 0.4 }),
    black: new THREE.MeshStandardMaterial({ color: 0x060607, roughness: 0.55, metalness: 0.2 }),
    pcb: new THREE.MeshStandardMaterial({ color: 0x0f3d35, roughness: 0.62, metalness: 0.15 }),
    chip: new THREE.MeshStandardMaterial({ color: 0x121315, roughness: 0.35, metalness: 0.4 }),
    shield: new THREE.MeshPhysicalMaterial({ color: 0xc6c9ce, metalness: 1, roughness: 0.3 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd9a74b, metalness: 1, roughness: 0.28 }),
    foil: new THREE.MeshPhysicalMaterial({ color: 0xb0b5bd, metalness: 0.9, roughness: 0.36 }),
    logo: new THREE.MeshPhysicalMaterial({ color: 0xe6e7ea, metalness: 1, roughness: 0.1, clearcoat: 1 }),
  };
}

/** Pictogramme de la marque en relief, lisible de dos (face −Z). */
function backLogo(material: THREE.Material, height: number) {
  const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 539 860"><path fill-rule="evenodd" d="${LOGO_PATH}"/></svg>`);
  const shapes = svg.paths.flatMap((path) => path.toShapes());
  const geometry = new THREE.ExtrudeGeometry(shapes, { depth: 10, bevelEnabled: false, curveSegments: 8 });
  geometry.center();
  // Axe Y du SVG vers le bas, et lecture de dos : une demi-rotation autour de Z remet tout d’aplomb.
  geometry.rotateZ(Math.PI);
  const scale = height / 860;
  geometry.scale(scale, scale, scale);
  return new THREE.Mesh(geometry, material);
}

/** Étiquette imprimée de la batterie. */
function batteryLabel() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 846;
  const ctx = canvas.getContext("2d")!;
  const font = siteFont();
  ctx.fillStyle = "#1d1d1f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const band = ctx.createLinearGradient(0, 0, 0, canvas.height);
  band.addColorStop(0, "#2997ff");
  band.addColorStop(1, "#0071e3");
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, 20, canvas.height);

  ctx.fillStyle = "#f5f5f7";
  ctx.save();
  ctx.translate(58, 58);
  ctx.scale(72 / 860, 72 / 860);
  ctx.fill(new Path2D(LOGO_PATH), "evenodd");
  ctx.restore();
  ctx.font = `600 36px ${font}`;
  ctx.fillText("Repareliya", 114, 112);
  ctx.font = `600 132px ${font}`;
  ctx.fillText("Li-ion", 46, 340);
  ctx.font = `500 46px ${font}`;
  ctx.fillText("Batterie neuve", 54, 410);
  ctx.globalAlpha = 0.6;
  ctx.font = `400 28px ${font}`;
  ctx.fillText("Testée · Calibrée", 54, 462);
  for (let i = 0; i < 6; i++) {
    ctx.globalAlpha = 0.2;
    ctx.fillRect(54, 560 + i * 28, 290 + ((i * 53) % 120), 9);
  }
  ctx.globalAlpha = 0.8;
  ctx.font = `600 24px ${font}`;
  ctx.fillText("Réparé · Testé · Garanti", 54, 790);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(430, 700);
  ctx.lineTo(462, 756);
  ctx.lineTo(398, 756);
  ctx.closePath();
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function buildPhone({ quality, pixelRatio }: { quality: "high" | "low"; pixelRatio: number }): PhoneModel {
  const m = createMaterials();
  const geometries: THREE.BufferGeometry[] = [];
  const keep = <G extends THREE.BufferGeometry>(geometry: G) => (geometries.push(geometry), geometry);

  const root = new THREE.Group();
  const layers = {} as Record<LayerName, THREE.Group>;
  const explode = {} as Record<LayerName, THREE.Vector3>;
  for (const name of LAYERS) {
    layers[name] = new THREE.Group();
    layers[name].name = name;
    explode[name] = new THREE.Vector3(...EXPLODE[name]);
    root.add(layers[name]);
  }
  const anchors: Record<string, THREE.Object3D> = {};
  const anchor = (layer: LayerName, x: number, y: number, z: number) => {
    const point = new THREE.Object3D();
    point.position.set(x, y, z);
    layers[layer].add(point);
    anchors[layer] = point;
  };
  const add = (layer: LayerName, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(keep(geometry), material);
    mesh.position.set(x, y, z);
    layers[layer].add(mesh);
    return mesh;
  };

  // ---------------------------------------------------------------- Châssis et boutons
  const bevel = 0.008;
  const rim = roundedRectPath(new THREE.Shape(), W - bevel * 2, H - bevel * 2, R - bevel);
  rim.holes.push(roundedRectPath(new THREE.Path(), W - 0.05 + bevel * 2, H - 0.05 + bevel * 2, R - 0.025 + bevel));
  const rimGeometry = new THREE.ExtrudeGeometry(rim, { depth: D - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 28 });
  rimGeometry.center();
  add("frame", rimGeometry, m.titanium);
  const button = (x: number, y: number, length: number) => add("frame", new RoundedBoxGeometry(0.014, length, 0.028, 2, 0.006), m.titanium, x, y, 0);
  button(W / 2 + 0.003, 0.22, 0.2);
  button(-W / 2 - 0.003, 0.36, 0.13);
  button(-W / 2 - 0.003, 0.2, 0.13);
  button(-W / 2 - 0.003, 0.52, 0.06);
  anchor("frame", W / 2 + 0.012, 0.22, 0);

  // -------------------------------------------------------------------- Vitre arrière
  add("back", roundedSlab(W - 0.052, H - 0.052, R - 0.026, 0.006, 0.0015), m.backGlass, 0, 0, -D / 2 + 0.004);
  const logo = backLogo(m.logo, 0.25);
  keep(logo.geometry);
  logo.position.set(0, 0.04, -D / 2 - 0.0002);
  layers.back.add(logo);
  anchor("back", -(W / 2 - 0.1), -0.32, -D / 2);

  // -------------------------------------------------------------------- Module photo
  const camera = new THREE.Group();
  camera.position.set(W / 2 - 0.2, H / 2 - 0.2, 0);
  layers.camera.add(camera);
  const plateau = new THREE.Mesh(keep(roundedSlab(0.31, 0.31, 0.085, 0.012, 0.004)), m.plateau);
  plateau.position.z = -D / 2 - 0.005;
  camera.add(plateau);
  const ringGeometry = keep(new THREE.CylinderGeometry(0.054, 0.056, 0.016, 48).rotateX(Math.PI / 2));
  const glassGeometry = keep(new THREE.CylinderGeometry(0.044, 0.044, 0.004, 48).rotateX(Math.PI / 2));
  const coreGeometry = keep(new THREE.CircleGeometry(0.018, 32).rotateY(Math.PI));
  // Vu de dos, la gauche est en +X : deux objectifs à gauche, un à droite.
  for (const [x, y] of [
    [0.062, 0.062],
    [0.062, -0.062],
    [-0.066, 0],
  ]) {
    const lens = new THREE.Group();
    lens.position.set(x, y, -D / 2 - 0.019);
    const ring = new THREE.Mesh(ringGeometry, m.polished);
    const glass = new THREE.Mesh(glassGeometry, m.lens);
    glass.position.z = -0.0075;
    const core = new THREE.Mesh(coreGeometry, m.lensCore);
    core.position.z = -0.0098;
    lens.add(ring, glass, core);
    camera.add(lens);
  }
  const flash = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.017, 0.017, 0.004, 32).rotateX(Math.PI / 2)), m.flash);
  flash.position.set(-0.066, 0.08, -D / 2 - 0.013);
  const lidar = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 32).rotateX(Math.PI / 2)), m.black);
  lidar.position.set(-0.066, -0.08, -D / 2 - 0.013);
  camera.add(flash, lidar);
  anchor("camera", W / 2 - 0.2, H / 2 - 0.2, -D / 2 - 0.03);

  // ------------------------------------------------------------------------- Batterie
  add("battery", new RoundedBoxGeometry(0.46, 0.74, 0.034, 3, 0.012), m.foil, -0.05, -0.2, -0.012);
  // Étiquette côté vitre arrière : c’est elle qu’on voit dans la vue éclatée, de dos.
  const label = add("battery", new THREE.PlaneGeometry(0.4, 0.66), new THREE.MeshStandardMaterial({ map: batteryLabel(), roughness: 0.5, metalness: 0.05 }), -0.05, -0.2, -0.0296);
  label.rotation.y = Math.PI;
  // Côté +X : dans la vue éclatée, c’est le bord que la vitre arrière ne masque pas.
  anchor("battery", -0.05 + 0.2, -0.2, -0.03);

  // ---------------------------------------------------------------------- Carte mère
  const boardY = 0.43;
  add("board", roundedSlab(0.62, 0.5, 0.05, 0.01), m.pcb, 0, boardY, -0.006);
  const parts: [number, number, number, THREE.Material, number, number][] = [
    [0.18, 0.15, 0.014, m.shield, -0.1, 0.03],
    [0.11, 0.07, 0.01, m.chip, 0.14, 0.12],
    [0.09, 0.09, 0.01, m.chip, 0.15, -0.05],
    [0.23, 0.05, 0.008, m.shield, -0.08, -0.17],
    [0.06, 0.04, 0.006, m.chip, 0.03, 0.18],
  ];
  const blocked: [number, number, number, number][] = [];
  for (const [w, h, d, material, x, y] of parts) {
    add("board", new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.3), material, x, boardY + y, -0.011 - d / 2);
    blocked.push([x - w / 2 - 0.01, x + w / 2 + 0.01, y - h / 2 - 0.01, y + h / 2 + 0.01]);
  }
  for (let i = 0; i < 8; i++) add("board", new THREE.BoxGeometry(0.016, 0.026, 0.002), m.gold, -0.27 + i * 0.024, boardY + 0.215, -0.012);
  const rand = seeded(11);
  const tinyCount = quality === "high" ? 90 : 50;
  const tiny = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.014, 0.008, 0.006)), new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.35 }), tinyCount);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const palette = [new THREE.Color(0xc9a36b), new THREE.Color(0x1b1b1d), new THREE.Color(0xbfc2c8)];
  for (let i = 0, placed = 0; placed < tinyCount && i < 2000; i++) {
    const x = (rand() - 0.5) * 0.56;
    const y = (rand() - 0.5) * 0.42;
    if (blocked.some(([x0, x1, y0, y1]) => x > x0 && x < x1 && y > y0 && y < y1)) continue;
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rand() < 0.5 ? 0 : Math.PI / 2);
    matrix.compose(new THREE.Vector3(x, boardY + y, -0.014), quaternion, new THREE.Vector3(1, 1, 1));
    tiny.setMatrixAt(placed, matrix);
    tiny.setColorAt(placed, palette[Math.floor(rand() * palette.length)]);
    placed++;
  }
  layers.board.add(tiny);
  anchor("board", 0.31, boardY, -0.012);

  // ------------------------------------------------------------- Connecteur de charge
  const portY = -0.665;
  add("port", roundedSlab(0.44, 0.09, 0.02, 0.008), m.pcb, 0, portY, -0.006);
  add("port", new RoundedBoxGeometry(0.1, 0.034, 0.03, 3, 0.014), m.polished, 0, portY - 0.034, 0);
  for (const x of [-0.16, 0.16]) add("port", new RoundedBoxGeometry(0.12, 0.024, 0.014, 2, 0.006), m.chip, x, portY - 0.034, -0.002);
  anchor("port", 0, portY - 0.05, 0);

  // -------------------------------------------------------------------------- Écran
  add("display", roundedSlab(W - 0.05, H - 0.05, R - 0.025, 0.006), m.black, 0, 0, D / 2 - 0.008);
  const screenW = W - 0.062;
  const screenH = H - 0.062;
  const impact = new THREE.Vector2(-0.14, 0.27);
  const screen = new PhoneScreen(screenW / screenH, new THREE.Vector2(impact.x / screenW + 0.5, impact.y / screenH + 0.5));
  add("display", roundedPlane(screenW, screenH, R - 0.031), screen.material, 0, 0, D / 2 - 0.0048);
  anchor("display", screenW / 2, 0.42, D / 2);

  // -------------------------------------------------------------------- Vitre avant
  const glassW = W - 0.024;
  const glassH = H - 0.024;
  const shardUniforms: ShardUniforms = {
    uExplode: { value: 0 },
    uHeal: { value: 0 },
    uCrack: { value: 0 },
    uSheen: { value: 0 },
    uTime: { value: 0 },
    uImpact: { value: impact },
  };
  const shards = buildShards(glassW, glassH, R - 0.012, 0.008, impact, quality === "high" ? 1 : 0.62);
  const glassMesh = add("glass", shards.geometry, createShardMaterial(shardUniforms), 0, 0, D / 2 + 0.004);
  glassMesh.renderOrder = 5;
  const sparks = new Sparks(quality === "high" ? 480 : 240, pixelRatio);
  sparks.points.position.z = D / 2 + 0.008;
  layers.glass.add(sparks.points);
  anchor("glass", -glassW / 2, 0.5, D / 2 + 0.008);

  const materials = [...Object.values(m), label.material as THREE.Material, tiny.material as THREE.Material, glassMesh.material as THREE.Material];
  return {
    root,
    layers,
    explode,
    anchors,
    shardUniforms,
    screen,
    sparks,
    glass: { w: glassW, h: glassH, impact },
    dispose: () => {
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) {
        (material as THREE.MeshStandardMaterial).map?.dispose();
        material.dispose();
      }
      screen.dispose();
      sparks.dispose();
    },
  };
}
