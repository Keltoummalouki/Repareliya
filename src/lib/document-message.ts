import { formatAmount } from "@/lib/format";

/** Message envoyé au client (WhatsApp, SMS, e-mail) avec le lien vers son devis ou sa facture. */
export function buildDocumentMessage({
  type,
  number,
  customerName,
  total,
  currency,
  deviceLabel,
  link,
  businessName,
}: {
  type: "devis" | "facture";
  number: string | null;
  customerName: string;
  total: number | string;
  currency: string;
  deviceLabel?: string | null;
  link: string;
  businessName: string;
}) {
  const firstName = customerName.trim().split(/\s+/)[0] ?? "";
  const amount = formatAmount(total, currency).replace(/ /g, " ");
  const what = type === "devis" ? `votre devis ${number ?? ""}` : `votre facture ${number ?? ""}`;
  const device = deviceLabel ? ` pour votre ${deviceLabel}` : "";
  const action =
    type === "devis"
      ? "Vous pouvez le consulter, le télécharger en PDF et l’accepter en ligne ici :"
      : "Vous pouvez la consulter et la télécharger en PDF ici :";
  return `Bonjour ${firstName},\n\nVoici ${what.trim()}${device} d’un montant de ${amount}.\n${action}\n${link}\n\nÀ votre disposition pour toute question.\n${businessName}`;
}
