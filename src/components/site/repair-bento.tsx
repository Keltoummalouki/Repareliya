"use client";

import { animate, createTimeline, scrambleText, spring, stagger, svg, utils, type JSAnimation, type Timeline } from "animejs";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, type CSSProperties } from "react";
import { LOGO_PATH } from "@/components/icons";

/*
 * « Ce que nous réparons » en grille bento, à la manière d’apple.com : chaque appareil arrive
 * en panne (symptôme affiché dans la pastille), puis se répare sous les yeux du visiteur quand
 * la tuile entre à l’écran — et recommence au survol. Illustrations en SVG, animées par anime.js
 * (tracés, trajectoires, ressorts, cascades en grille).
 * Rendu serveur dans l’état réparé : sans JavaScript ou avec moins d’animations, on voit
 * directement les appareils en état de marche.
 */

type Category = { id: string; slug: string; name: string; description: string | null; icon: string | null };
type Kind = "smartphone" | "tablet" | "laptop" | "gamepad" | "watch" | "other";

const KINDS: Kind[] = ["smartphone", "tablet", "laptop", "gamepad", "watch"];
const kindOf = (icon: string | null): Kind => (KINDS.includes(icon as Kind) ? (icon as Kind) : "other");

const SYMPTOMS: Record<Kind, string> = {
  smartphone: "Écran fissuré",
  tablet: "Tactile inactif",
  laptop: "Ne démarre plus",
  gamepad: "Joystick qui dérive",
  watch: "Ne charge plus",
  other: "Panne inconnue",
};

const RED = "#ff3b30";
const GREEN = "#34c759";
const SURFACE = "var(--color-surface)";
// Pivot des aiguilles et des rotations : un point fixe du dessin, pas le centre de l’élément.
const pivot = (x: number, y: number): CSSProperties => ({ transformBox: "view-box", transformOrigin: `${x}px ${y}px` });
const fromLeft: CSSProperties = { transformOrigin: "left center" };

// ------------------------------------------------------------------------- Illustrations

function ScreenGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#2997ff" />
      <stop offset="0.55" stopColor="#5e5ce6" />
      <stop offset="1" stopColor="#bf5af2" />
    </linearGradient>
  );
}

function Check({ x, y }: { x: number; y: number }) {
  return (
    <g data-check>
      <circle cx={x} cy={y} r="15" fill={GREEN} />
      <path d={`M${x - 6.5} ${y + 0.5} l4.5 4.5 l9 -10`} stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function PhoneArt({ uid }: { uid: string }) {
  const apps = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) apps.push(<rect key={`${r}-${c}`} data-app x={38 + c * 22} y={78 + r * 24} width="16" height="16" rx="5" fill="#fff" opacity="0.92" />);
  return (
    <svg viewBox="0 0 160 260" fill="none">
      <defs>
        <ScreenGradient id={`${uid}-screen`} />
      </defs>
      <path d="M18 72v20M18 100v20M142 86v30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      <rect x="20" y="10" width="120" height="240" rx="26" fill={SURFACE} stroke="currentColor" strokeWidth="2.5" />
      <rect x="27" y="17" width="106" height="226" rx="20" fill={`url(#${uid}-screen)`} />
      <text x="80" y="58" textAnchor="middle" fontSize="21" fontWeight="600" fill="#fff" letterSpacing="-0.6">
        9:41
      </text>
      {apps}
      <rect x="36" y="208" width="88" height="25" rx="11" fill="#fff" opacity="0.24" />
      <rect data-off x="27" y="17" width="106" height="226" rx="20" fill="#050505" opacity="0" />
      <g data-cracks stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0">
        <path data-crack d="M62 88 L44 68 L33 72" />
        <path data-crack d="M62 88 L76 58 L84 30" />
        <path data-crack d="M62 88 L100 98 L127 90" />
        <path data-crack d="M62 88 L68 130 L58 164 L66 216" />
        <path data-crack d="M62 88 L40 112 L31 142" />
        <path data-crack d="M62 88 L92 76 L114 44" />
        <path data-crack d="M56 82 L64 78 L70 86 L64 94 L54 92 Z" />
      </g>
      <rect data-scan x="27" y="17" width="106" height="3" rx="1.5" fill="#64d2ff" opacity="0" />
      <rect x="62" y="23" width="36" height="11" rx="5.5" fill="#000" />
      <Check x={130} y={234} />
    </svg>
  );
}

function TabletArt({ uid }: { uid: string }) {
  return (
    <svg viewBox="0 0 260 180" fill="none">
      <defs>
        <ScreenGradient id={`${uid}-screen`} />
      </defs>
      <rect x="14" y="12" width="232" height="156" rx="18" fill={SURFACE} stroke="currentColor" strokeWidth="2.5" />
      <rect x="22" y="20" width="216" height="140" rx="11" fill={`url(#${uid}-screen)`} />
      <rect x="40" y="34" width="180" height="112" rx="10" fill="#fff" opacity="0.94" />
      <path d="M56 54h66" stroke="#1d1d1f" strokeWidth="6" strokeLinecap="round" />
      <path d="M56 70h118M56 81h92" stroke="#86868b" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <path
        data-ink
        d="M58 120 C70 98 84 132 98 110 S124 94 136 114 S160 130 176 104 S196 100 204 112"
        stroke="#0071e3"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect data-off x="22" y="20" width="216" height="140" rx="11" fill="#050505" opacity="0" />
      <g data-taps stroke="#fff" opacity="0">
        <circle cx="96" cy="84" r="9" strokeWidth="1.6" opacity="0.6" />
        <circle data-tap-ring cx="96" cy="84" r="18" strokeWidth="1" opacity="0.35" />
        <circle cx="172" cy="122" r="9" strokeWidth="1.6" opacity="0.6" />
        <circle data-tap-ring cx="172" cy="122" r="18" strokeWidth="1" opacity="0.35" />
      </g>
      <g data-pencil opacity="0">
        <g transform="rotate(38)">
          <rect x="-3.5" y="-64" width="7" height="55" rx="3.5" fill="#f5f5f7" stroke="#1d1d1f" strokeWidth="1.4" />
          <path d="M-3.5 -10 L0 0 L3.5 -10 Z" fill="#1d1d1f" />
        </g>
      </g>
      <circle cx="130" cy="16" r="1.6" fill="currentColor" opacity="0.5" />
      <Check x={232} y={160} />
    </svg>
  );
}

function LaptopArt({ uid }: { uid: string }) {
  // Pictogramme de la marque au démarrage (viewBox d’origine 539 × 860).
  const logoScale = 0.03;
  return (
    <svg viewBox="0 0 280 180" fill="none">
      <defs>
        <ScreenGradient id={`${uid}-screen`} />
      </defs>
      <rect x="48" y="10" width="184" height="124" rx="12" fill={SURFACE} stroke="currentColor" strokeWidth="2.5" />
      <rect x="56" y="18" width="168" height="108" rx="6" fill={`url(#${uid}-screen)`} />
      <rect x="80" y="38" width="96" height="58" rx="6" fill="#fff" opacity="0.92" />
      <path d="M90 50h40M90 60h62M90 68h48" stroke="#86868b" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <rect x="102" y="106" width="76" height="12" rx="6" fill="#fff" opacity="0.3" />
      <rect data-off x="56" y="18" width="168" height="108" rx="6" fill="#050505" opacity="0" />
      <g data-boot opacity="0">
        <path d={LOGO_PATH} fillRule="evenodd" fill="#f5f5f7" transform={`translate(${140 - (539 * logoScale) / 2} 46) scale(${logoScale})`} />
        <rect x="112" y="88" width="56" height="3" rx="1.5" fill="#fff" opacity="0.25" />
        <rect data-progress x="112" y="88" width="56" height="3" rx="1.5" fill="#f5f5f7" style={fromLeft} />
      </g>
      <g data-battery opacity="0">
        <rect x="122" y="62" width="34" height="18" rx="4.5" stroke="#f5f5f7" strokeWidth="2" />
        <rect x="158" y="68" width="3" height="6" rx="1.5" fill="#f5f5f7" />
        <rect data-battery-fill x="125" y="65" width="28" height="12" rx="2.5" fill={RED} style={fromLeft} />
        <path data-bolt d="M111 59l-7 12h6l-3 10 10-14h-6l3-8z" fill="#ffd60a" />
      </g>
      <path d="M18 136H262V140C262 146 256 150 250 150H30C24 150 18 146 18 140Z" fill={SURFACE} stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M122 136v2.5c0 2 1.6 3 3.5 3h29c1.9 0 3.5-1 3.5-3V136" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <circle cx="140" cy="14" r="1.5" fill="currentColor" opacity="0.5" />
      <Check x={250} y={136} />
    </svg>
  );
}

function GamepadArt() {
  const buttons: [number, number][] = [
    [186, 72],
    [202, 88],
    [186, 104],
    [170, 88],
  ];
  return (
    <svg viewBox="0 0 260 180" fill="none">
      <path
        d="M74 40H186C220 40 238 70 245 106C252 144 236 168 212 160C196 154 188 136 174 130H86C72 136 64 154 48 160C24 168 8 144 15 106C22 70 40 40 74 40Z"
        fill={SURFACE}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="84" cy="84" r="19" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <circle data-drift cx="84" cy="84" r="27" stroke={RED} strokeWidth="1.5" strokeDasharray="3 4" opacity="0" />
      <circle data-stick cx="84" cy="84" r="11.5" fill="currentColor" />
      <path d="M105 117h7v-7h7v7h7v7h-7v7h-7v-7h-7z" fill="currentColor" opacity="0.85" />
      <circle cx="150" cy="120" r="15" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <g data-rstick style={pivot(150, 120)}>
        <circle cx="150" cy="115" r="9" fill="currentColor" />
      </g>
      <rect x="116" y="64" width="11" height="5" rx="2.5" fill="currentColor" opacity="0.5" />
      <rect x="133" y="64" width="11" height="5" rx="2.5" fill="currentColor" opacity="0.5" />
      {buttons.map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle data-btn cx={cx} cy={cy} r="7.5" fill="#0071e3" />
          <circle cx={cx} cy={cy} r="7.5" stroke="currentColor" strokeWidth="2" />
        </g>
      ))}
      <Check x={236} y={154} />
    </svg>
  );
}

function WatchArt() {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    const major = i % 3 === 0;
    const r1 = major ? 23 : 25;
    return (
      <line
        key={i}
        x1={100 + Math.sin(a) * r1}
        y1={94 - Math.cos(a) * r1}
        x2={100 + Math.sin(a) * 30}
        y2={94 - Math.cos(a) * 30}
        stroke="#fff"
        strokeWidth={major ? 2.4 : 1.4}
        strokeLinecap="round"
        opacity={major ? 0.9 : 0.5}
      />
    );
  });
  return (
    <svg viewBox="0 0 200 220" fill="none">
      <rect x="70" y="2" width="60" height="48" rx="12" fill="var(--color-subtle)" stroke="currentColor" strokeWidth="2" />
      <rect x="70" y="170" width="60" height="48" rx="12" fill="var(--color-subtle)" stroke="currentColor" strokeWidth="2" />
      <rect x="44" y="40" width="112" height="140" rx="34" fill={SURFACE} stroke="currentColor" strokeWidth="2.5" />
      <rect x="156" y="76" width="7" height="24" rx="3.5" fill="currentColor" />
      <rect x="156" y="108" width="5" height="14" rx="2.5" fill="currentColor" opacity="0.6" />
      <rect x="52" y="48" width="96" height="124" rx="27" fill="#000" />
      <g data-face>
        {ticks}
        <line data-hour x1="100" y1="94" x2="100" y2="79" stroke="#fff" strokeWidth="4" strokeLinecap="round" style={pivot(100, 94)} />
        <line data-minute x1="100" y1="94" x2="100" y2="71" stroke="#fff" strokeWidth="3" strokeLinecap="round" style={pivot(100, 94)} />
        <line data-second x1="100" y1="100" x2="100" y2="68" stroke="#ff9f0a" strokeWidth="1.6" strokeLinecap="round" style={pivot(100, 94)} />
        <circle cx="100" cy="94" r="3.4" fill="#fff" />
        <polyline data-ecg points="62,146 77,146 83,138 89,154 95,130 101,152 107,146 138,146" stroke="#ff375f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g data-battery opacity="0">
        <rect x="83" y="100" width="30" height="16" rx="4" stroke="#fff" strokeWidth="2" />
        <rect x="115" y="105" width="3" height="6" rx="1.5" fill="#fff" />
        <rect data-battery-fill x="86" y="103" width="24" height="10" rx="2" fill={RED} style={fromLeft} />
      </g>
      <Check x={152} y={170} />
    </svg>
  );
}

function OtherArt() {
  return (
    <svg viewBox="0 0 200 180" fill="none">
      <rect x="40" y="30" width="120" height="120" rx="28" fill={SURFACE} stroke="currentColor" strokeWidth="2.5" />
      <g data-wrench style={pivot(100, 90)}>
        <path
          d="M114.7 66.3a5 5 0 0 0 0 7l8 8a5 5 0 0 0 7 0l15.5-15.5c1.6-1.6 4.3-1.1 4.9 1.1a30 30 0 0 1-41.3 35.3l-39.5 39.5a5 5 0 0 1-15-15l39.5-39.5a30 30 0 0 1 35.3-41.3c2.2.6 2.7 3.3 1.1 4.9z"
          transform="translate(100 90) scale(0.55) translate(-100 -100)"
          fill="currentColor"
        />
      </g>
      <Check x={152} y={146} />
    </svg>
  );
}

function Art({ kind, uid }: { kind: Kind; uid: string }) {
  switch (kind) {
    case "smartphone":
      return <PhoneArt uid={uid} />;
    case "tablet":
      return <TabletArt uid={uid} />;
    case "laptop":
      return <LaptopArt uid={uid} />;
    case "gamepad":
      return <GamepadArt />;
    case "watch":
      return <WatchArt />;
    default:
      return <OtherArt />;
  }
}

// ------------------------------------------------------------------------------ Scènes

type Query = { one: (selector: string) => Element | null; all: (selector: string) => Element[] };
type Scene = {
  /** Met l’appareil en panne ; renvoie éventuellement de quoi arrêter l’animation de panne. */
  broken: (q: Query) => (() => void) | void;
  /** Réparation complète. */
  repair: (q: Query) => Timeline;
};

const drawables = new WeakMap<Element, ReturnType<typeof svg.createDrawable>[number]>();
const drawable = (el: Element | null) => {
  if (!el) return [];
  if (!drawables.has(el)) drawables.set(el, svg.createDrawable(el as SVGGeometryElement)[0]);
  return [drawables.get(el)!];
};
const drawablesOf = (els: Element[]) => els.flatMap((el) => drawable(el));
const pop = (stiffness = 260, damping = 12) => spring({ stiffness, damping });

const SCENES: Record<Kind, Scene> = {
  smartphone: {
    broken: (q) => {
      utils.set(q.one("[data-cracks]")!, { opacity: 0.92 });
      utils.set(drawablesOf(q.all("[data-crack]")), { draw: "0 1" });
      utils.set(q.one("[data-off]")!, { opacity: 0.94 });
      utils.set(q.all("[data-app]"), { scale: 0, opacity: 0 });
      utils.set(q.one("[data-scan]")!, { opacity: 0, y: 0 });
    },
    repair: (q) =>
      createTimeline({ defaults: { ease: "outQuad" } })
        .add(drawablesOf(q.all("[data-crack]")), { draw: "1 1", duration: 520, delay: stagger(45) }, 0)
        .add(q.one("[data-scan]")!, { opacity: [0, 1], duration: 120 }, 380)
        .add(q.one("[data-scan]")!, { y: [0, 222], duration: 760, ease: "inOutSine" }, 380)
        .add(q.one("[data-scan]")!, { opacity: 0, duration: 160 }, 1000)
        .add(q.one("[data-off]")!, { opacity: 0, duration: 520 }, 760)
        .add(q.all("[data-app]"), { scale: [0, 1], opacity: [0, 1], delay: stagger(40, { grid: [4, 3], from: "center" }), ease: pop(240, 13) }, 980),
  },
  tablet: {
    broken: (q) => {
      utils.set(q.one("[data-off]")!, { opacity: 0.94 });
      utils.set(q.one("[data-taps]")!, { opacity: 1 });
      utils.set(drawable(q.one("[data-ink]")), { draw: "0 0" });
      utils.set(q.one("[data-pencil]")!, { opacity: 0 });
      // Des appuis qui ne produisent rien : l’écran tactile ne répond plus.
      const pulse = animate(q.all("[data-tap-ring]"), { scale: [0.6, 1.4], opacity: [0.5, 0], duration: 1100, loop: true, delay: stagger(450), ease: "outQuad" });
      return () => pulse.cancel();
    },
    repair: (q) => {
      const ink = q.one("[data-ink]") as SVGPathElement;
      const { translateX, translateY } = svg.createMotionPath(ink);
      return createTimeline({ defaults: { ease: "outQuad" } })
        .add(q.one("[data-taps]")!, { opacity: 0, duration: 250 }, 0)
        .add(q.one("[data-off]")!, { opacity: 0, duration: 480 }, 120)
        .add(q.one("[data-pencil]")!, { opacity: [0, 1], duration: 200 }, 520)
        .add(q.one("[data-pencil]")!, { translateX, translateY, duration: 1300, ease: "inOutSine" }, 520)
        .add(drawable(ink), { draw: ["0 0", "0 1"], duration: 1300, ease: "inOutSine" }, 520)
        .add(q.one("[data-pencil]")!, { opacity: 0, duration: 260 }, 1900);
    },
  },
  laptop: {
    broken: (q) => {
      utils.set(q.one("[data-off]")!, { opacity: 0.96 });
      utils.set(q.one("[data-battery]")!, { opacity: 1 });
      utils.set(q.one("[data-battery-fill]")!, { scaleX: 0.14, fill: RED });
      utils.set(q.one("[data-bolt]")!, { scale: 0 });
      utils.set(q.one("[data-boot]")!, { opacity: 0 });
      utils.set(q.one("[data-progress]")!, { scaleX: 0 });
    },
    repair: (q) =>
      createTimeline({ defaults: { ease: "outQuad" } })
        .add(q.one("[data-bolt]")!, { scale: [0, 1], ease: pop(300, 10) }, 0)
        .add(q.one("[data-battery-fill]")!, { scaleX: 1, fill: GREEN, duration: 800, ease: "inOutSine" }, 150)
        .add(q.one("[data-battery]")!, { opacity: 0, duration: 260 }, 1050)
        .add(q.one("[data-boot]")!, { opacity: 1, duration: 300 }, 1250)
        .add(q.one("[data-progress]")!, { scaleX: [0, 1], duration: 900, ease: "inOutQuad" }, 1350)
        .add(q.one("[data-boot]")!, { opacity: 0, duration: 260 }, 2300)
        .add(q.one("[data-off]")!, { opacity: 0, duration: 500 }, 2350),
  },
  gamepad: {
    broken: (q) => {
      const stick = q.one("[data-stick]")!;
      utils.set(stick, { x: 7, y: -6 });
      utils.set(q.one("[data-drift]")!, { opacity: 0.8 });
      utils.set(q.all("[data-btn]"), { opacity: 0 });
      // Le joystick dérive tout seul.
      const drift: JSAnimation = animate(stick, {
        x: [{ to: 9 }, { to: 5 }, { to: 8 }, { to: 6 }],
        y: [{ to: -4 }, { to: -8 }, { to: -5 }, { to: -7 }],
        duration: 1600,
        loop: true,
        alternate: true,
        ease: "inOutSine",
      });
      return () => drift.cancel();
    },
    repair: (q) =>
      createTimeline({ defaults: { ease: "outQuad" } })
        .add(q.one("[data-stick]")!, { x: 0, y: 0, ease: pop(180, 9) }, 0)
        .add(q.one("[data-drift]")!, { opacity: 0, scale: [1, 0.4], duration: 420 }, 0)
        .add(q.all("[data-btn]"), { opacity: [0, 1], scale: [0.4, 1], delay: stagger(110), ease: pop(320, 11) }, 420)
        .add(q.one("[data-rstick]")!, { rotate: [0, 360], duration: 1000, ease: "inOutSine" }, 520),
  },
  watch: {
    broken: (q) => {
      utils.set(q.one("[data-battery]")!, { opacity: 1 });
      utils.set(q.one("[data-battery-fill]")!, { scaleX: 0.12, fill: RED });
      utils.set(q.one("[data-face]")!, { opacity: 0 });
      utils.set(q.all("[data-hour], [data-minute], [data-second]"), { rotate: 0 });
      utils.set(drawable(q.one("[data-ecg]")), { draw: "0 0" });
    },
    repair: (q) => {
      // Les aiguilles tournent, puis se calent sur l’heure réelle.
      const now = new Date();
      const minutes = now.getMinutes();
      const hourAngle = (now.getHours() % 12) * 30 + minutes * 0.5;
      return createTimeline({ defaults: { ease: "outQuad" } })
        .add(q.one("[data-battery-fill]")!, { scaleX: 1, fill: GREEN, duration: 700, ease: "inOutSine" }, 0)
        .add(q.one("[data-battery]")!, { opacity: 0, duration: 250 }, 800)
        .add(q.one("[data-face]")!, { opacity: 1, duration: 320 }, 950)
        .add(q.one("[data-hour]")!, { rotate: 360 + hourAngle, ease: pop(55, 10) }, 1000)
        .add(q.one("[data-minute]")!, { rotate: 720 + minutes * 6, ease: pop(55, 10) }, 1000)
        .add(q.one("[data-second]")!, { rotate: 1080 + now.getSeconds() * 6, ease: pop(55, 10) }, 1000)
        .add(drawable(q.one("[data-ecg]")), { draw: ["0 0", "0 1"], duration: 900, ease: "inOutSine" }, 1300);
    },
  },
  other: {
    broken: (q) => {
      utils.set(q.one("[data-wrench]")!, { rotate: -30 });
    },
    repair: (q) =>
      createTimeline().add(q.one("[data-wrench]")!, {
        rotate: [{ to: 25, duration: 260 }, { to: -15, duration: 220 }, { to: 0, ease: pop(200, 9) }],
      }),
  },
};

// ---------------------------------------------------------------------------- Tuiles

function BentoTile({ category, index, featured }: { category: Category; index: number; featured: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  // Identifiant sûr pour les url(#…) des dégradés (useId peut contenir des caractères spéciaux).
  const uid = `bento-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const kind = kindOf(category.icon);

  useEffect(() => {
    const tile = ref.current;
    if (!tile || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const art = tile.querySelector("[data-art]")!;
    const status = tile.querySelector<HTMLElement>("[data-status]")!;
    const statusText = tile.querySelector<HTMLElement>("[data-status-text]")!;
    const q: Query = { one: (s) => art.querySelector(s), all: (s) => [...art.querySelectorAll(s)] };
    const scene = SCENES[kind];
    let timeline: Timeline | null = null;
    let stopBroken: (() => void) | void;
    let played = false;
    let busy = false;

    const setBroken = () => {
      timeline?.cancel();
      stopBroken?.();
      stopBroken = scene.broken(q);
      utils.set(q.one("[data-check]")!, { scale: 0 });
      status.dataset.state = "broken";
      statusText.textContent = SYMPTOMS[kind];
    };
    const repair = () => {
      busy = true;
      stopBroken?.();
      stopBroken = undefined;
      timeline = scene.repair(q);
      const end = timeline.duration;
      timeline
        .add(statusText, { innerHTML: scrambleText({ text: "Réparé", chars: "a-z", revealRate: 45 }) }, Math.max(0, end - 300))
        .call(() => {
          status.dataset.state = "repaired";
        }, Math.max(0, end - 300))
        .add(q.one("[data-check]")!, { scale: [0, 1], ease: pop(320, 11) }, end)
        .then(() => {
          busy = false;
        });
    };

    setBroken();
    // Déclenchée par l’illustration elle-même (une tuile haute dépasse souvent de l’écran).
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || played) return;
        played = true;
        io.disconnect();
        // Petit temps mort : on voit la panne avant la réparation.
        window.setTimeout(repair, 350);
      },
      { threshold: 0.6 },
    );
    io.observe(art);
    // Au survol (souris), l’appareil retombe en panne et se répare de nouveau.
    const replay = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !played || busy) return;
      setBroken();
      window.setTimeout(repair, 250);
    };
    tile.addEventListener("pointerenter", replay);
    return () => {
      io.disconnect();
      tile.removeEventListener("pointerenter", replay);
      timeline?.cancel();
      stopBroken?.();
    };
  }, [kind]);

  return (
    <Link ref={ref} href={`/tarifs?categorie=${category.slug}`} data-cursor-label="Tarifs" className={clsx("bento-tile group", featured && "bento-tile--featured")}>
      <div className="bento-head">
        <div>
          <h3 className="bento-title">{category.name}</h3>
          {category.description ? <p className="bento-text">{category.description}</p> : null}
        </div>
        <span className="bento-index">{String(index + 1).padStart(2, "0")}</span>
      </div>
      {/* Récit décoratif (panne → réparé) : muet pour les lecteurs d’écran */}
      <span data-status data-state="repaired" className="bento-status" aria-hidden>
        <span className="bento-status-dot" />
        <span data-status-text>Réparé</span>
      </span>
      <div data-art className="bento-art" aria-hidden>
        <Art kind={kind} uid={uid} />
      </div>
      <span className="bento-link">
        Voir les tarifs <ArrowRight className="size-4" aria-hidden />
      </span>
    </Link>
  );
}

export function RepairBento({ categories }: { categories: Category[] }) {
  return (
    <div data-reveal="stagger" className="bento">
      {categories.map((category, index) => (
        <BentoTile key={category.id} category={category} index={index} featured={index === 0 && categories.length >= 3} />
      ))}
    </div>
  );
}
