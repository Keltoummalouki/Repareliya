import { createTimeline, type Timeline } from "animejs";
// Adaptateur three.js d’anime.js : position (x, y, z), rotations en degrés, échelle… directement sur les Object3D.
import "animejs/adapters/three";
import * as THREE from "three";
import { buildPhone, LAYERS, PHONE, type PhoneModel } from "./phone-model";
import { HEAL_REACH } from "./shatter";
import { damp, easeInOut, easeOut, lerp, range } from "./utils";

/*
 * Scène de l’accueil : un téléphone dont l’écran vient d’exploser, que le défilement répare.
 *   0.00  vitre en éclats suspendus, l’écran mort
 *   0.10  les éclats reviennent à leur place
 *   0.33  la vague de réparation efface les fissures (étincelles)
 *   0.44  l’écran se rallume, notification « appareil prêt »
 *   0.55  le téléphone se retourne, puis s’éclate en couches (vue éclatée étiquetée)
 *   0.86  tout se remet en place, face avant, prêt pour l’appel à l’action
 * La progression vient de ScrollTrigger (setProgress) ; tout le reste se déduit d’elle, si bien
 * que la scène se rejoue à l’envers en remontant. L’entrée (chute et impact) est jouée par anime.js.
 */

export type Quality = "high" | "low";
export type StageLabel = { el: HTMLElement; anchor: string };

type Layout = {
  heroX: number;
  heroY: number;
  heroScale: number;
  centerX: number;
  centerY: number;
  centerScale: number;
  explodeX: number;
  explodeY: number;
  explodeScale: number;
  endX: number;
  endY: number;
  endScale: number;
};

const GLOW_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float glow = pow(max(0.0, 1.0 - d), 2.2);
    gl_FragColor = vec4(vec3(0.22, 0.48, 1.0) * glow * uOpacity, glow * uOpacity);
  }
`;
const DUST_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  attribute vec3 aSeed;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y += mod(uTime * (0.025 + aSeed.x * 0.05) + aSeed.y * 5.0, 5.0) - 2.5;
    p.x += sin(uTime * 0.18 + aSeed.z * 6.2831) * 0.18;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.4 + aSeed.z) / -mv.z;
    vAlpha = (0.2 + 0.55 * aSeed.x) * smoothstep(2.5, 1.6, abs(p.y));
  }
`;
const DUST_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    gl_FragColor = vec4(vec3(0.82, 0.9, 1.0) * a, a);
  }
`;

/** Diffuseur de boîte à lumière : plein au centre, bords adoucis sur `edge` (en fraction de la taille). */
function softboxTexture(edge: number) {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const fade = (t: number) => (t >= 1 ? 1 : t * t * (3 - 2 * t));
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const u = (i + 0.5) / size;
      const v = (j + 0.5) / size;
      const value = Math.round(255 * fade(Math.min(u, 1 - u) / edge) * fade(Math.min(v, 1 - v) / edge));
      data.set([value, value, value, 255], (j * size + i) * 4);
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Studio photo, rendu une fois en carte de reflets : pièce presque noire (un métal ou une vitre ne
 * se voient que par ce qu’ils reflètent), grande boîte à lumière au plafond, deux boîtes verticales
 * de part et d’autre de l’objectif (le reflet doux qui glisse sur l’écran quand le téléphone
 * tourne), deux rubans latéraux qui tracent les arêtes du titane, un panneau gris pour le modelé
 * des flancs, et un ruban bleu en contre-jour, signature des visuels produit d’apple.com.
 */
function createStudio() {
  const studio = new THREE.Scene();
  const dome = new THREE.SphereGeometry(30, 48, 24);
  const shade = new Float32Array(dome.attributes.position.count * 3);
  for (let i = 0; i < dome.attributes.position.count; i++) {
    const y = dome.attributes.position.getY(i) / 30;
    const z = dome.attributes.position.getZ(i) / 30;
    // Noir au zénith, légère lueur à l’horizon, sol sombre…
    let value = y > 0 ? lerp(0.03, 0.004, Math.min(1, y * 2.2)) : lerp(0.03, 0.01, Math.min(1, -y * 3));
    // …et des murs gris clair sur les côtés et derrière : le titane s’y éclaire, alors que
    // l’écran, tourné vers l’objectif, ne reflète que le noir de l’avant du studio.
    value += 0.3 * Math.max(0, 1 - Math.abs(y) * 1.6) * Math.min(1, Math.max(0, (0.45 - z) / 0.7));
    shade.set([value, value, value * 1.05], i * 3);
  }
  dome.setAttribute("color", new THREE.BufferAttribute(shade, 3));
  studio.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));

  const soft = softboxTexture(0.22);
  const crisp = softboxTexture(0.06);
  const light = (w: number, h: number, intensity: number, [x, y, z]: number[], map: THREE.Texture, color = 0xffffff) => {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), map, side: THREE.DoubleSide }),
    );
    panel.position.set(x, y, z);
    panel.lookAt(0, 0, 0);
    studio.add(panel);
  };
  light(9, 5, 1.6, [0, 7, 1.5], soft); // plafond
  // Grand réflecteur faible derrière l’objectif : le titane (qui renvoie ~60 % de la lumière) s’y
  // éclaire, la vitre (4 %) à peine, l’écran éteint reste noir.
  light(12, 7, 0.22, [0, 0.8, 8], soft);
  // Les deux boîtes avant sont placées pour que leur bord traverse l’écran dans la pose d’accueil
  // (téléphone tourné vers la droite) et dans la pose finale (tourné vers la gauche) : un reflet
  // en dégradé qui glisse quand on fait défiler ou qu’on bouge la souris, pas un voile uniforme.
  light(2.2, 5, 1.3, [5.7, 1.45, 3.75], soft); // avant droite
  light(1.8, 5, 1.8, [-3.9, 1, 5.8], soft); // avant gauche
  light(0.45, 9, 5, [-7, 0.8, 0.6], crisp); // ruban gauche
  light(0.45, 9, 4, [7, 0.8, -1.2], crisp); // ruban droit
  light(6, 4, 0.45, [-4.5, 2.2, -5], soft); // panneau gris, arrière gauche
  light(0.5, 8, 3, [-1.8, 1.2, -7], crisp, 0x3d8bff); // ruban bleu en contre-jour

  return {
    studio,
    dispose() {
      studio.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        (mesh.material as THREE.Material | undefined)?.dispose();
      });
      soft.dispose();
      crisp.dispose();
    },
  };
}

export class PhoneScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  // Une couche par pilote, pour que personne ne se marche dessus :
  private rig = new THREE.Group(); // inclinaison au pointeur
  private stage = new THREE.Group(); // défilement
  private float = new THREE.Group(); // flottement au repos
  private intro = new THREE.Group(); // entrée (anime.js)
  private model: PhoneModel;
  private glow: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private dust: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private flashLight = new THREE.PointLight(0x5aa9ff, 0, 5, 1.6);
  private envTarget: THREE.WebGLRenderTarget;
  private labels: StageLabel[];
  private layout!: Layout;
  private size = { w: 1, h: 1 };
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private progress = 0;
  // Valeurs pilotées par l’entrée (anime.js) :
  private introExplode = { value: 0 };
  private introPower = { value: 1 };
  private crack = { value: 0 };
  private shake = { x: 0, y: 0 };
  private flashPulse = 0;
  private lastHeal = 0;
  private time = 0;
  private visible = true;
  private disposed = false;
  private introTimeline: Timeline | null = null;
  private tmp = new THREE.Vector3();
  private center = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, { quality, labels }: { quality: Quality; labels: StageLabel[] }) {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, quality === "high" ? 2 : 1.5);
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: pixelRatio < 2, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.labels = labels;

    const studio = createStudio();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTarget = pmrem.fromScene(studio.studio, 0.02);
    this.scene.environment = this.envTarget.texture;
    studio.dispose();
    pmrem.dispose();

    // Les reflets du studio font l’essentiel ; ces lampes modèlent surtout les pièces mates
    // (vitre arrière, batterie, carte mère) et détachent la silhouette du fond.
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(2.5, 3, 4);
    const rim = new THREE.DirectionalLight(0xc4dcff, 0.9);
    rim.position.set(-3, 1.2, -2.5);
    const back = new THREE.DirectionalLight(0xffffff, 0.7);
    back.position.set(3.2, -1.2, -2);
    this.scene.add(key, rim, back, new THREE.HemisphereLight(0xffffff, 0x080a10, 0.3));

    this.camera.position.set(0, 0, 5);
    this.scene.add(this.rig);
    this.rig.add(this.stage);
    this.stage.add(this.float);
    this.float.add(this.intro);
    this.flashLight.position.set(0, 0, 1.1);
    this.stage.add(this.flashLight);

    this.model = buildPhone({ quality, pixelRatio });
    this.intro.add(this.model.root);

    // Halo bleuté derrière le téléphone, qui s’intensifie quand l’écran se rallume.
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 5.5),
      new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 0.55 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: GLOW_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    this.glow.position.set(0.1, 0.1, -1.4);
    this.stage.add(this.glow);

    // Poussière en suspension, pour la profondeur.
    const dustCount = quality === "high" ? 260 : 140;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustSeeds = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions.set([(Math.random() - 0.5) * 7, 0, -2.6 + Math.random() * 4], i * 3);
      dustSeeds.set([Math.random(), Math.random(), Math.random()], i * 3);
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute("aSeed", new THREE.BufferAttribute(dustSeeds, 3));
    this.dust = new THREE.Points(
      dustGeometry,
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uSize: { value: 26 * pixelRatio } },
        vertexShader: DUST_VERTEX,
        fragmentShader: DUST_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);

    canvas.addEventListener("webglcontextlost", this.onContextLost);
    // Les étiquettes s’élargissent une fois la police du site chargée : on les remesure.
    document.fonts?.ready.then(() => this.labelWidths.clear());
  }

  /** Compile les shaders sans bloquer la page, puis dessine une première image. */
  async init() {
    this.apply(0);
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.disposed) return;
    this.renderer.render(this.scene, this.camera);
  }

  onContextLostCallback: (() => void) | null = null;
  private onContextLost = (event: Event) => {
    event.preventDefault();
    this.visible = false;
    this.onContextLostCallback?.();
  };

  resize(w: number, h: number) {
    if (!w || !h) return;
    this.size = { w, h };
    this.labelWidths.clear();
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const visH = 2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const visW = visH * this.camera.aspect;
    if (this.camera.aspect >= 1.05) {
      // Paysage : le téléphone à droite du texte.
      const heroX = Math.min(visW * 0.25, 1.35);
      this.layout = {
        heroX,
        heroY: -0.02,
        heroScale: 1,
        // Pendant la réparation, légèrement à droite : « Réparé. » occupe la gauche.
        centerX: visW * 0.08,
        centerY: 0,
        centerScale: 1.08,
        // Vue éclatée décalée à droite : les étiquettes de gauche ne touchent pas le titre.
        explodeX: visW * 0.17,
        explodeY: -0.04,
        explodeScale: Math.min(0.86, visH / 3.1),
        endX: heroX,
        endY: 0,
        endScale: 0.98,
      };
    } else {
      // Portrait : le téléphone sous le texte, plus petit ; la vue éclatée sous le titre de son chapitre.
      const fit = Math.min(1, visW / 1.15);
      this.layout = {
        heroX: 0,
        heroY: -visH * 0.27,
        heroScale: fit * 0.8,
        centerX: 0,
        centerY: -visH * 0.04,
        centerScale: Math.min(1.02, visW / 0.95),
        explodeX: 0,
        explodeY: -visH * 0.16,
        explodeScale: Math.min(0.7, visW / 2.15),
        endX: 0,
        endY: -visH * 0.2,
        endScale: fit * 0.84,
      };
    }
    this.apply(this.progress);
  }

  setProgress(p: number) {
    this.progress = p;
  }

  /** Position du pointeur, de −1 à 1 sur chaque axe. */
  setPointer(x: number, y: number) {
    this.pointer.tx = x;
    this.pointer.ty = y;
  }

  setVisible(visible: boolean) {
    this.visible = visible;
  }

  /** Position de départ de l’entrée : le téléphone attend hors champ, écran allumé et intact. */
  prepareIntro() {
    this.introTimeline?.revert();
    this.introTimeline = null;
    this.intro.position.set(0, 2.7, 0.5);
    this.intro.rotation.set(THREE.MathUtils.degToRad(40), THREE.MathUtils.degToRad(-10), THREE.MathUtils.degToRad(-26));
    this.introPower.value = 1;
    this.introExplode.value = 0;
    this.crack.value = 0;
  }

  /** Chute du téléphone, impact, vitre qui vole en éclats, écran qui meurt. */
  playIntro(onImpact?: () => void) {
    this.prepareIntro();
    this.introTimeline = createTimeline()
      .add(this.intro, { y: 0, z: 0, rotateX: 0, rotateY: 0, rotateZ: 0, duration: 760, ease: "inQuad" }, 0)
      .call(() => {
        this.impact();
        onImpact?.();
      }, 740)
      .add(this.introExplode, { value: 1, duration: 2200, ease: "outExpo" }, 740)
      .add(
        this.introPower,
        {
          value: [
            { to: 0.12, duration: 50 },
            { to: 0.75, duration: 70 },
            { to: 0.05, duration: 90 },
            { to: 0.45, duration: 60 },
            { to: 0, duration: 260 },
          ],
        },
        760,
      )
      .add(
        this.shake,
        {
          x: [{ to: 0.045 }, { to: -0.032 }, { to: 0.016 }, { to: 0 }],
          y: [{ to: -0.04 }, { to: 0.024 }, { to: -0.01 }, { to: 0 }],
          duration: 560,
          ease: "outQuad",
        },
        740,
      )
      .add(this.intro, { y: [{ to: 0.07, duration: 240, ease: "outQuad" }, { to: 0, duration: 900, ease: "outElastic(1, .45)" }] }, 760);
    return this.introTimeline;
  }

  /** Pas d’entrée (retour sur la page déjà vue) : la vitre est déjà brisée, l’écran éteint. */
  skipIntro() {
    this.introTimeline?.revert();
    this.introTimeline = null;
    this.intro.position.set(0, 0, 0);
    this.intro.rotation.set(0, 0, 0);
    this.introExplode.value = 1;
    this.introPower.value = 0;
    this.crack.value = 1;
  }

  private impact() {
    this.crack.value = 1;
    const { impact } = this.model.glass;
    this.model.sparks.burst(impact.x, impact.y, 110);
    this.flashPulse = 1;
  }

  /** Tout l’état de la scène, déduit de la progression du défilement. */
  private apply(p: number) {
    const L = this.layout;
    if (!L) return;
    const m = this.model;
    const leave = easeInOut(range(p, 0.02, 0.16));
    const gather = easeInOut(range(p, 0.1, 0.33));
    const heal = range(p, 0.32, 0.45);
    const power = easeOut(range(p, 0.44, 0.52));
    const notify = easeOut(range(p, 0.5, 0.56));
    const flip = easeInOut(range(p, 0.56, 0.66));
    const explode = easeInOut(range(p, 0.64, 0.76));
    const implode = easeInOut(range(p, 0.86, 0.95));
    const finale = easeInOut(range(p, 0.86, 1));

    m.shardUniforms.uExplode.value = this.introExplode.value * (1 - gather);
    m.shardUniforms.uHeal.value = heal;
    m.shardUniforms.uCrack.value = this.crack.value;
    m.shardUniforms.uSheen.value = Math.max(flip, explode) * (1 - finale);
    m.screen.uniforms.uPower.value = Math.max(power, this.introPower.value);
    m.screen.uniforms.uBroken.value = 1 - power;
    m.screen.uniforms.uNotify.value = notify;
    // Sous la vitre collée, la dalle n’a pas de reflet propre ; à nu (vitre envolée), si.
    m.screen.material.specularIntensity = m.shardUniforms.uExplode.value * 0.6;

    let x = lerp(L.heroX, L.centerX, leave);
    let y = lerp(L.heroY, L.centerY, leave);
    let s = lerp(L.heroScale, L.centerScale, leave);
    x = lerp(x, L.explodeX, explode);
    y = lerp(y, L.explodeY, explode);
    s = lerp(s, L.explodeScale, explode);
    x = lerp(x, L.endX, finale);
    y = lerp(y, L.endY, finale);
    s = lerp(s, L.endScale, finale);
    this.stage.position.set(x, y, 0);
    this.stage.scale.setScalar(s);

    // Rotation : de trois quarts vers le texte, face caméra, dos, vue éclatée, puis face avant.
    const endTurn = Math.PI * 2 - (this.camera.aspect >= 1.05 ? 0.38 : 0.12);
    // Au départ, légèrement tourné vers la droite : la gerbe d’éclats part à l’opposé du texte.
    let ry = lerp(this.camera.aspect >= 1.05 ? 0.26 : 0.1, 0, leave);
    ry += Math.PI * flip + 0.9 * explode;
    ry = lerp(ry, endTurn, finale);
    const rx = lerp(0.1, 0, leave) + 0.36 * explode * (1 - finale) + 0.05 * finale;
    const rz = lerp(0.05, 0, leave) - 0.1 * explode * (1 - finale);
    this.model.root.rotation.set(rx, ry, rz);

    const spread = explode * (1 - implode);
    for (const name of LAYERS) m.layers[name].position.copy(m.explode[name]).multiplyScalar(spread);

    this.glow.material.uniforms.uOpacity.value = 0.2 + 0.32 * power * (1 - spread * 0.6);

    // Étincelles sur le front de la vague, à mesure qu’elle avance.
    const advance = heal - this.lastHeal;
    if (advance > 0 && heal < 1) {
      const { impact, w, h } = m.glass;
      const radius = heal * HEAL_REACH;
      const count = Math.min(36, Math.ceil(advance * 900));
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const sx = impact.x + dx * radius;
        const sy = impact.y + dy * radius;
        if (Math.abs(sx) < w / 2 - 0.02 && Math.abs(sy) < h / 2 - 0.02) m.sparks.emit(sx, sy, dx, dy, 0.9);
      }
    }
    this.lastHeal = heal;
    this.flashPulse = Math.max(this.flashPulse, Math.sin(power * Math.PI) * 0.9);
  }

  /** Cadence : appelée par le ticker de GSAP (temps en secondes, écart en millisecondes). */
  tick = (_time: number, deltaMs: number) => {
    if (this.disposed || !this.visible) return;
    const dt = Math.min(deltaMs / 1000, 0.05);
    this.time += dt;
    this.apply(this.progress);

    this.pointer.x = damp(this.pointer.x, this.pointer.tx, 4, dt);
    this.pointer.y = damp(this.pointer.y, this.pointer.ty, 4, dt);
    this.rig.rotation.y = this.pointer.x * 0.22;
    this.rig.rotation.x = this.pointer.y * 0.12;
    this.float.position.y = Math.sin(this.time * 0.9) * 0.03;
    this.float.rotation.z = Math.sin(this.time * 0.6) * 0.012;
    this.camera.position.x = this.shake.x;
    this.camera.position.y = this.shake.y;

    this.flashLight.intensity = this.flashPulse * 7;
    this.flashPulse = Math.max(0, this.flashPulse - dt * 2.5);

    const t = this.time;
    this.model.shardUniforms.uTime.value = t;
    this.model.screen.uniforms.uTime.value = t;
    this.dust.material.uniforms.uTime.value = t;
    this.dust.rotation.y = t * 0.015;
    this.model.sparks.update(dt);

    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
  };

  /** Largeur d’une étiquette (mesurée une fois, puis à chaque redimensionnement). */
  private labelWidths = new Map<HTMLElement, number>();
  private labelWidth(el: HTMLElement) {
    let width = this.labelWidths.get(el);
    if (!width) {
      width = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
      if (width) this.labelWidths.set(el, width);
    }
    return width;
  }

  /** Étiquettes HTML de la vue éclatée, posées sur leur pièce à chaque image. */
  private updateLabels() {
    if (!this.labels.length) return;
    this.model.root.getWorldPosition(this.center).project(this.camera);
    const cx = (this.center.x * 0.5 + 0.5) * this.size.w;
    const margin = 10;
    for (const { el, anchor } of this.labels) {
      const target = this.model.anchors[anchor];
      if (!target) continue;
      target.getWorldPosition(this.tmp).project(this.camera);
      const x = (this.tmp.x * 0.5 + 0.5) * this.size.w;
      const y = (-this.tmp.y * 0.5 + 0.5) * this.size.h;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      // Vers l’extérieur du téléphone, sauf si l’étiquette sortait de l’écran (petits écrans).
      let side = x >= cx ? "right" : "left";
      const width = this.labelWidth(el);
      const fitsRight = x + width <= this.size.w - margin;
      const fitsLeft = x - width >= margin;
      if (side === "right" && !fitsRight) side = fitsLeft || x > this.size.w - x ? "left" : "right";
      else if (side === "left" && !fitsLeft) side = fitsRight || this.size.w - x > x ? "right" : "left";
      if (el.dataset.side !== side) el.dataset.side = side;
    }
  }

  dispose() {
    this.disposed = true;
    this.introTimeline?.revert();
    this.renderer.domElement.removeEventListener("webglcontextlost", this.onContextLost);
    this.model.dispose();
    this.glow.geometry.dispose();
    this.glow.material.dispose();
    this.dust.geometry.dispose();
    this.dust.material.dispose();
    this.envTarget.dispose();
    this.renderer.dispose();
  }
}

export { PHONE };
