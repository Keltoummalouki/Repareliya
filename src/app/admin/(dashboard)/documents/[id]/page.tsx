import type { Metadata } from "next";
import { Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentActions } from "@/components/admin/document-actions";
import { DocumentEditor } from "@/components/admin/document-editor";
import { PageBody, PageHeader, Panel } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { contactMethodLabel } from "@/lib/contact";
import { getAllSettings } from "@/lib/data/admin";
import { buildDocumentMessage } from "@/lib/document-message";
import { documentStatusLabel, DOCUMENT_STATUS, parseItems, type DocumentStatus } from "@/lib/documents";
import { isEmailConfigured } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { formatAmount, formatDate, formatDateTime, formatPhone } from "@/lib/format";

export const metadata: Metadata = { title: "Document" };

const SENT_LABEL: Record<string, string> = { email: "e-mail", whatsapp: "WhatsApp", sms: "SMS", telephone: "téléphone", autre: "autre" };

export default async function DocumentPage({ params }: PageProps<"/admin/documents/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: doc } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
  if (!doc) notFound();
  const { site } = await getAllSettings(supabase);
  const [{ data: source }, { data: derived }] = await Promise.all([
    doc.source_document_id ? supabase.from("documents").select("id, number").eq("id", doc.source_document_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("documents").select("id, number, type").eq("source_document_id", doc.id),
  ]);

  const type = doc.type as "devis" | "facture";
  const status = doc.status as DocumentStatus;
  const editable = type === "devis" ? status !== "annule" : status === "brouillon";
  const publicUrl = `${siteUrl()}/d/${doc.public_token}`;
  const message = buildDocumentMessage({
    type,
    number: doc.number,
    customerName: doc.customer_name,
    total: doc.total,
    currency: doc.currency,
    deviceLabel: doc.device_label,
    link: publicUrl,
    businessName: site.business_name,
  });
  const items = parseItems(doc.items);

  const actions = (
    <div className="card p-4">
      <DocumentActions
        doc={{
          id: doc.id,
          type,
          number: doc.number,
          status: doc.status,
          customer_name: doc.customer_name,
          customer_phone: doc.customer_phone,
          customer_whatsapp: doc.customer_whatsapp,
          customer_email: doc.customer_email,
          preferred_contact: doc.preferred_contact,
          sent_at: doc.sent_at,
          sent_via: doc.sent_via,
        }}
        publicUrl={publicUrl}
        message={message}
        emailEnabled={isEmailConfigured()}
        country={site.default_country}
        businessName={site.business_name}
      />
    </div>
  );

  return (
    <>
      <PageHeader
        back={doc.request_id ? { href: `/admin/inbox/${doc.request_id}`, label: "Demande liée" } : { href: "/admin/documents", label: "Devis & factures" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {type === "devis" ? "Devis" : "Facture"} {doc.number ?? "(brouillon)"}
            <Badge tone={DOCUMENT_STATUS[status]?.tone}>{documentStatusLabel(type, status)}</Badge>
          </span>
        }
        description={
          <>
            {doc.customer_name}
            {doc.sent_at ? ` · envoyé par ${SENT_LABEL[doc.sent_via ?? "autre"]} le ${formatDateTime(doc.sent_at)}` : ""}
            {doc.accepted_at ? ` · accepté le ${formatDateTime(doc.accepted_at)}` : ""}
            {doc.paid_at ? ` · payée le ${formatDate(doc.paid_at)}${doc.payment_method ? ` (${doc.payment_method})` : ""}` : ""}
          </>
        }
      />
      <PageBody className={editable ? undefined : "grid gap-6 lg:grid-cols-[1fr_300px]"}>
        <div className="min-w-0">
          {source || derived?.length ? (
            <p className="mb-4 text-sm text-muted">
              {source ? (
                <>
                  Créée depuis le devis{" "}
                  <Link className="font-semibold text-ink underline" href={`/admin/documents/${source.id}`}>
                    {source.number}
                  </Link>
                  .{" "}
                </>
              ) : null}
              {derived?.map((d) => (
                <span key={d.id}>
                  {d.type === "facture" ? "Facture" : "Devis"} associé :{" "}
                  <Link className="font-semibold text-ink underline" href={`/admin/documents/${d.id}`}>
                    {d.number ?? "brouillon"}
                  </Link>{" "}
                </span>
              ))}
            </p>
          ) : null}
          {editable ? (
            <DocumentEditor
              id={doc.id}
              aside={actions}
              initial={{
                type,
                customer_name: doc.customer_name,
                customer_phone: doc.customer_phone,
                customer_whatsapp: doc.customer_whatsapp,
                customer_email: doc.customer_email,
                customer_address: doc.customer_address,
                preferred_contact: doc.preferred_contact as "telephone" | "whatsapp" | "email" | null,
                device_label: doc.device_label,
                items,
                prices_include_tax: doc.prices_include_tax,
                tax_rate: Number(doc.tax_rate),
                currency: doc.currency,
                notes: doc.notes,
                terms: doc.terms,
                issue_date: doc.issue_date,
                valid_until: doc.valid_until,
                due_date: doc.due_date,
              }}
            />
          ) : (
            <div className="space-y-6">
              <p className="flex items-center gap-2 rounded-xl bg-ink/[0.04] px-4 py-3 text-sm text-ink-soft">
                <Lock className="size-4" aria-hidden />
                {type === "facture" ? "Facture validée : son contenu est verrouillé. Pour corriger, annulez-la et dupliquez-la." : "Devis annulé : dupliquez-le pour repartir de son contenu."}
              </p>
              <Panel title="Client">
                <p className="font-semibold">{doc.customer_name}</p>
                <p className="mt-1 text-sm text-muted">
                  {[formatPhone(doc.customer_phone, site.default_country), doc.customer_whatsapp ? `WhatsApp ${formatPhone(doc.customer_whatsapp, site.default_country)}` : "", doc.customer_email, doc.customer_address]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {doc.preferred_contact ? <p className="mt-1 text-sm">Contact préféré : {contactMethodLabel(doc.preferred_contact)}</p> : null}
                {doc.device_label ? <p className="mt-3 text-sm"><span className="text-muted">Appareil :</span> {doc.device_label}</p> : null}
              </Panel>
              <Panel title="Prestations" bodyClassName="p-0">
                <ul className="divide-y divide-line">
                  {items.map((item, i) => (
                    <li key={i} className="flex justify-between gap-4 px-5 py-3 text-sm">
                      <span>
                        {item.description} {item.quantity !== 1 ? <span className="text-muted">× {item.quantity}</span> : null}
                      </span>
                      <span className="font-semibold">{formatAmount(item.quantity * item.unit_price, doc.currency)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between border-t border-line px-5 py-4">
                  <span className="font-bold">Total{Number(doc.tax_rate) > 0 ? " TTC" : ""}</span>
                  <span className="font-display text-xl font-extrabold">{formatAmount(doc.total, doc.currency)}</span>
                </div>
              </Panel>
            </div>
          )}
        </div>
        {editable ? null : <aside className="lg:sticky lg:top-6 lg:self-start">{actions}</aside>}
      </PageBody>
    </>
  );
}
