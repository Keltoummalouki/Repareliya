import * as THREE from "three";
import { LOGO_PATH } from "@/components/icons";
import { siteFont } from "./utils";

/*
 * Écran du téléphone : une dalle OLED physique (noire, avec son propre reflet quand la vitre
 * n’est plus là) dont l’image est calculée par un shader. Cassée, elle ne grésille (colonnes de
 * pixels, tache d’encre autour de l’impact) que tant qu’elle reçoit encore du courant ; éteinte,
 * elle est d’un noir profond. Puis elle s’allume depuis le centre et révèle un fond d’écran en
 * mouvement, l’écran de verrouillage et une notification.
 */

export type ScreenUniforms = {
  uTime: { value: number };
  uPower: { value: number };
  uBroken: { value: number };
  uNotify: { value: number };
  uAspect: { value: number };
  uImpact: { value: THREE.Vector2 };
  uLock: { value: THREE.Texture };
  uNotice: { value: THREE.Texture };
};

const LOCK_W = 512;
const NOTICE_H = 200;

function canvasTexture(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, texture, ctx: canvas.getContext("2d")! };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Pictogramme de la marque, blanc sur carré bleu arrondi (icône d’application). */
function drawAppIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, "#2997ff");
  gradient.addColorStop(1, "#0071e3");
  ctx.fillStyle = gradient;
  roundRect(ctx, x, y, size, size, size * 0.24);
  ctx.fill();
  const glyph = size * 0.62;
  const scale = glyph / 860;
  ctx.save();
  ctx.translate(x + (size - 539 * scale) / 2, y + (size - glyph) / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#fff";
  ctx.fill(new Path2D(LOGO_PATH), "evenodd");
  ctx.restore();
}

export class PhoneScreen {
  readonly uniforms: ScreenUniforms;
  /** Image en émission ; `specularIntensity` règle le reflet propre de la dalle (0 sous la vitre). */
  readonly material: THREE.MeshPhysicalMaterial;
  private lock: ReturnType<typeof canvasTexture>;
  private notice = canvasTexture(LOCK_W, NOTICE_H);
  private minuteTimer = 0;
  private display: string;
  private body: string;

  constructor(aspect: number, impact: THREE.Vector2) {
    this.lock = canvasTexture(LOCK_W, Math.round(LOCK_W / aspect));
    this.display = siteFont();
    this.body = siteFont();
    this.uniforms = {
      uTime: { value: 0 },
      uPower: { value: 0 },
      uBroken: { value: 1 },
      uNotify: { value: 0 },
      uAspect: { value: aspect },
      uImpact: { value: impact },
      uLock: { value: this.lock.texture },
      uNotice: { value: this.notice.texture },
    };
    // Dalle noire et satinée (polariseur) ; sous une vitre collée, elle n’a pas de reflet à elle.
    this.material = new THREE.MeshPhysicalMaterial({ color: 0x000000, metalness: 0, roughness: 0.14, specularIntensity: 0, toneMapped: false });
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec2 vScreenUv;")
        .replace("#include <uv_vertex>", "#include <uv_vertex>\nvScreenUv = uv;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n${SCREEN_IMAGE}`)
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance = screenImage(vScreenUv);");
    };
    this.material.customProgramCacheKey = () => "repareliya-screen";
    this.draw();
    // Les polices de la page ne sont pas forcément prêtes : on redessine dès qu’elles le sont.
    document.fonts?.ready.then(() => this.draw());
    this.minuteTimer = window.setInterval(() => this.draw(), 30_000);
  }

  private draw() {
    const now = new Date();
    const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const date = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const { ctx, canvas, texture } = this.lock;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "alphabetic";

    // Barre d’état
    ctx.font = `600 22px ${this.body}`;
    ctx.textAlign = "left";
    ctx.fillText(time, 46, 52);
    ctx.globalAlpha = 0.95;
    for (let i = 0; i < 4; i++) ctx.fillRect(w - 128 + i * 9, 44 - (i + 1) * 4, 6, (i + 1) * 4);
    roundRect(ctx, w - 82, 30, 40, 19, 6);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    roundRect(ctx, w - 79, 33, 34, 13, 4);
    ctx.fill();
    ctx.fillRect(w - 40, 36, 3, 7);
    ctx.globalAlpha = 1;

    // Date et heure
    ctx.textAlign = "center";
    ctx.font = `500 26px ${this.body}`;
    ctx.globalAlpha = 0.86;
    ctx.fillText(date.charAt(0).toUpperCase() + date.slice(1), w / 2, h * 0.17);
    ctx.globalAlpha = 1;
    ctx.font = `200 168px ${this.display}`;
    ctx.fillText(time, w / 2, h * 0.17 + 168);

    // Raccourcis et barre d’accueil
    for (const x of [92, w - 92]) {
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(x, h - 120, 34, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.9;
    ctx.fillRect(84, h - 136, 16, 26); // lampe
    roundRect(ctx, w - 108, h - 132, 32, 24, 5); // appareil photo
    ctx.fill();
    ctx.globalAlpha = 1;
    roundRect(ctx, w / 2 - 70, h - 26, 140, 8, 4);
    ctx.fill();
    texture.needsUpdate = true;

    // Notification « appareil prêt »
    const n = this.notice;
    const nc = n.ctx;
    nc.clearRect(0, 0, n.canvas.width, n.canvas.height);
    nc.fillStyle = "rgba(255,255,255,0.2)";
    roundRect(nc, 24, 20, n.canvas.width - 48, 156, 34);
    nc.fill();
    drawAppIcon(nc, 48, 46, 64);
    nc.fillStyle = "#fff";
    nc.textAlign = "left";
    nc.font = `700 21px ${this.body}`;
    nc.globalAlpha = 0.75;
    nc.fillText("REPARELIYA", 132, 70);
    nc.textAlign = "right";
    nc.fillText("maintenant", n.canvas.width - 52, 70);
    nc.globalAlpha = 1;
    nc.textAlign = "left";
    nc.font = `700 27px ${this.body}`;
    nc.fillText("Votre appareil est prêt ✓", 132, 110);
    nc.font = `400 23px ${this.body}`;
    nc.globalAlpha = 0.85;
    nc.fillText("Écran remplacé, testé et garanti.", 132, 146);
    nc.globalAlpha = 1;
    n.texture.needsUpdate = true;
  }

  dispose() {
    window.clearInterval(this.minuteTimer);
    this.lock.texture.dispose();
    this.notice.texture.dispose();
    this.material.dispose();
  }
}

/** Image de la dalle (couleurs en espace linéaire), injectée en émission dans le matériau physique. */
const SCREEN_IMAGE = /* glsl */ `
  uniform float uTime;
  uniform float uPower;
  uniform float uBroken;
  uniform float uNotify;
  uniform float uAspect;
  uniform vec2 uImpact;
  uniform sampler2D uLock;
  uniform sampler2D uNotice;
  varying vec2 vScreenUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
    return v;
  }
  float roundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  vec3 screenImage(vec2 uv) {
    vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);

    // Fond d’écran : rubans de lumière orange qui ondulent lentement.
    float t = uTime * 0.11;
    vec2 warp = vec2(fbm(p * 2.2 + t), fbm(p * 2.2 - t + 4.3));
    float n = fbm(p * 1.7 + warp * 1.9 + vec2(0.0, t * 1.4));
    float band = sin((p.y * 3.4 - p.x * 2.6 + n * 3.6) * 2.1 + uTime * 0.32);
    // Couleurs en espace linéaire : nuit bleutée, bleu #0071e3, violet #7d5cff, reflets #64d2ff.
    vec3 hue = mix(vec3(0.0, 0.165, 0.768), vec3(0.205, 0.107, 1.0), smoothstep(0.35, 0.75, warp.x));
    vec3 col = mix(vec3(0.002, 0.004, 0.03), hue, smoothstep(-0.4, 0.9, band) * (0.45 + n * 0.75));
    col = mix(col, vec3(0.127, 0.644, 1.0), smoothstep(0.84, 1.0, band) * 0.7);
    col *= 0.5 + 0.65 * smoothstep(1.0, 0.0, length(p - vec2(0.12, 0.2)));

    // Écran de verrouillage et notification (qui glisse depuis le haut).
    vec4 lock = texture2D(uLock, uv);
    col = mix(col, lock.rgb, lock.a * 0.96);
    // Bandeau de la notification sous l’horloge, aux proportions de sa texture (${LOCK_W} × ${NOTICE_H}).
    float noticeH = uAspect * ${(NOTICE_H / LOCK_W).toFixed(4)};
    float noticeTop = 0.635 + (1.0 - uNotify) * 0.05;
    vec2 nuv = vec2(uv.x, (uv.y - (noticeTop - noticeH)) / noticeH);
    if (nuv.y > 0.0 && nuv.y < 1.0) {
      vec4 notice = texture2D(uNotice, nuv);
      col = mix(col, mix(col * 0.55, notice.rgb, notice.a), clamp(notice.a * 1.4, 0.0, 1.0) * uNotify);
    }

    // Dynamic Island.
    float island = roundedBox(p - vec2(0.0, 0.452), vec2(0.072, 0.018), 0.018);
    col = mix(col, vec3(0.0), 1.0 - smoothstep(0.0, 0.003, island));

    // Allumage : un cercle qui s’ouvre depuis le centre, bordé de lumière.
    float radius = uPower * 0.98;
    float r = length(p);
    float off = smoothstep(radius - 0.05, radius, r);
    float rim = (1.0 - smoothstep(0.0, 0.035, abs(r - radius))) * step(0.001, uPower) * (1.0 - smoothstep(0.85, 1.0, uPower));

    // Dalle cassée encore sous tension (le grésillement juste après l’impact) : colonnes de pixels
    // morts qui clignotent, tache d’encre autour de l’impact. Hors tension, un OLED est noir.
    float column = floor(uv.x * 170.0);
    float flick = step(0.45, hash(vec2(floor(uTime * 9.0), column)));
    vec3 dead = vec3(0.0, 0.85, 0.5) * step(0.982, hash(vec2(column, 3.0))) * (0.18 + 0.3 * flick);
    dead += vec3(0.85, 0.1, 0.75) * step(0.99, hash(vec2(column + 17.0, 5.0))) * 0.3;
    float band2 = step(0.96, hash(vec2(floor(uv.y * 90.0), floor(uTime * 3.0))));
    dead += vec3(0.25, 0.3, 0.4) * band2 * 0.12;
    float ink = smoothstep(0.3, 0.02, length((uv - uImpact) * vec2(uAspect, 1.0)) + (fbm(uv * 14.0) - 0.5) * 0.2);
    vec3 blank = dead * uBroken * (1.0 - ink) * smoothstep(0.0, 0.06, uPower);

    col = mix(col, blank, off);
    col += vec3(0.3, 0.62, 1.0) * rim * 1.8;
    return col;
  }
`;
