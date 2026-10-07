import * as THREE from "three";

/*
 * Étincelles de soudure : un réservoir de particules simulées sur le processeur (quelques
 * centaines, c’est négligeable) et dessinées en un seul appel. Elles naissent sur le front de
 * la vague de réparation à mesure qu’elle avance, ou en gerbe au point d’impact.
 */

export class Sparks {
  readonly points: THREE.Points;
  private readonly capacity: number;
  private readonly position: Float32Array;
  private readonly velocity: Float32Array;
  private readonly life: Float32Array; // 1 → 0
  private readonly decay: Float32Array;
  private readonly seed: Float32Array;
  private readonly alpha: Float32Array;
  private cursor = 0;
  private active = 0;
  private readonly material: THREE.ShaderMaterial;

  constructor(capacity: number, pixelRatio: number) {
    this.capacity = capacity;
    this.position = new Float32Array(capacity * 3);
    this.velocity = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.decay = new Float32Array(capacity);
    this.seed = new Float32Array(capacity);
    this.alpha = new Float32Array(capacity);
    for (let i = 0; i < capacity; i++) this.seed[i] = Math.random();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.position, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("aLife", new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(this.seed, 1));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);

    this.material = new THREE.ShaderMaterial({
      uniforms: { uSize: { value: 22 * pixelRatio } },
      vertexShader: /* glsl */ `
        uniform float uSize;
        attribute float aLife;
        attribute float aSeed;
        varying float vLife;
        void main() {
          vLife = aLife;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aLife > 0.0 ? uSize * (0.35 + aSeed * 0.75) * (0.45 + aLife * 0.55) / -mv.z : 0.0;
        }`,
      fragmentShader: /* glsl */ `
        varying float vLife;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float core = smoothstep(0.5, 0.0, d);
          vec3 color = mix(vec3(0.08, 0.38, 1.0), vec3(0.88, 0.95, 1.0), smoothstep(0.25, 1.0, vLife) * core);
          float a = core * core * vLife;
          if (a < 0.004) discard;
          gl_FragColor = vec4(color * a * 2.0, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
  }

  /** Une étincelle en (x, y) sur la vitre, projetée vers l’avant dans la direction (dx, dy). */
  emit(x: number, y: number, dx: number, dy: number, speed: number) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    this.position.set([x, y, 0.012], i * 3);
    const s = speed * (0.4 + Math.random() * 0.9);
    this.velocity.set([dx * s + (Math.random() - 0.5) * 0.25, dy * s + (Math.random() - 0.2) * 0.3, 0.25 + Math.random() * 0.9], i * 3);
    this.life[i] = 1;
    this.decay[i] = 1.1 + Math.random() * 1.8;
    this.active = this.capacity;
  }

  /** Gerbe autour d’un point (impact). */
  burst(x: number, y: number, count: number) {
    for (let n = 0; n < count; n++) {
      const angle = Math.random() * Math.PI * 2;
      this.emit(x, y, Math.cos(angle), Math.sin(angle), 1.2 + Math.random() * 1.6);
    }
  }

  update(dt: number) {
    if (!this.active) return;
    let alive = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) {
        this.alpha[i] = 0;
        continue;
      }
      alive++;
      this.life[i] = Math.max(0, this.life[i] - dt * this.decay[i]);
      const k = i * 3;
      this.velocity[k + 1] -= 2.4 * dt; // gravité
      this.velocity[k] *= 1 - 1.2 * dt; // frottement de l’air
      this.velocity[k + 2] *= 1 - 1.2 * dt;
      this.position[k] += this.velocity[k] * dt;
      this.position[k + 1] += this.velocity[k + 1] * dt;
      this.position[k + 2] += this.velocity[k + 2] * dt;
      this.alpha[i] = this.life[i];
    }
    const geometry = this.points.geometry;
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aLife.needsUpdate = true;
    if (!alive) this.active = 0;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
