import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import { LOGO_PATH } from "@/components/icons";
import { PhoneScreen } from "./screen";
import { buildShards, createShardMaterial, type ShardUniforms } from "./shatter";
import { Sparks } from "./sparks";
import { roundedPlane, roundedRectPath, roundedSlab, seeded, siteFont } from "./utils";

/*
 * Téléphone modélisé en code (aucun fichier 3D à télécharger), d’après un smartphone haut de
 * gamme actuel : bande en titane aux bords arrondis coupée de ses bandes d’antenne, vitres avant
 * et arrière qui l’affleurent (bord d’écran noir de 2,4 mm), module photo, et à l’intérieur
 * batterie, carte mère et connecteur de charge. Chaque pièce vit dans sa propre couche pour la
 * vue éclatée. Repère : 1 unité ≈ 10 cm (0,001 ≈ 0,1 mm), face avant vers +Z.
 */

/** Bande de titane : `d` est son épaisseur, les vitres la dépassent de part et d’autre. */
export const PHONE = { w: 0.74, h: 1.5, d: 0.074, r: 0.118 } as const;
const { w: W, h: H, d: D, r: R } = PHONE;
const EDGE = 0.008; // arrondi du bord de la bande, vu de face…
const EDGE_DEPTH = 0.012; // …et dans l’épaisseur
const LIP = 0.004; // lèvre de la bande, sous le pourtour des vitres
const GLASS_T = 0.0065; // épaisseur des vitres
const GLASS_PROUD = 0.0045; // dépassement des vitres au-dessus de la bande
const BEZEL = 0.024; // du bord extérieur à la zone allumée de l’écran
// Les vitres s’arrêtent là où commence l’arrondi de la bande.
const GLASS_W = W - EDGE * 2 - 0.0004;
const GLASS_H = H - EDGE * 2 - 0.0004;
const GLASS_R = R - EDGE;
const FRONT = D / 2 + GLASS_PROUD; // surface de la vitre avant
const BACK = -FRONT; // surface de la vitre arrière

// Finition « titane naturel » : facteur de réflexion du titane réel, verre arrière dépoli assorti.
const TITANIUM = 0xc4beb5;
const BACK_TINT = 0xbdb8af;

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

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  draw(canvas.getContext("2d")!, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** L’optique vue à travers la lentille : barillet, bagues concentriques, pupille au traitement bleuté. */
const lensTexture = () =>
  canvasTexture(256, (ctx, size) => {
    const c = size / 2;
    const rings: [number, string][] = [
      [1, "#111214"],
      [0.9, "#1f2024"],
      [0.84, "#0b0b0d"],
      [0.74, "#23252b"],
      [0.69, "#08080a"],
      [0.52, "#151b2f"],
      [0.44, "#07080d"],
      [0.3, "#101839"],
      [0.19, "#030306"],
    ];
    for (const [radius, color] of rings) {
      ctx.beginPath();
      ctx.arc(c, c, radius * c, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  });

/** Diffuseur du flash : lentille de Fresnel, anneaux concentriques sur fond jaune pâle. */
const flashTexture = () =>
  canvasTexture(128, (ctx, size) => {
    const c = size / 2;
    const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
    gradient.addColorStop(0, "#f3ead3");
    gradient.addColorStop(1, "#cfc4a8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(110, 90, 50, 0.28)";
    ctx.lineWidth = 2;
    for (let i = 1; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(c, c, (i / 8) * c, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

function createMaterials() {
  return {
    // Titane microbillé : métal satiné, sans vernis (un vernis le ferait passer pour du plastique).
    titanium: new THREE.MeshPhysicalMaterial({ color: TITANIUM, metalness: 1, roughness: 0.34 }),
    polished: new THREE.MeshPhysicalMaterial({ color: 0xdedbd5, metalness: 1, roughness: 0.07 }),
    backGlass: new THREE.MeshPhysicalMaterial({ color: BACK_TINT, metalness: 0, roughness: 0.5 }),
    plateau: new THREE.MeshPhysicalMaterial({ color: BACK_TINT, metalness: 0, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.03 }),
    // Lentille traitée antireflet : reflets irisés violet-vert, l’optique sombre en dessous.
    lens: new THREE.MeshPhysicalMaterial({
      map: lensTexture(),
      roughness: 0.04,
      iridescence: 0.9,
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [260, 560],
    }),
    flash: new THREE.MeshPhysicalMaterial({ map: flashTexture(), roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.04 }),
    lidar: new THREE.MeshPhysicalMaterial({ color: 0x0c0c0f, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 }),
    // Dalle de l’écran autour de la zone allumée : noire et satinée.
    panel: new THREE.MeshPhysicalMaterial({ color: 0x020203, metalness: 0, roughness: 0.3, specularIntensity: 0.5 }),
    pcb: new THREE.MeshStandardMaterial({ color: 0x0f3d35, roughness: 0.62, metalness: 0.15 }),
    chip: new THREE.MeshStandardMaterial({ color: 0x121315, roughness: 0.35, metalness: 0.4 }),
    shield: new THREE.MeshPhysicalMaterial({ color: 0xc6c9ce, metalness: 1, roughness: 0.3 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd9a74b, metalness: 1, roughness: 0.28 }),
    foil: new THREE.MeshPhysicalMaterial({ color: 0xb0b5bd, metalness: 0.9, roughness: 0.36 }),
    logo: new THREE.MeshPhysicalMaterial({ color: 0xe2dfda, metalness: 1, roughness: 0.06 }),
  };
}

/**
 * Titane de la bande, avec ce qu’on y voit sur un vrai téléphone : les bandes d’antenne en
 * polymère qui la coupent en travers, et sur la tranche du bas le port USB‑C, les grilles du
 * haut-parleur et du micro, les deux vis. Tout est dessiné dans le shader, sans géométrie.
 */
function createFrameMaterial() {
  const material = new THREE.MeshPhysicalMaterial({ color: TITANIUM, metalness: 1, roughness: 0.34 });
  const f = (value: number) => value.toFixed(4);
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vFramePos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFramePos = position;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vFramePos;").replace(
      "#include <metalnessmap_fragment>",
      /* glsl */ `#include <metalnessmap_fragment>
      {
        vec3 p = vFramePos;
        // Bandes d’antenne (0,9 mm) : deux sur chaque flanc, une en haut, deux en bas.
        float fy = fwidth(p.y) + 1e-6;
        float fx = fwidth(p.x) + 1e-6;
        float onSide = step(${f(W / 2 - 0.03)}, abs(p.x));
        float onEnd = step(${f(H / 2 - 0.03)}, abs(p.y));
        float dy = p.x < 0.0 ? min(abs(p.y - 0.6), abs(p.y + 0.6)) : min(abs(p.y - 0.62), abs(p.y + 0.6));
        float dx = p.y > 0.0 ? abs(p.x + 0.17) : abs(abs(p.x) - 0.255);
        float antenna = max(
          onSide * (1.0 - smoothstep(0.0045 - fy, 0.0045 + fy, dy)),
          onEnd * (1.0 - smoothstep(0.0045 - fx, 0.0045 + fx, dx))
        );
        // Tranche du bas : port USB-C au centre, vis de part et d’autre, puis six trous de chaque côté.
        float bottom = step(p.y, ${f(-H / 2 + 0.0008)});
        vec2 b = vec2(p.x, p.z);
        float fb = fwidth(b.x) + fwidth(b.y) + 1e-6;
        float port = length(vec2(max(abs(b.x) - 0.0285, 0.0), b.y)) - 0.016;
        vec2 hole = vec2(abs(b.x) - 0.0935, b.y);
        hole.x -= clamp(floor(hole.x / 0.0155 + 0.5), 0.0, 5.0) * 0.0155;
        float opening = bottom * (1.0 - smoothstep(-fb, fb, min(port, length(hole) - 0.0052)));
        float screw = bottom * (1.0 - smoothstep(-fb, fb, length(vec2(abs(b.x) - 0.064, b.y)) - 0.0062));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.085, 0.083, 0.08), antenna);
        metalnessFactor = mix(metalnessFactor, 0.0, antenna);
        roughnessFactor = mix(roughnessFactor, 0.45, antenna);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.45, screw);
        roughnessFactor = mix(roughnessFactor, 0.42, screw);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.004), opening);
        metalnessFactor = mix(metalnessFactor, 0.0, opening);
        roughnessFactor = mix(roughnessFactor, 0.85, opening);
      }`,
    );
  };
  material.customProgramCacheKey = () => "repareliya-frame";
  return material;
}

/** Bague d’objectif tournée : flanc droit, arrondi poli, chanfrein qui plonge vers la lentille. */
function lensRingGeometry(outer: number, inner: number, height: number) {
  const round = 0.0026;
  const profile: [number, number][] = [
    [outer - 0.001, -0.001],
    [outer, 0],
  ];
  for (let i = 0; i <= 6; i++) {
    const angle = (i / 6) * (Math.PI / 2);
    profile.push([outer - round + Math.cos(angle) * round, height - round + Math.sin(angle) * round]);
  }
  profile.push([inner + 0.003, height], [inner + 0.0008, height - 0.0016], [inner, height - 0.003], [inner, height - 0.006]);
  // Le tour se fait autour de Y : on couche la pièce pour que sa hauteur parte vers −Z (le dos).
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    96,
  ).rotateX(-Math.PI / 2);
}

/** Pictogramme de la marque, affleurant sur la vitre arrière (seul le fini change : poli sur dépoli). */
function backLogo(material: THREE.Material, height: number) {
  const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 539 860"><path fill-rule="evenodd" d="${LOGO_PATH}"/></svg>`);
  const shapes = svg.paths.flatMap((path) => path.toShapes());
  const geometry = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false, curveSegments: 10 });
  geometry.center();
  // Axe Y du SVG vers le bas, et lecture de dos : une demi-rotation autour de Z remet tout d’aplomb.
  geometry.rotateZ(Math.PI);
  const scale = height / 860;
  geometry.scale(scale, scale, 0.0002);
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
  const frameMaterial = createFrameMaterial();
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

  // ------------------------------------------------------------------- Bande et boutons
  // Profil de la bande : flanc plat, arrondi de 0,8 × 1,2 mm vers chaque vitre, lèvre de 0,4 mm
  // sous leur pourtour. Normales lissées : les reflets roulent sur l’arrondi sans facettes.
  const rim = roundedRectPath(new THREE.Shape(), W - EDGE * 2, H - EDGE * 2, R - EDGE);
  rim.holes.push(roundedRectPath(new THREE.Path(), W - (EDGE + LIP) * 2, H - (EDGE + LIP) * 2, R - EDGE - LIP));
  const rimGeometry = new THREE.ExtrudeGeometry(rim, {
    depth: D - EDGE_DEPTH * 2,
    bevelEnabled: true,
    bevelThickness: EDGE_DEPTH,
    bevelSize: EDGE,
    bevelSegments: 8,
  });
  rimGeometry.center();
  add("frame", toCreasedNormals(rimGeometry, Math.PI / 5), frameMaterial);
  // Boutons : 0,6 mm de relief, flancs arrondis.
  const button = (x: number, y: number, length: number) => add("frame", new RoundedBoxGeometry(0.012, length, 0.026, 4, 0.0055), m.titanium, x, y, 0);
  button(W / 2, 0.22, 0.2);
  button(-W / 2, 0.36, 0.13);
  button(-W / 2, 0.2, 0.13);
  button(-W / 2, 0.52, 0.06);
  anchor("frame", W / 2 + 0.012, 0.22, 0);

  // -------------------------------------------------------------------- Vitre arrière
  add("back", roundedSlab(GLASS_W, GLASS_H, GLASS_R, GLASS_T, 0.0012), m.backGlass, 0, 0, BACK + GLASS_T / 2);
  const logo = backLogo(m.logo, 0.22);
  keep(logo.geometry);
  logo.position.set(0, 0.04, BACK - 0.0002);
  layers.back.add(logo);
  anchor("back", -(W / 2 - 0.1), -0.32, BACK);

  // -------------------------------------------------------------------- Module photo
  // Plateau de verre poli (1,4 mm), trois objectifs dans leurs bagues (+1,9 mm), flash et LiDAR.
  const plateauSize = 0.335;
  const plateauT = 0.015;
  const camera = new THREE.Group();
  camera.position.set(W / 2 - 0.045 - plateauSize / 2, H / 2 - 0.045 - plateauSize / 2, 0);
  layers.camera.add(camera);
  const plateau = new THREE.Mesh(keep(roundedSlab(plateauSize, plateauSize, 0.088, plateauT, 0.004)), m.plateau);
  plateau.position.z = BACK - plateauT / 2 + 0.001;
  camera.add(plateau);
  const top = BACK - plateauT + 0.001;
  const ringGeometry = keep(lensRingGeometry(0.068, 0.0565, 0.019));
  const lensGeometry = keep(new THREE.CircleGeometry(0.0565, 64).rotateY(Math.PI));
  // Vu de dos, la gauche est en +X : deux objectifs à gauche, un à droite.
  for (const [x, y] of [
    [0.077, 0.077],
    [0.077, -0.077],
    [-0.075, 0],
  ]) {
    const lens = new THREE.Group();
    lens.position.set(x, y, top);
    const glass = new THREE.Mesh(lensGeometry, m.lens);
    glass.position.z = -0.0145; // en retrait sous le bord de la bague
    lens.add(new THREE.Mesh(ringGeometry, m.polished), glass);
    camera.add(lens);
  }
  const flash = new THREE.Mesh(keep(new THREE.CircleGeometry(0.0185, 48).rotateY(Math.PI)), m.flash);
  flash.position.set(-0.098, 0.113, top - 0.0003);
  const lidar = new THREE.Mesh(keep(new THREE.CircleGeometry(0.016, 48).rotateY(Math.PI)), m.lidar);
  lidar.position.set(-0.098, -0.113, top - 0.0003);
  camera.add(flash, lidar);
  anchor("camera", camera.position.x, camera.position.y, top - 0.02);

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
  // Dalle noire qui file sous la lèvre de la bande, puis la zone allumée, à 2,4 mm du bord.
  add("display", roundedSlab(W - (EDGE + LIP) * 2 + 0.001, H - (EDGE + LIP) * 2 + 0.001, R - EDGE - LIP, 0.0045), m.panel, 0, 0, D / 2 - 0.00485);
  const screenW = W - BEZEL * 2;
  const screenH = H - BEZEL * 2;
  const impact = new THREE.Vector2(-0.14, 0.27);
  const screen = new PhoneScreen(screenW / screenH, new THREE.Vector2(impact.x / screenW + 0.5, impact.y / screenH + 0.5));
  add("display", roundedPlane(screenW, screenH, R - BEZEL), screen.material, 0, 0, D / 2 - 0.0023);
  anchor("display", screenW / 2, 0.42, D / 2);

  // -------------------------------------------------------------------- Vitre avant
  const shardUniforms: ShardUniforms = {
    uExplode: { value: 0 },
    uHeal: { value: 0 },
    uCrack: { value: 0 },
    uSheen: { value: 0 },
    uTime: { value: 0 },
    uImpact: { value: impact },
  };
  const shards = buildShards(GLASS_W, GLASS_H, GLASS_R, GLASS_T, impact, quality === "high" ? 1 : 0.62);
  // Sérigraphie noire du pourtour, qui mord de 0,4 mm sur la zone allumée (bord net au pixel près).
  const ink = GLASS_W / 2 - screenW / 2 + 0.004;
  const glassMaterial = createShardMaterial(shardUniforms, { w: GLASS_W, h: GLASS_H, r: GLASS_R, ink });
  const glassMesh = add("glass", shards.geometry, glassMaterial, 0, 0, FRONT - GLASS_T / 2);
  glassMesh.renderOrder = 5;
  const sparks = new Sparks(quality === "high" ? 480 : 240, pixelRatio);
  sparks.points.position.z = FRONT + 0.002;
  layers.glass.add(sparks.points);
  anchor("glass", -GLASS_W / 2, 0.5, FRONT);

  const materials = [...Object.values(m), frameMaterial, label.material as THREE.Material, tiny.material as THREE.Material, glassMaterial];
  return {
    root,
    layers,
    explode,
    anchors,
    shardUniforms,
    screen,
    sparks,
    glass: { w: GLASS_W, h: GLASS_H, impact },
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
