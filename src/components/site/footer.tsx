import { Clock, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Logo, SocialIcon, socialLabel } from "@/components/icons";
import { formatPhone } from "@/lib/format";
import type { SiteSettings } from "@/lib/settings";
import { telLink } from "@/lib/contact";

type Social = { id: string; platform: string; url: string; label: string | null };

export function Footer({ settings, socials }: { settings: SiteSettings; socials: Social[] }) {
  const year = new Date().getFullYear();
  const hours = settings.hours.filter((h) => h.value);
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.1fr]">
        <div>
          <Logo name={settings.business_name} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{settings.tagline}</p>
          {socials.length ? (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Réseaux sociaux">
              {socials.map((social) => (
                <li key={social.id}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid size-10 place-items-center rounded-full border border-line-strong text-ink transition-colors hover:border-ink hover:bg-ink hover:text-white"
                    aria-label={social.label || socialLabel(social.platform)}
                  >
                    <SocialIcon platform={social.platform} className="size-4.5" />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <nav aria-label="Liens du pied de page">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Le site</h2>
          <ul className="mt-4 grid gap-2.5 text-sm">
            <li><Link className="hover:text-brand-strong" href="/tarifs">Tarifs des réparations</Link></li>
            <li><Link className="hover:text-brand-strong" href="/devis">Demander un devis</Link></li>
            <li><Link className="hover:text-brand-strong" href="/accessoires">Accessoires</Link></li>
            <li><Link className="hover:text-brand-strong" href="/realisations">Nos réalisations</Link></li>
            <li><Link className="hover:text-brand-strong" href="/avis">Avis clients</Link></li>
            <li><Link className="hover:text-brand-strong" href="/contact">Contact</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Nous trouver</h2>
          <ul className="mt-4 grid gap-3 text-sm">
            {settings.address ? (
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-strong" aria-hidden />
                <span>
                  {settings.address}
                  {settings.city ? `, ${settings.city}` : ""}
                </span>
              </li>
            ) : null}
            {settings.phone ? (
              <li className="flex gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-brand-strong" aria-hidden />
                <a href={telLink(settings.phone, settings.default_country) ?? undefined} className="hover:text-brand-strong">
                  {formatPhone(settings.phone, settings.default_country)}
                </a>
              </li>
            ) : null}
            {settings.email ? (
              <li className="flex gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-brand-strong" aria-hidden />
                <a href={`mailto:${settings.email}`} className="break-all hover:text-brand-strong">
                  {settings.email}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Horaires</h2>
          {hours.length ? (
            <ul className="mt-4 grid gap-1.5 text-sm">
              {hours.map((h) => (
                <li key={h.day} className="flex justify-between gap-4">
                  <span className="text-muted">{h.day}</span>
                  <span className="text-right font-medium">{h.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 flex gap-2 text-sm text-muted">
              <Clock className="mt-0.5 size-4" aria-hidden /> Sur rendez-vous
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-3 py-6 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.business_name}. Tous droits réservés.
          </p>
          <div className="flex gap-5">
            <Link href="/mentions-legales" className="hover:text-ink">Mentions légales</Link>
            <Link href="/confidentialite" className="hover:text-ink">Confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
