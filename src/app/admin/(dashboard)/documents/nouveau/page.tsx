import type { Metadata } from "next";
import { DocumentEditor } from "@/components/admin/document-editor";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth";
import { getAllSettings } from "@/lib/data/admin";
import type { DocumentItem } from "@/lib/documents";
import type { DocumentPayload } from "../actions";

export const metadata: Metadata = { title: "Nouveau document" };

const addDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

export default async function NewDocumentPage({ searchParams }: PageProps<"/admin/documents/nouveau">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const type = params.type === "facture" ? "facture" : "devis";
  const requestId = typeof params.demande === "string" ? params.demande : null;
  const { site, invoice } = await getAllSettings(supabase);

  const initial: DocumentPayload = {
    type,
    request_id: null,
    customer_name: "",
    customer_phone: null,
    customer_whatsapp: null,
    customer_email: null,
    customer_address: null,
    preferred_contact: null,
    device_label: null,
    items: [],
    prices_include_tax: invoice.prices_include_tax,
    tax_rate: invoice.tax_rate,
    currency: site.currency,
    notes: null,
    terms: type === "devis" ? invoice.devis_terms || null : invoice.payment_terms || null,
    issue_date: new Date().toISOString().slice(0, 10),
    valid_until: type === "devis" ? addDays(invoice.devis_validity_days) : null,
    due_date: type === "facture" && invoice.invoice_due_days ? addDays(invoice.invoice_due_days) : null,
  };

  if (requestId) {
    const { data: request } = await supabase.from("requests").select("*, accessories(name, price)").eq("id", requestId).maybeSingle();
    if (request) {
      const items: DocumentItem[] = [];
      if (request.model_id && request.repair_type_ids.length) {
        const [{ data: prices }, { data: types }] = await Promise.all([
          supabase.from("repair_prices").select("repair_type_id, price, quality").eq("model_id", request.model_id).in("repair_type_id", request.repair_type_ids),
          supabase.from("repair_types").select("id, name").in("id", request.repair_type_ids),
        ]);
        for (const typeId of request.repair_type_ids) {
          const typeName = types?.find((t) => t.id === typeId)?.name ?? "Réparation";
          const candidates = (prices ?? []).filter((p) => p.repair_type_id === typeId && p.price !== null);
          const best = candidates.sort((a, b) => Number(a.price) - Number(b.price))[0];
          items.push({
            description: `${typeName}${request.device_label ? ` — ${request.device_label}` : ""}${best?.quality ? ` (${best.quality})` : ""}`,
            quantity: 1,
            unit_price: best ? Number(best.price) : 0,
          });
        }
      } else if (request.repair_labels.length) {
        for (const label of request.repair_labels) {
          items.push({ description: `${label}${request.device_label ? ` — ${request.device_label}` : ""}`, quantity: 1, unit_price: 0 });
        }
      }
      if (request.kind === "accessoire" && request.accessories && !items.length) {
        items.push({ description: request.accessories.name, quantity: 1, unit_price: Number(request.accessories.price ?? 0) });
      }
      Object.assign(initial, {
        request_id: request.id,
        customer_name: request.customer_name,
        customer_phone: request.phone,
        customer_whatsapp: request.whatsapp,
        customer_email: request.email,
        preferred_contact: request.preferred_contact,
        device_label: request.device_label,
        items,
      });
    }
  }

  return (
    <>
      <PageHeader
        back={requestId ? { href: `/admin/inbox/${requestId}`, label: "Retour à la demande" } : { href: "/admin/documents", label: "Devis & factures" }}
        title={type === "devis" ? "Nouveau devis" : "Nouvelle facture"}
        description={
          type === "devis"
            ? "Le numéro est attribué à l’enregistrement."
            : "La facture reste un brouillon modifiable jusqu’à sa validation, qui lui attribue son numéro définitif."
        }
      />
      <PageBody>
        <DocumentEditor id={null} initial={initial} />
      </PageBody>
    </>
  );
}
