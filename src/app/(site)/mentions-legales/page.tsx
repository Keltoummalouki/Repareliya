import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/data/public";

export const metadata: Metadata = { title: "Mentions légales", robots: { index: false } };

export default async function MentionsLegalesPage() {
  const settings = await getSiteSettings();
  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <h1 className="text-4xl font-extrabold">Mentions légales</h1>
      <div className="prose-legal mt-8">
        <h2>Éditeur du site</h2>
        <p>
          {settings.business_name}
          {settings.address ? <><br />{settings.address}{settings.city ? `, ${settings.city}` : ""}</> : null}
          {settings.phone ? <><br />Téléphone : {settings.phone}</> : null}
          {settings.email ? <><br />E-mail : {settings.email}</> : null}
        </p>
        <p>Les identifiants légaux de l’entreprise figurent sur chaque devis et facture.</p>
        <h2>Hébergement</h2>
        <p>Site hébergé par Vercel Inc. (ou l’hébergeur choisi) ; données stockées chez Supabase Inc.</p>
        <h2>Propriété intellectuelle</h2>
        <p>
          Les textes, photos et éléments graphiques de ce site appartiennent à {settings.business_name}, sauf mention contraire. Les
          marques et logos cités (Apple, Samsung, etc.) appartiennent à leurs propriétaires respectifs et sont utilisés uniquement pour
          identifier les appareils réparés. {settings.business_name} est un réparateur indépendant, non affilié à ces marques.
        </p>
      </div>
    </div>
  );
}
