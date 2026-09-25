import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { SocialIcon, socialLabel, WhatsappIcon } from "@/components/icons";
import { SectionHeading } from "@/components/site/blocks";
import { DevisForm } from "@/components/site/devis-form";
import { telLink, whatsappLink } from "@/lib/contact";
import { getCategories, getRepairTypes, getSiteSettings, getSocialLinks } from "@/lib/data/public";
import { isSupabaseConfigured } from "@/lib/env";
import { formatPhone } from "@/lib/format";

export const metadata: Metadata = {
  title: "Contact",
  description: "Adresse, horaires, téléphone et WhatsApp de l’atelier. Écrivez-nous pour toute question.",
};

export default async function ContactPage() {
  if (!isSupabaseConfigured()) return null; // le layout affiche déjà <SetupNotice />
  const [settings, socials, categories, repairTypes] = await Promise.all([getSiteSettings(), getSocialLinks(), getCategories(), getRepairTypes()]);
  const whatsapp = whatsappLink(settings.whatsapp || settings.phone, undefined, settings.default_country);
  const phone = telLink(settings.phone, settings.default_country);
  const hours = settings.hours.filter((h) => h.value);

  const cards = [
    phone && { icon: <Phone className="size-5" />, title: "Téléphone", value: formatPhone(settings.phone, settings.default_country), href: phone },
    whatsapp && { icon: <WhatsappIcon className="size-5" />, title: "WhatsApp", value: formatPhone(settings.whatsapp || settings.phone, settings.default_country), href: whatsapp, external: true },
    settings.email && { icon: <Mail className="size-5" />, title: "E-mail", value: settings.email, href: `mailto:${settings.email}` },
    settings.address && { icon: <MapPin className="size-5" />, title: "Adresse", value: `${settings.address}${settings.city ? `, ${settings.city}` : ""}`, href: settings.maps_url || undefined, external: true },
  ].filter(Boolean) as { icon: React.ReactNode; title: string; value: string; href?: string; external?: boolean }[];

  return (
    <div className="container-page py-10 sm:py-14">
      <SectionHeading eyebrow="Contact" title={<>Parlons de<br />votre appareil.</>} />
      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          {cards.map((card) => (
            <a
              key={card.title}
              href={card.href}
              target={card.external ? "_blank" : undefined}
              rel={card.external ? "noopener noreferrer" : undefined}
              className="card flex items-center gap-4 p-5 transition-colors hover:border-ink"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong">{card.icon}</span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted">{card.title}</span>
                <span className="block break-words font-semibold">{card.value}</span>
              </span>
            </a>
          ))}
          {hours.length ? (
            <div className="card p-5">
              <p className="flex items-center gap-2 font-semibold">
                <Clock className="size-4.5 text-brand-strong" aria-hidden /> Horaires
              </p>
              <ul className="mt-3 grid gap-1.5 text-sm">
                {hours.map((h) => (
                  <li key={h.day} className="flex justify-between gap-4">
                    <span className="text-muted">{h.day}</span>
                    <span className="font-medium">{h.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {socials.length ? (
            <div className="flex flex-wrap gap-2">
              {socials.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:border-ink"
                >
                  <SocialIcon platform={s.platform} className="size-4" /> {s.label || socialLabel(s.platform)}
                </a>
              ))}
            </div>
          ) : null}
          {settings.maps_embed_url ? (
            <iframe src={settings.maps_embed_url} title="Plan d’accès" className="h-72 w-full rounded-(--radius-card) border border-line" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          ) : null}
        </div>
        <DevisForm kind="contact" categories={categories} repairTypes={repairTypes} currency={settings.currency} country={settings.default_country} />
      </div>
    </div>
  );
}
