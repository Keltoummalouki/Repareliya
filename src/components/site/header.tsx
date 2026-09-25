"use client";

import clsx from "clsx";
import { Menu, Phone, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo, WhatsappIcon } from "@/components/icons";
import { ButtonLink, ExternalButton } from "@/components/ui/button";

const NAV = [
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

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {announcement ? (
        <div className="bg-ink px-4 py-2 text-center text-[13px] font-medium text-white">{announcement}</div>
      ) : null}
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-lg">
        <div className="container-page flex h-[72px] items-center justify-between gap-6">
          <Link href="/" aria-label={`${businessName}, accueil`} onClick={() => setOpen(false)}>
            <Logo name={businessName} />
          </Link>
          <nav aria-label="Navigation principale" className="hidden items-center gap-7 text-sm font-medium lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "relative py-2 after:absolute after:inset-x-0 after:bottom-0.5 after:h-0.5 after:origin-left after:bg-brand after:transition-transform",
                  pathname.startsWith(item.href) ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {phoneHref ? (
              <a
                href={phoneHref}
                className="hidden size-10 place-items-center rounded-full border border-line-strong text-ink transition-colors hover:border-ink sm:grid"
                aria-label="Appeler"
              >
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
              <ButtonLink href="/devis" size="sm" variant="dark" className="h-10 px-4">
                Demander un devis
              </ButtonLink>
            </div>
            <button
              type="button"
              className="grid size-10 place-items-center rounded-full border border-line-strong lg:hidden"
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
        <div id="mobile-menu" className="fixed inset-0 z-50 overflow-y-auto bg-bg lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="container-page flex h-[72px] items-center justify-between border-b border-line">
            <Link href="/" aria-label={`${businessName}, accueil`} onClick={() => setOpen(false)}>
              <Logo name={businessName} />
            </Link>
            <button type="button" className="grid size-10 place-items-center rounded-full border border-line-strong" aria-label="Fermer le menu" onClick={() => setOpen(false)}>
              <X className="size-5" />
            </button>
          </div>
          <nav aria-label="Navigation mobile" className="container-page flex flex-col py-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-line py-4 font-display text-2xl font-bold"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-6 grid gap-3">
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
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
