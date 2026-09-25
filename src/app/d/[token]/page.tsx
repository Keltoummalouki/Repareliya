import type { Metadata } from "next";
import { CheckCircle2, Download, Phone, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { Logo, WhatsappIcon } from "@/components/icons";
import { QuoteResponse } from "@/components/site/quote-response";
import { ExternalButton } from "@/components/ui/button";
import { telLink, whatsappLink } from "@/lib/contact";
import { getInvoiceSettings } from "@/lib/data/admin";
import { getSiteSettings } from "@/lib/data/public";
import { parseItems } from "@/lib/documents";
import { formatAmount, formatDate } from "@/lib/format";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Votre document", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicDocumentPage({ params }: PageProps<"/d/[token]">) {
  const { token } = await params;
  if (!uuidRe.test(token)) notFound();
  const supabase = createServiceClient();
  const { data: doc } = await supabase.from("documents").select("*").eq("public_token", token).maybeSingle();
  if (!doc || (doc.type === "facture" && doc.status === "brouillon")) notFound();
  const [site, invoice] = await Promise.all([getSiteSettings(), getInvoiceSettings(supabase)]);

  const isDevis = doc.type === "devis";
  const items = parseItems(doc.items);
  const rate = Number(doc.tax_rate);
  const canRespond = isDevis && (doc.status === "envoye" || doc.status === "brouillon");
  const expired = isDevis && doc.valid_until ? doc.valid_until < new Date().toISOString().slice(0, 10) : false;
  const whatsapp = whatsappLink(site.whatsapp || site.phone, `Bonjour, j’ai une question sur ${isDevis ? "le devis" : "la facture"} ${doc.number}.`, site.default_country);
  const phone = telLink(site.phone, site.default_country);

  return (
    <main className="min-h-screen bg-bg pb-16">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Logo name={site.business_name} className="text-[20px]" />
          <div className="flex gap-2">
            {phone ? (
              <a href={phone} className="grid size-10 place-items-center rounded-full border border-line-strong" aria-label="Appeler">
                <Phone className="size-4" />
              </a>
            ) : null}
            {whatsapp ? (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="grid size-10 place-items-center rounded-full bg-whatsapp text-white" aria-label="WhatsApp">
                <WhatsappIcon className="size-5" />
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pt-8">
        <p className="eyebrow">{isDevis ? "Devis" : "Facture"}</p>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
          {isDevis ? "Votre devis" : "Votre facture"} {doc.number}
        </h1>
        <p className="mt-2 text-muted">
          Émis le {formatDate(doc.issue_date)} pour {doc.customer_name}
          {isDevis && doc.valid_until ? ` · valable jusqu’au ${formatDate(doc.valid_until)}` : ""}
        </p>

        {doc.status === "accepte" ? (
          <p className="mt-6 flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 font-semibold text-success">
            <CheckCircle2 className="size-5" aria-hidden /> Devis accepté{doc.accepted_at ? ` le ${formatDate(doc.accepted_at)}` : ""}. Merci, nous revenons vers vous rapidement.
          </p>
        ) : null}
        {doc.status === "refuse" ? (
          <p className="mt-6 flex items-center gap-2 rounded-xl bg-danger-soft px-4 py-3 font-semibold text-danger">
            <XCircle className="size-5" aria-hidden /> Devis refusé. N’hésitez pas à nous contacter si besoin.
          </p>
        ) : null}
        {doc.status === "annule" ? (
          <p className="mt-6 rounded-xl bg-black/5 px-4 py-3 font-semibold">Ce document a été annulé.</p>
        ) : null}
        {doc.status === "paye" ? (
          <p className="mt-6 flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 font-semibold text-success">
            <CheckCircle2 className="size-5" aria-hidden /> Facture réglée{doc.paid_at ? ` le ${formatDate(doc.paid_at)}` : ""}. Merci !
          </p>
        ) : null}

        <section className="card mt-6 overflow-hidden">
          {doc.device_label ? (
            <p className="border-b border-line px-5 py-3 text-sm">
              <span className="text-muted">Appareil :</span> <strong>{doc.device_label}</strong>
            </p>
          ) : null}
          <ul className="divide-y divide-line">
            {items.map((item, i) => (
              <li key={i} className="flex justify-between gap-4 px-5 py-3.5">
                <span>
                  {item.description}
                  {item.quantity !== 1 ? <span className="text-muted"> × {String(item.quantity).replace(".", ",")}</span> : null}
                </span>
                <span className="whitespace-nowrap font-semibold">{formatAmount(item.quantity * item.unit_price, doc.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-line bg-[#fbfbf8] px-5 py-4">
            {rate > 0 ? (
              <>
                <p className="flex justify-between text-sm text-muted">
                  <span>Total HT</span>
                  <span>{formatAmount(doc.subtotal, doc.currency)}</span>
                </p>
                <p className="flex justify-between text-sm text-muted">
                  <span>TVA {String(rate).replace(".", ",")} %</span>
                  <span>{formatAmount(doc.tax_amount, doc.currency)}</span>
                </p>
              </>
            ) : null}
            <p className="flex items-baseline justify-between pt-1">
              <span className="font-bold">{rate > 0 ? "Total TTC" : "Total"}</span>
              <span className="font-display text-3xl font-extrabold text-brand-strong">{formatAmount(doc.total, doc.currency)}</span>
            </p>
            {rate === 0 && invoice.tax_note ? <p className="text-right text-xs text-muted">{invoice.tax_note}</p> : null}
          </div>
        </section>

        {doc.notes ? <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{doc.notes}</p> : null}
        {doc.terms ? (
          <details className="mt-4 text-sm text-ink-soft">
            <summary className="cursor-pointer font-semibold text-ink">{isDevis ? "Conditions du devis" : "Conditions de paiement"}</summary>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed">{doc.terms}</p>
          </details>
        ) : null}

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {canRespond && !expired ? <QuoteResponse token={token} /> : <span />}
          <ExternalButton href={`/d/${token}/pdf`} variant="outline" size="lg" icon={<Download className="size-4" />}>
            Télécharger le PDF
          </ExternalButton>
        </div>
        {canRespond && expired ? <p className="mt-4 text-sm text-warning">Ce devis a expiré. Contactez-nous pour le mettre à jour.</p> : null}
      </div>
    </main>
  );
}
