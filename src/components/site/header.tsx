"use client";

import { useGSAP } from "@gsap/react";
import clsx from "clsx";
import gsap from "gsap";
import { ChevronRight, Menu, Phone, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo, WhatsappIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme";
import { ButtonLink, ExternalButton, buttonClass } from "@/components/ui/button";
import { getLenis } from "@/lib/lenis-store";

gsap.registerPlugin(useGSAP);

const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/accessoires", label: "Accessoires" },
  { href: "/realisations", label: "Réalisations" },
  { href: "/avis", label: "Avis" },
  { href: "/contact", label: "Contact" },
];

export function Header({
  businessName,
  whatsappHref,
  phoneHref,
  announcement,
}: {
  businessName: string;
  whatsappHref: string | null;
  phoneHref: string | null;
  announcement?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // Menu mobile ouvert : la page derrière ne défile plus (Lenis compris).
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    getLenis()?.stop();
    return () => {
      document.body.style.overflow = "";
      getLenis()?.start();
    };
  }, [open]);

  // Au-dessus d’une section sombre (data-header-tone="dark", ex. la scène 3D de l’accueil),
  // l’en-tête devient transparent et passe en clair. Les sections arrivent parfois après la
  // navigation (squelette de chargement) : on surveille aussi les changements du contenu.
  useEffect(() => {
    const header = headerRef.current;
    const main = document.getElementById("contenu");
    if (!header) return;
    const active = new Set<Element>();
    const observed = new WeakSet<Element>();
    const update = () => {
      for (const el of active) if (!el.isConnected) active.delete(el);
      header.dataset.tone = active.size ? "dark" : "default";
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) active.add(entry.target);
          else active.delete(entry.target);
        }
        update();
      },
      { rootMargin: "0px 0px -92% 0px" },
    );
    let frame = 0;
    const scan = () => {
      frame = 0;
      for (const el of document.querySelectorAll('[data-header-tone="dark"]')) {
        if (observed.has(el)) continue;
        observed.add(el);
        io.observe(el);
      }
      update();
    };
    scan();
    const mutations = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(scan);
    });
    if (main) mutations.observe(main, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  // Se retire quand on descend, revient dès qu’on remonte.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        header.dataset.scrolled = String(y > 8);
        if (Math.abs(y - last) < 6) return;
        header.dataset.hidden = String(y > 180 && y > last);
        last = y;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Entrée du menu mobile : les liens montent en cascade.
  useGSAP(
    () => {
      if (!open || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from("[data-menu-item]", { yPercent: 60, opacity: 0, duration: 0.7, ease: "power4.out", stagger: 0.05, clearProps: "all" });
    },
    { dependencies: [open], scope: menuRef },
  );

  return (
    <>
      {announcement ? (
        <div className="bg-charcoal px-4 py-2 text-center text-[13px] font-medium text-white">{announcement}</div>
      ) : null}
      {/* L’accueil s’ouvre sur la scène sombre : ton clair dès le rendu serveur, sans attendre l’observateur */}
      <header ref={headerRef} data-tone={pathname === "/" ? "dark" : "default"} className="site-header sticky top-0 z-40">
        {/* site-header-bar : au défilement (grands écrans), la barre se détache en pilule flottante (experience.css) */}
        <div className="site-header-bar container-page flex h-16 items-center justify-between gap-6 sm:h-18">
          <Link href="/" aria-label={`${businessName}, accueil`} onClick={() => setOpen(false)} data-magnetic>
            <Logo name={businessName} />
          </Link>
          <nav aria-label="Navigation principale" className="hidden items-center gap-7 text-[13px] lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={clsx(
                  "nav-link relative py-2 after:absolute after:inset-x-0 after:bottom-0.5 after:h-px after:origin-left after:bg-current after:transition-transform after:duration-500 after:ease-expo",
                  isActive(item.href) ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100",
                )}
              >
                {/* Texte doublé : au survol, la première ligne file vers le haut et la copie la remplace */}
                <span className="text-roll" data-text={item.label}>
                  <span>{item.label}</span>
                </span>
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle className="header-icon hidden size-10 place-items-center rounded-full border transition-colors sm:grid" />
            {phoneHref ? (
              <a href={phoneHref} className="header-icon hidden size-10 place-items-center rounded-full border transition-colors sm:grid" aria-label="Appeler">
                <Phone className="size-4.5" aria-hidden />
              </a>
            ) : null}
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="grid size-10 place-items-center rounded-full bg-whatsapp text-white transition-colors hover:bg-[#0d6e3a]"
                aria-label="Écrire sur WhatsApp"
              >
                <WhatsappIcon className="size-5" aria-hidden />
              </a>
            ) : null}
            <div className="hidden sm:block">
              <ButtonLink href="/devis" size="sm" className="h-9 px-4" data-magnetic>
                Demander un devis
              </ButtonLink>
            </div>
            <button
              type="button"
              className="header-icon grid size-10 place-items-center rounded-full border lg:hidden"
              aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>
      {open ? (
        <div
          ref={menuRef}
          id="mobile-menu"
          data-lenis-prevent
          className="mobile-menu fixed inset-0 z-50 overflow-y-auto bg-bg lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div className="container-page flex h-16 items-center justify-between border-b border-line sm:h-18">
            <Link href="/" aria-label={`${businessName}, accueil`} onClick={() => setOpen(false)}>
              <Logo name={businessName} />
            </Link>
            <button type="button" className="grid size-10 place-items-center rounded-full border border-line-strong" aria-label="Fermer le menu" onClick={() => setOpen(false)}>
              <X className="size-5" />
            </button>
          </div>
          <nav aria-label="Navigation mobile" className="container-page flex flex-col pb-[max(24px,env(safe-area-inset-bottom))] pt-2">
            {NAV.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                data-menu-item
                className={clsx(
                  "flex items-center justify-between border-b border-line py-4 font-display text-[28px] font-extrabold tracking-[-0.03em]",
                  isActive(item.href) && "text-brand-strong",
                )}
              >
                <span className="flex items-baseline gap-3">
                  <span className="font-mono text-xs font-medium text-faint">0{index + 1}</span>
                  {item.label}
                </span>
                <ChevronRight className={clsx("size-5", isActive(item.href) ? "text-brand-strong" : "text-faint")} aria-hidden />
              </Link>
            ))}
            <div className="mt-6 grid gap-3" data-menu-item>
              <ButtonLink href="/devis" size="lg" onClick={() => setOpen(false)}>
                Demander un devis
              </ButtonLink>
              {whatsappHref ? (
                <ExternalButton href={whatsappHref} target="_blank" rel="noopener noreferrer" variant="whatsapp" size="lg" icon={<WhatsappIcon className="size-5" />}>
                  Écrire sur WhatsApp
                </ExternalButton>
              ) : null}
              {phoneHref ? (
                <ExternalButton href={phoneHref} variant="outline" size="lg" icon={<Phone className="size-4.5" />}>
                  Appeler
                </ExternalButton>
              ) : null}
              <ThemeToggle withLabel className={buttonClass("outline", "lg")} />
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
