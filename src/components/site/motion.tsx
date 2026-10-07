"use client";

import { useGSAP } from "@gsap/react";
import { animate, scrambleText, spring, stagger, utils } from "animejs";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { usePathname } from "next/navigation";
import { RIPPLE_EVENT } from "@/components/site/dot-grid";
import { whenPageVisible } from "@/lib/page-gate";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const EASE = "power3.out";
const START = "top 88%";

// Découpe le texte dans des masques par ligne. Le masque déborde un peu, sans changer la mise en page,
// pour ne pas rogner accents et jambages ; la perspective fait basculer les lettres en 3D.
const splitInMasks = (el: HTMLElement, type: string) => {
  const split = SplitText.create(el, { type, mask: "lines" });
  for (const mask of split.masks) {
    (mask as HTMLElement).style.setProperty("overflow-clip-margin", "0.15em");
    (mask as HTMLElement).style.perspective = "700px";
  }
  return split;
};

const formatCount = (value: number, decimals: number) => value.toFixed(decimals).replace(".", ",");

/**
 * Animations du site public (GSAP et anime.js). Les pages, rendues côté serveur, déclarent leurs blocs par attribut :
 * - data-reveal="heading" : sur-titre (brouillé puis révélé), titre découpé en lignes (en mots pour un h1), puis le reste ;
 * - data-reveal="chars" : grand titre qui se dévoile lettre à lettre, en basculant en 3D ;
 * - data-reveal="stagger" : les enfants apparaissent en cascade au défilement ;
 * - data-reveal="brands" : l’accroche (1er enfant) se dévoile mot à mot, puis les éléments du 2e entrent un à un ;
 * - data-reveal="up" : le bloc glisse vers le haut ;
 * - data-reveal="clip" : le bloc se découvre de bas en haut, son image se resserre ;
 * - data-reveal="pop" : le bloc rebondit puis flotte doucement ;
 * - data-count="4.9" (data-decimals="1") : le nombre défile de 0 à sa valeur ;
 * - data-stars : les étoiles s’allument une à une ;
 * - data-stack : cartes empilées (sticky) ; chacune s’efface sous la suivante et lance une onde
 *   dans la trame de points du [data-ripple-host] parent ;
 * - data-tilt (="8" degrés) : carte inclinée en 3D sous le pointeur, avec reflet ; son [data-tilt-icon] rebondit ;
 * - data-spring-hover : l’élément gonfle et se dandine au survol, sur un ressort ;
 * - data-parallax : le bloc remonte un peu plus vite que la page ;
 * - data-magnetic : le bouton suit légèrement le pointeur.
 * globals.css masque les [data-reveal] jusqu’à ce que ce composant prenne la main. Les apparitions
 * attendent que la page soit visible (préchargement ou rideau de transition terminés).
 * Rien ne bouge si l’appareil demande à réduire les animations.
 */
export function SiteMotion() {
  const pathname = usePathname();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", pointer: "(hover: hover) and (pointer: fine)" },
        (context) => {
          const { motion, pointer } = context.conditions as { motion: boolean; pointer: boolean };
          if (!motion) return;

          // Les pages sont dans le Suspense de leur loading.tsx : React les hydrate après ce composant.
          // Modifier leur DOM avant (styles, découpage du titre) ferait échouer l’hydratation, donc on
          // attend que React ait pris le bloc en main (il pose une clé __reactFiber$… sur chaque nœud).
          // Si cette clé venait à changer, le filet de sécurité CSS affiche quand même les blocs.
          const hydrated = (el: Element) => Object.keys(el).some((key) => key.startsWith("__reactFiber$"));

          // Chaque bloc n’est pris en charge qu’une fois : quand du contenu arrive après coup,
          // seuls les nouveaux blocs sont animés, pas ceux déjà à l’écran.
          const seen = new WeakSet<Element>();
          let waiting = false;
          const fresh = (selector: string) =>
            gsap.utils.toArray<HTMLElement>(selector).filter((el) => {
              if (seen.has(el)) return false;
              if (!hydrated(el)) {
                waiting = true;
                return false;
              }
              seen.add(el);
              return true;
            });

          // Prend la main sur les blocs masqués par le CSS. Un bloc déjà affiché par le filet
          // de sécurité (script chargé tardivement) n’est pas caché une seconde fois.
          const claim = (type: string) =>
            fresh(`[data-reveal="${type}"]`).filter((el) => {
              const hidden = getComputedStyle(el).opacity === "0";
              gsap.set(el, { animation: "none", opacity: 1 });
              return hidden;
            });

          const cleanups: (() => void)[] = [];
          // Joue une apparition une fois la page visible (après le préchargement ou le rideau).
          const play = (animation: () => void) => {
            cleanups.push(whenPageVisible(() => context.add(animation)));
          };

          const scan = () => {
            for (const el of claim("heading")) {
              const eyebrow = el.querySelector<HTMLElement>(".eyebrow");
              const title = el.querySelector<HTMLElement>("h1, h2");
              const others = (parent: Element) => Array.from(parent.children).filter((child) => !child.contains(title));
              const parts = [...new Set([eyebrow, title, ...(title?.parentElement ? others(title.parentElement) : []), ...others(el)])]
                .filter((part): part is HTMLElement => part instanceof HTMLElement)
                .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
              gsap.set(parts, { opacity: 0 });

              ScrollTrigger.create({
                trigger: el,
                start: START,
                once: true,
                // Découpage au dernier moment : polices chargées, largeur définitive.
                onEnter: () =>
                  play(() => {
                    const tl = gsap.timeline({ defaults: { ease: EASE } });
                    let at = 0;
                    for (const part of parts) {
                      if (part === title) {
                        const byWords = title.tagName === "H1";
                        const split = splitInMasks(title, byWords ? "lines,words" : "lines");
                        tl.set(title, { opacity: 1 }, at).from(
                          byWords ? split.words : split.lines,
                          {
                            yPercent: 120,
                            rotateX: -35,
                            transformOrigin: "50% 100%",
                            duration: byWords ? 1.1 : 1,
                            stagger: byWords ? 0.05 : 0.1,
                            ease: "expo.out",
                            onComplete: () => split.revert(),
                          },
                          at,
                        );
                        at += 0.3;
                      } else {
                        tl.fromTo(
                          part,
                          part === eyebrow ? { opacity: 0, x: -16 } : { opacity: 0, y: 24 },
                          { opacity: 1, x: 0, y: 0, duration: 0.8, clearProps: "opacity,transform" },
                          at,
                        );
                        // Sur-titre en texte brut : il se brouille puis se recompose (anime.js).
                        if (part === eyebrow && !eyebrow.children.length) {
                          tl.call(() => {
                            animate(eyebrow, { innerHTML: scrambleText({ chars: "a-z", revealRate: 55 }) });
                          }, [], at);
                        }
                        at += 0.08;
                      }
                    }
                  }),
              });
            }

            for (const el of claim("chars")) {
              gsap.set(el, { opacity: 0 });
              ScrollTrigger.create({
                trigger: el,
                start: START,
                once: true,
                onEnter: () =>
                  play(() => {
                    const split = splitInMasks(el, "lines,words,chars");
                    gsap.set(el, { opacity: 1 });
                    gsap.from(split.chars, {
                      yPercent: 115,
                      rotateX: -80,
                      transformOrigin: "50% 100% -20px",
                      duration: 1.2,
                      ease: "expo.out",
                      stagger: 0.018,
                      onComplete: () => split.revert(),
                    });
                  }),
              });
            }

            for (const el of claim("stagger")) {
              const items = Array.from(el.children);
              gsap.set(items, { opacity: 0, y: 32 });
              ScrollTrigger.batch(items, {
                start: "top 92%",
                once: true,
                onEnter: (batch) =>
                  play(() => {
                    gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, ease: EASE, stagger: 0.08, clearProps: "opacity,transform" });
                  }),
              });
            }

            for (const el of claim("brands")) {
              const [text, list] = Array.from(el.children) as HTMLElement[];
              const items = list ? Array.from(list.children) : [];
              gsap.set([text, ...items], { opacity: 0 });

              ScrollTrigger.create({
                trigger: el,
                start: START,
                once: true,
                onEnter: () =>
                  play(() => {
                    const split = splitInMasks(text, "lines,words");
                    // Sur mobile les marques forment une rangée qui défile : elles arrivent par la droite.
                    const row = window.matchMedia("(width < 48rem)").matches;
                    const tl = gsap
                      .timeline({ defaults: { ease: EASE } })
                      .set(text, { opacity: 1 })
                      .from(split.words, { yPercent: 120, duration: 0.9, stagger: 0.06, onComplete: () => split.revert() });
                    if (items.length) {
                      tl.fromTo(
                        items,
                        row ? { opacity: 0, x: 56 } : { opacity: 0, y: 24, scale: 0.85 },
                        { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.6)", stagger: 0.07, clearProps: "opacity,transform" },
                        0.35,
                      );
                    }
                  }),
              });
            }

            for (const el of claim("up")) {
              gsap.set(el, { opacity: 0, y: 40 });
              ScrollTrigger.create({
                trigger: el,
                start: START,
                once: true,
                onEnter: () =>
                  play(() => {
                    gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: EASE, clearProps: "transform" });
                  }),
              });
            }

            for (const el of claim("clip")) {
              const image = el.querySelector("img");
              gsap.set(el, { clipPath: "inset(100% 0% 0% 0%)" });
              ScrollTrigger.create({
                trigger: el,
                start: "top 90%",
                once: true,
                onEnter: () =>
                  play(() => {
                    gsap.to(el, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "expo.inOut", clearProps: "clipPath" });
                    if (image) gsap.from(image, { scale: 1.3, duration: 1.8, ease: "expo.out", clearProps: "transform" });
                  }),
              });
            }

            for (const el of claim("pop")) {
              gsap.set(el, { opacity: 0 });
              ScrollTrigger.create({
                trigger: el,
                start: START,
                once: true,
                onEnter: () =>
                  play(() => {
                    gsap
                      .timeline()
                      .fromTo(el, { opacity: 0, scale: 0.8, y: 24 }, { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: "back.out(1.7)" }, 0.6)
                      .to(el, { y: -8, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
                  }),
              });
            }

            // Nombres qui défilent (note moyenne, nombre d’avis…), sans changer de largeur.
            for (const el of fresh("[data-count]")) {
              const target = Number(el.dataset.count);
              const decimals = Number(el.dataset.decimals ?? 0);
              if (!Number.isFinite(target)) continue;
              el.style.fontVariantNumeric = "tabular-nums";
              el.textContent = formatCount(0, decimals);
              ScrollTrigger.create({
                trigger: el,
                start: START,
                once: true,
                onEnter: () =>
                  play(() => {
                    const counter = { value: 0 };
                    animate(counter, {
                      value: target,
                      duration: 1800,
                      ease: "outExpo",
                      onUpdate: () => {
                        el.textContent = formatCount(counter.value, decimals);
                      },
                    });
                  }),
              });
            }

            for (const el of fresh("[data-stars]")) {
              const stars = Array.from(el.children);
              // État de départ posé par anime.js lui-même : deux moteurs sur la même transformation se contredisent.
              utils.set(stars, { scale: 0, rotate: -90 });
              ScrollTrigger.create({
                trigger: el,
                start: START,
                once: true,
                onEnter: () =>
                  play(() => {
                    animate(stars, { scale: [0, 1], rotate: [-90, 0], delay: stagger(110, { start: 300 }), ease: spring({ stiffness: 220, damping: 11 }) });
                  }),
              });
            }

            // Cartes empilées : chacune s’assombrit et recule quand la suivante la recouvre.
            for (const el of fresh("[data-stack]")) {
              const cards = Array.from(el.children) as HTMLElement[];
              const host = el.closest<HTMLElement>("[data-ripple-host]");
              cards.forEach((card, index) => {
                const next = cards[index + 1];
                if (next) {
                  gsap.to(card, {
                    scale: 0.9 + index * 0.02,
                    "--dim": 0.55,
                    ease: "none",
                    scrollTrigger: { trigger: next, start: "top 85%", end: () => `top ${parseFloat(getComputedStyle(next).top) || 120}px`, scrub: true },
                  });
                }
                if (host) {
                  ScrollTrigger.create({
                    trigger: card,
                    start: () => `top ${(parseFloat(getComputedStyle(card).top) || 120) + 2}px`,
                    onEnter: () => {
                      const rect = card.getBoundingClientRect();
                      host.dispatchEvent(new CustomEvent(RIPPLE_EVENT, { detail: { x: rect.left + rect.width * 0.15, y: rect.top + 40 } }));
                    },
                  });
                }
              });
            }

            for (const el of fresh("[data-parallax]")) {
              gsap.to(el, {
                y: -(Number(el.dataset.parallax) || 60),
                ease: "none",
                scrollTrigger: { trigger: el, start: "clamp(top bottom)", end: "bottom top", scrub: true },
              });
            }

            if (pointer) {
              for (const el of fresh("[data-magnetic]")) {
                // La transition CSS sur transform freinerait le suivi du pointeur.
                gsap.set(el, { transitionProperty: "background-color, color, border-color" });
                const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: EASE });
                const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: EASE });
                const move = (event: PointerEvent) => {
                  const rect = el.getBoundingClientRect();
                  xTo((event.clientX - (rect.left - Number(gsap.getProperty(el, "x")) + rect.width / 2)) * 0.3);
                  yTo((event.clientY - (rect.top - Number(gsap.getProperty(el, "y")) + rect.height / 2)) * 0.4);
                };
                const leave = () => {
                  xTo(0);
                  yTo(0);
                };
                el.addEventListener("pointermove", move);
                el.addEventListener("pointerleave", leave);
                cleanups.push(() => {
                  el.removeEventListener("pointermove", move);
                  el.removeEventListener("pointerleave", leave);
                });
              }

              // Pastilles qui rebondissent au survol (ressort anime.js).
              for (const el of fresh("[data-spring-hover]")) {
                const enter = () => {
                  animate(el, {
                    scale: [{ to: 1.09, duration: 150, ease: "outQuad" }, { to: 1, ease: spring({ stiffness: 230, damping: 8 }) }],
                    rotate: [{ to: -4, duration: 110 }, { to: 3, duration: 110 }, { to: 0, ease: spring({ stiffness: 230, damping: 8 }) }],
                  });
                };
                el.addEventListener("pointerenter", enter);
                cleanups.push(() => el.removeEventListener("pointerenter", enter));
              }

              // Cartes inclinées en 3D, avec un reflet qui suit le pointeur (variables --mx / --my).
              for (const el of fresh("[data-tilt]")) {
                const strength = Number(el.dataset.tilt) || 7;
                const icon = el.querySelector<HTMLElement>("[data-tilt-icon]");
                gsap.set(el, { transformPerspective: 900, transitionProperty: "background-color, color, border-color, box-shadow" });
                const rx = gsap.quickTo(el, "rotationX", { duration: 0.7, ease: EASE });
                const ry = gsap.quickTo(el, "rotationY", { duration: 0.7, ease: EASE });
                const lift = gsap.quickTo(el, "z", { duration: 0.7, ease: EASE });
                const move = (event: PointerEvent) => {
                  const rect = el.getBoundingClientRect();
                  const px = (event.clientX - rect.left) / rect.width;
                  const py = (event.clientY - rect.top) / rect.height;
                  ry((px - 0.5) * strength * 2);
                  rx(-(py - 0.5) * strength * 2);
                  el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
                  el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
                };
                const enter = () => {
                  el.dataset.hover = "true";
                  lift(24);
                  if (icon) {
                    animate(icon, {
                      scale: [{ to: 1.25, duration: 140, ease: "outQuad" }, { to: 1, ease: spring({ stiffness: 200, damping: 8 }) }],
                      rotate: [{ to: -14, duration: 140, ease: "outQuad" }, { to: 0, ease: spring({ stiffness: 200, damping: 8 }) }],
                    });
                  }
                };
                const leave = () => {
                  delete el.dataset.hover;
                  rx(0);
                  ry(0);
                  lift(0);
                };
                el.addEventListener("pointermove", move);
                el.addEventListener("pointerenter", enter);
                el.addEventListener("pointerleave", leave);
                cleanups.push(() => {
                  el.removeEventListener("pointermove", move);
                  el.removeEventListener("pointerenter", enter);
                  el.removeEventListener("pointerleave", leave);
                });
              }
            }
          };

          // Tant que des blocs attendent l’hydratation, on repasse à chaque image, sans dépasser
          // le moment où le filet de sécurité CSS les affiche de toute façon.
          let frame = 0;
          let until = performance.now() + 3000;
          const rescan = () => {
            waiting = false;
            context.add(scan);
            if (waiting && performance.now() < until) frame = requestAnimationFrame(rescan);
          };
          rescan();

          // Une page qui passe par son squelette (loading.tsx) arrive après le changement d’URL :
          // ses blocs sont pris en charge dès leur insertion dans le document.
          const mutations = new MutationObserver(() => {
            until = performance.now() + 3000;
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(rescan);
          });
          mutations.observe(document.body, { childList: true, subtree: true });
          cleanups.push(() => {
            mutations.disconnect();
            cancelAnimationFrame(frame);
          });

          // Recalcule les déclencheurs quand la page change de hauteur (estimateur déplié, images…).
          let timer: number | undefined;
          const observer = new ResizeObserver(() => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => ScrollTrigger.refresh(), 200);
          });
          observer.observe(document.body);
          cleanups.push(() => {
            observer.disconnect();
            window.clearTimeout(timer);
          });

          return () => cleanups.forEach((cleanup) => cleanup());
        },
      );
      return () => mm.revert();
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );

  return null;
}
