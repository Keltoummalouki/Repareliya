import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/data/public";

export const metadata: Metadata = { title: "Politique de confidentialité", robots: { index: false } };

export default async function ConfidentialitePage() {
  const settings = await getSiteSettings();
  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <h1 className="text-4xl font-extrabold">Politique de confidentialité</h1>
      <div className="prose-legal mt-8">
        <h2>Données collectées</h2>
        <p>
          Lorsque vous envoyez une demande de devis ou un message, nous recueillons votre nom, votre moyen de contact préféré, les
          coordonnées que vous indiquez (téléphone, WhatsApp, e-mail), la description de votre appareil et de la panne, ainsi que les
          photos éventuellement jointes. Lorsque vous publiez un avis, nous recueillons votre prénom ou pseudo, votre note et votre
          commentaire.
        </p>
        <h2>Utilisation</h2>
        <p>
          Ces informations servent uniquement à répondre à votre demande, établir votre devis ou votre facture et vous les transmettre
          par le canal que vous avez choisi. Elles ne sont ni vendues ni cédées à des tiers.
        </p>
        <h2>Conservation</h2>
        <p>
          Les demandes sont conservées le temps nécessaire au suivi de la réparation. Les factures sont conservées pendant la durée
          légale applicable. Une empreinte anonymisée de votre connexion est utilisée pour limiter les envois abusifs.
        </p>
        <h2>Vos droits</h2>
        <p>
          Vous pouvez demander l’accès, la rectification ou la suppression de vos données
          {settings.email ? <> en écrivant à <a className="underline" href={`mailto:${settings.email}`}>{settings.email}</a></> : " en nous contactant"}.
        </p>
        <h2>Cookies</h2>
        <p>Le site public n’utilise pas de cookies publicitaires ni de traceurs. Un cookie technique est utilisé uniquement pour la connexion au tableau de bord.</p>
      </div>
    </div>
  );
}
