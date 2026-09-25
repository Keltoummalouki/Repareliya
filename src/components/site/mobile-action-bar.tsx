"use client";

import clsx from "clsx";
import { ArrowUpRight, Phone, Tag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { WhatsappIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";

/**
 * Barre d’actions fixée en bas de l’écran, sur mobile uniquement : le devis, l’appel et WhatsApp
 * restent à portée de pouce. Elle apparaît une fois le haut de page dépassé (ses boutons y sont déjà),
 * et n’est pas affichée sur le formulaire de devis.
 */
export function MobileActionBar({ whatsappHref, phoneHref }: { whatsappHref: string | null; phoneHref: string | null }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 360);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  if (pathname.startsWith("/devis")) return null;

  const iconButton = "grid size-12 shrink-0 place-items-center rounded-[10px] transition-colors";

  return (
    <>
      {/* Réserve la hauteur de la barre sous le pied de page (même fond que lui) pour qu’elle n’en masque pas la fin */}
      <div aria-hidden className="h-[calc(68px+env(safe-area-inset-bottom))] bg-surface lg:hidden" />
      <div
        inert={!visible}
        className={clsx(
          "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-lg transition-transform duration-300 lg:hidden",
          visible ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="container-page flex gap-2">
          {phoneHref ? (
            <a href={phoneHref} className={clsx(iconButton, "border border-line-strong bg-surface text-ink")} aria-label="Appeler">
              <Phone className="size-5" aria-hidden />
            </a>
          ) : null}
          {whatsappHref ? (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={clsx(iconButton, "bg-whatsapp text-white")} aria-label="Écrire sur WhatsApp">
              <WhatsappIcon className="size-5.5" aria-hidden />
            </a>
          ) : null}
          {!phoneHref && !whatsappHref && !pathname.startsWith("/tarifs") ? (
            <Link href="/tarifs" className="flex h-12 shrink-0 items-center gap-1.5 rounded-[10px] border border-line-strong bg-surface px-4 text-sm font-semibold text-ink">
              <Tag className="size-4" aria-hidden /> Tarifs
            </Link>
          ) : null}
          <ButtonLink href="/devis" size="lg" className="h-12 flex-1" icon={<ArrowUpRight className="size-4" />}>
            Demander un devis
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
