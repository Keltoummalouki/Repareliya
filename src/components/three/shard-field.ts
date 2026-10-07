import { animate } from "animejs";
import "animejs/adapters/three";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { damp, seeded } from "./utils";

/*
 * Éclats de verre en apesanteur : le motif de la scène d’accueil,
 * en version légère, derrière le haut des pages intérieures. Fond transparent (la page reste
 * visible dessous), reflets d’un studio virtuel, parallaxe au pointeur et au défilement.
 * Les couleurs suivent le thème clair ou sombre du site.
 */

type Theme = "light" | "dark";

const SHARD_COUNT = { high: 22, low: 13 };

export class ShardField {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  private rig = new THREE.Group();
  private field = new THREE.Group();
  private shards: { mesh: THREE.Mesh; base: THREE.Vector3; spin: THREE.Vector3; phase: number }[] = [];
  private glass: THREE.MeshPhysicalMaterial;
  private amber: THREE.MeshPhysicalMaterial;
  private envTarget: THREE.WebGLRenderTarget;
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private scroll = 0;
  private time = 0;
  private size = { w: 1, h: 1 };
  private compact = false;
  private geometries: THREE.BufferGeometry[] = [];
  running = true;

  constructor(canvas: HTMLCanvasElement, { quality, theme }: { quality: "high" | "low"; theme: Theme }) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.envTarget = pmrem.fromScene(room, 0.04);
    this.scene.environment = this.envTarget.texture;
    room.dispose();
    pmrem.dispose();

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(2, 3, 4);
    const rim = new THREE.DirectionalLight(0x4d9bff, 2.4);
    rim.position.set(-3, 1, -2);
    this.scene.add(key, rim);

    this.glass = new THREE.MeshPhysicalMaterial({
      metalness: 0,
      roughness: 0.06,
      transparent: true,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    // Quelques éclats bleu Apple parmi le verre.
    this.amber = new THREE.MeshPhysicalMaterial({
      color: 0x2997ff,
      emissive: 0x0071e3,
      emissiveIntensity: 0.4,
      metalness: 0.1,
      roughness: 0.15,
      transparent: true,
      opacity: 0.85,
      clearcoat: 1,
      side: THREE.DoubleSide,
    });
    // Le verre gagne en opacité là où il reflète la lumière, comme une vraie vitre.
    this.glass.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        /* glsl */ `diffuseColor.a = clamp(diffuseColor.a + dot(outgoingLight, vec3(0.299, 0.587, 0.114)) * 0.45, 0.0, 1.0);
        #include <opaque_fragment>`,
      );
    };

    const rand = seeded(42);
    const count = SHARD_COUNT[quality];
    for (let i = 0; i < count; i++) {
      // Triangle irrégulier, légèrement épais.
      const shape = new THREE.Shape();
      const size = 0.18 + rand() * 0.42;
      const a0 = rand() * Math.PI * 2;
      for (let k = 0; k < 3; k++) {
        const angle = a0 + (k / 3) * Math.PI * 2 + (rand() - 0.5) * 1.1;
        const r = size * (0.55 + rand() * 0.6);
        if (k === 0) shape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 });
      geometry.center();
      this.geometries.push(geometry);
      const mesh = new THREE.Mesh(geometry, i % 7 === 3 ? this.amber : this.glass);
      const base = new THREE.Vector3((rand() - 0.5) * 3.6, (rand() - 0.5) * 2.6, (rand() - 0.5) * 2.2);
      mesh.position.copy(base);
      mesh.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
      this.field.add(mesh);
      this.shards.push({ mesh, base, spin: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.25), phase: rand() * Math.PI * 2 });
    }

    this.camera.position.set(0, 0, 6);
    this.rig.add(this.field);
    this.scene.add(this.rig);
    this.setTheme(theme);
  }

  setTheme(theme: Theme) {
    // Clair : un verre fumé, pour qu’il se détache du fond gris clair. Sombre : un verre sombre et réfléchissant.
    if (theme === "light") {
      this.glass.color.set(0x2a2622);
      this.glass.opacity = 0.1;
      this.glass.envMapIntensity = 1.1;
      this.renderer.toneMappingExposure = 0.95;
    } else {
      // Verre presque sans diffusion : il se lit par ses reflets, pas comme du plastique blanc.
      this.glass.color.set(0x111214);
      this.glass.opacity = 0.12;
      this.glass.envMapIntensity = 1.3;
      this.renderer.toneMappingExposure = 1.05;
    }
  }

  resize(w: number, h: number) {
    if (!w || !h) return;
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.compact = w < 768;
    // Les éclats se regroupent à droite du titre ; sur mobile, en haut, plus petits.
    const visH = 2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const visW = visH * this.camera.aspect;
    this.field.position.set(this.compact ? visW * 0.22 : visW * 0.27, this.compact ? visH * 0.28 : visH * 0.12, 0);
    this.field.scale.setScalar(this.compact ? 0.6 : 1);
  }

  setPointer(x: number, y: number) {
    this.pointer.tx = x;
    this.pointer.ty = y;
  }

  setScroll(y: number) {
    this.scroll = y;
  }

  /** Coup de vent lors d’un changement de page : les éclats tourbillonnent puis se reposent. */
  swirl() {
    animate(this.field, { rotateZ: `+=${this.compact ? 90 : 120}`, rotateY: "+=40", duration: 1800, ease: "outExpo" });
  }

  tick = (_time: number, deltaMs: number) => {
    if (!this.running) return;
    const dt = Math.min(deltaMs / 1000, 0.05);
    this.time += dt;
    this.renderFrame(dt);
  };

  renderFrame(dt = 0) {
    const t = this.time;
    this.pointer.x = damp(this.pointer.x, this.pointer.tx, 3, dt);
    this.pointer.y = damp(this.pointer.y, this.pointer.ty, 3, dt);
    this.rig.rotation.y = this.pointer.x * 0.18;
    this.rig.rotation.x = this.pointer.y * 0.1;
    // Les éclats montent plus vite que la page : ils quittent l’écran avec l’en-tête.
    this.rig.position.y = (this.scroll / this.size.h) * 3.2;
    for (const { mesh, base, spin, phase } of this.shards) {
      mesh.position.y = base.y + Math.sin(t * 0.5 + phase) * 0.08;
      mesh.position.x = base.x + Math.cos(t * 0.35 + phase) * 0.05;
      mesh.rotation.x += spin.x * dt;
      mesh.rotation.y += spin.y * dt;
      mesh.rotation.z += spin.z * dt;
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.running = false;
    for (const geometry of this.geometries) geometry.dispose();
    this.glass.dispose();
    this.amber.dispose();
    this.envTarget.dispose();
    this.renderer.dispose();
  }
}
