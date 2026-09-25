"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { usePathname } from "next/navigation";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const EASE = "power3.out";
const START = "top 88%";

// Découpe le texte dans des masques par ligne. Le masque déborde un peu, sans changer la mise en page,
// pour ne pas rogner accents et jambages.
const splitInMasks = (el: HTMLElement, type: string) => {
  const split = SplitText.create(el, { type, mask: "lines" });
  for (const mask of split.masks) (mask as HTMLElement).style.setProperty("overflow-clip-margin", "0.15em");
  return split;
};

/**
 * Animations du site public (GSAP). Les pages, rendues côté serveur, déclarent leurs blocs par attribut :
 * - data-reveal="heading" : sur-titre, titre découpé en lignes (en mots pour un h1), puis le reste du bloc ;
 * - data-reveal="stagger" : les enfants apparaissent en cascade au défilement ;
 * - data-reveal="brands" : l’accroche (1er enfant) se dévoile mot à mot, puis les marques (enfants du 2e) entrent une à une ;
 * - data-reveal="up" : le bloc glisse vers le haut ;
 * - data-reveal="pop" : le bloc rebondit puis flotte doucement ;
 * - data-parallax : le bloc remonte un peu plus vite que la page ;
 * - data-magnetic : le bouton suit légèrement le pointeur.
 * globals.css masque les [data-reveal] jusqu’à ce que ce composant prenne la main.
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
                  context.add(() => {
                    const tl = gsap.timeline({ defaults: { ease: EASE } });
                    let at = 0;
                    for (const part of parts) {
                      if (part === title) {
                        const byWords = title.tagName === "H1";
                        const split = splitInMasks(title, byWords ? "lines,words" : "lines");
                        tl.set(title, { opacity: 1 }, at).from(
                          byWords ? split.words : split.lines,
                          { yPercent: 120, duration: byWords ? 1 : 0.9, stagger: byWords ? 0.05 : 0.1, onComplete: () => split.revert() },
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
                        at += 0.08;
                      }
                    }
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
                  context.add(() =>
                    gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, ease: EASE, stagger: 0.08, clearProps: "opacity,transform" }),
                  ),
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
                  context.add(() => {
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
              gsap.from(el, { opacity: 0, y: 40, duration: 0.9, ease: EASE, clearProps: "transform", scrollTrigger: { trigger: el, start: START, once: true } });
            }

            for (const el of claim("pop")) {
              gsap
                .timeline({ scrollTrigger: { trigger: el, start: START, once: true } })
                .from(el, { opacity: 0, scale: 0.8, y: 24, duration: 0.8, ease: "back.out(1.7)" }, 0.6)
                .to(el, { y: -8, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
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
