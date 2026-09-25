"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, getAdmin, notAllowed, type ActionResult } from "@/lib/auth";
import { getAllSettings } from "@/lib/data/admin";
import { documentItemSchema } from "@/lib/documents";
import { emailLayout, escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { toE164 } from "@/lib/format";
import { pdfFileName, renderDocumentPdf } from "@/lib/pdf/document-pdf";

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");

const payloadSchema = z.object({
  type: z.enum(["devis", "facture"]),
  request_id: z.string().uuid().nullish(),
  source_document_id: z.string().uuid().nullish(),
  customer_name: z.string().trim().min(1, "Nom du client requis").max(160),
  customer_phone: nullableText(40),
  customer_whatsapp: nullableText(40),
  customer_email: nullableText(160),
  customer_address: nullableText(400),
  preferred_contact: z.enum(["telephone", "whatsapp", "email"]).nullish(),
  device_label: nullableText(160),
  items: z.array(documentItemSchema).min(1, "Ajoutez au moins une ligne."),
  prices_include_tax: z.boolean(),
  tax_rate: z.coerce.number().min(0).max(100),
  currency: z.string().length(3),
  notes: nullableText(2000),
  terms: nullableText(3000),
  issue_date: isoDate,
  valid_until: isoDate.nullish(),
  due_date: isoDate.nullish(),
});

export type DocumentPayload = z.infer<typeof payloadSchema>;

function revalidate() {
  revalidatePath("/admin", "layout");
}

export async function saveDocument(id: string | null, payload: DocumentPayload): Promise<ActionResult<{ id: string }>> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const input = parsed.data;
  const { site } = await getAllSettings(admin.supabase);

  if (input.customer_email && !z.string().email().safeParse(input.customer_email).success) {
    return { ok: false, error: "Adresse e-mail du client invalide." };
  }
  const values = {
    ...input,
    request_id: input.request_id ?? null,
    source_document_id: input.source_document_id ?? null,
    preferred_contact: input.preferred_contact ?? null,
    customer_phone: input.customer_phone ? (toE164(input.customer_phone, site.default_country) ?? input.customer_phone) : null,
    customer_whatsapp: input.customer_whatsapp ? (toE164(input.customer_whatsapp, site.default_country) ?? input.customer_whatsapp) : null,
    customer_email: input.customer_email?.toLowerCase() ?? null,
    valid_until: input.type === "devis" ? (input.valid_until ?? null) : null,
    due_date: input.type === "facture" ? (input.due_date ?? null) : null,
  };

  if (id) {
    const { type: _type, request_id: _r, source_document_id: _s, ...update } = values;
    const { error } = await admin.supabase.from("documents").update(update).eq("id", id);
    if (error) return fail(error);
    revalidate();
    return { ok: true, data: { id } };
  }

  const { data, error } = await admin.supabase.from("documents").insert({ ...values, status: "brouillon" }).select("id").single();
  if (error || !data) return fail(error);
  if (values.request_id) {
    await admin.supabase.from("requests").update({ status: "en_cours" }).eq("id", values.request_id).eq("status", "nouveau");
  }
  revalidate();
  return { ok: true, data: { id: data.id } };
}

/** Valide une facture : numéro définitif attribué, contenu verrouillé. */
export async function validateInvoice(id: string): Promise<ActionResult<{ number: string }>> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const { data, error } = await admin.supabase
    .from("documents")
    .update({ status: "envoye" })
    .eq("id", id)
    .eq("type", "facture")
    .eq("status", "brouillon")
    .select("number")
    .single();
  if (error || !data) return fail(error, "Impossible de valider cette facture.");
  revalidate();
  return { ok: true, data: { number: data.number! } };
}

export async function sendDocument(
  id: string,
  channel: "email" | "whatsapp" | "sms" | "telephone",
  options: { to?: string; message?: string; markOnly?: boolean } = {},
): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const { data: doc } = await admin.supabase.from("documents").select("*").eq("id", id).maybeSingle();
  if (!doc) return { ok: false, error: "Document introuvable." };
  if (doc.type === "facture" && doc.status === "brouillon") return { ok: false, error: "Validez d’abord la facture." };
  if (doc.status === "annule") return { ok: false, error: "Ce document est annulé." };

  if (channel === "email" && !options.markOnly) {
    const to = (options.to || doc.customer_email || "").trim();
    if (!z.string().email().safeParse(to).success) return { ok: false, error: "Adresse e-mail invalide." };
    if (!isEmailConfigured()) return { ok: false, error: "L’envoi d’e-mails n’est pas configuré (RESEND_API_KEY). Utilisez « Ouvrir ma messagerie »." };
    const { site, invoice } = await getAllSettings(admin.supabase);
    const pdf = await renderDocumentPdf(doc, site, invoice);
    const label = doc.type === "devis" ? "devis" : "facture";
    const link = `${siteUrl()}/d/${doc.public_token}`;
    const message = options.message?.trim() || "";
    const result = await sendEmail({
      to,
      subject: `Votre ${label} ${doc.number} — ${site.business_name}`,
      text: message,
      html: emailLayout({
        title: `Votre ${label} ${doc.number}`,
        body: escapeHtml(message).replace(/\n/g, "<br>"),
        cta: { label: doc.type === "devis" ? "Voir et accepter le devis" : "Voir la facture", url: link },
        footer: `${escapeHtml(site.business_name)}${site.phone ? ` · ${escapeHtml(site.phone)}` : ""}`,
      }),
      replyTo: site.email || undefined,
      attachments: [{ filename: pdfFileName(doc), content: Buffer.from(pdf) }],
    });
    if (!result.ok) return { ok: false, error: result.error };
    if (!doc.customer_email) await admin.supabase.from("documents").update({ customer_email: to.toLowerCase() }).eq("id", id);
  }

  const { error } = await admin.supabase
    .from("documents")
    .update({ sent_at: new Date().toISOString(), sent_via: channel, ...(doc.status === "brouillon" ? { status: "envoye" } : {}) })
    .eq("id", id);
  if (error) return fail(error);
  if (doc.request_id && doc.type === "devis") {
    await admin.supabase.from("requests").update({ status: "devis_envoye" }).eq("id", doc.request_id).in("status", ["nouveau", "en_cours"]);
  }
  revalidate();
  return {
    ok: true,
    message: channel === "email" && !options.markOnly ? "E-mail envoyé avec le PDF en pièce jointe." : "Document marqué comme envoyé.",
  };
}

export async function setDocumentStatus(id: string, status: "envoye" | "accepte" | "refuse" | "annule"): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const { data: doc } = await admin.supabase.from("documents").select("type, status, request_id").eq("id", id).maybeSingle();
  if (!doc) return { ok: false, error: "Document introuvable." };
  if (doc.type === "facture" && status !== "annule") return { ok: false, error: "Action non disponible pour une facture." };
  const { error } = await admin.supabase
    .from("documents")
    .update({ status, accepted_at: status === "accepte" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return fail(error);
  if (doc.request_id && status === "accepte") await admin.supabase.from("requests").update({ status: "accepte" }).eq("id", doc.request_id);
  revalidate();
  return { ok: true };
}

export async function markInvoicePaid(id: string, input: { paid_at: string; payment_method: string }): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const parsed = z.object({ paid_at: isoDate, payment_method: z.string().trim().min(1).max(60) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Indiquez la date et le moyen de paiement." };
  const { data, error } = await admin.supabase
    .from("documents")
    .update({ status: "paye", paid_at: `${parsed.data.paid_at}T12:00:00Z`, payment_method: parsed.data.payment_method })
    .eq("id", id)
    .eq("type", "facture")
    .eq("status", "envoye")
    .select("request_id")
    .single();
  if (error || !data) return fail(error, "La facture doit être émise pour être marquée payée.");
  if (data.request_id) await admin.supabase.from("requests").update({ status: "termine" }).eq("id", data.request_id);
  revalidate();
  return { ok: true };
}

export async function convertToInvoice(devisId: string): Promise<ActionResult<{ id: string }>> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const { data: devis } = await admin.supabase.from("documents").select("*").eq("id", devisId).eq("type", "devis").maybeSingle();
  if (!devis) return { ok: false, error: "Devis introuvable." };
  const { invoice } = await getAllSettings(admin.supabase);
  const today = new Date().toISOString().slice(0, 10);
  const due = invoice.invoice_due_days ? new Date(Date.now() + invoice.invoice_due_days * 86400000).toISOString().slice(0, 10) : null;
  const { data, error } = await admin.supabase
    .from("documents")
    .insert({
      type: "facture",
      status: "brouillon",
      request_id: devis.request_id,
      source_document_id: devis.id,
      customer_name: devis.customer_name,
      customer_phone: devis.customer_phone,
      customer_whatsapp: devis.customer_whatsapp,
      customer_email: devis.customer_email,
      customer_address: devis.customer_address,
      preferred_contact: devis.preferred_contact,
      device_label: devis.device_label,
      items: devis.items,
      prices_include_tax: devis.prices_include_tax,
      tax_rate: devis.tax_rate,
      currency: devis.currency,
      notes: devis.number ? `Selon devis ${devis.number}.` : null,
      terms: invoice.payment_terms || null,
      issue_date: today,
      due_date: due,
    })
    .select("id")
    .single();
  if (error || !data) return fail(error);
  if (devis.status === "envoye") await admin.supabase.from("documents").update({ status: "accepte", accepted_at: new Date().toISOString() }).eq("id", devis.id);
  revalidate();
  return { ok: true, data: { id: data.id } };
}

export async function duplicateDocument(id: string): Promise<ActionResult<{ id: string }>> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const { data: doc } = await admin.supabase.from("documents").select("*").eq("id", id).maybeSingle();
  if (!doc) return { ok: false, error: "Document introuvable." };
  const { invoice } = await getAllSettings(admin.supabase);
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await admin.supabase
    .from("documents")
    .insert({
      type: doc.type,
      status: "brouillon",
      request_id: doc.request_id,
      customer_name: doc.customer_name,
      customer_phone: doc.customer_phone,
      customer_whatsapp: doc.customer_whatsapp,
      customer_email: doc.customer_email,
      customer_address: doc.customer_address,
      preferred_contact: doc.preferred_contact,
      device_label: doc.device_label,
      items: doc.items,
      prices_include_tax: doc.prices_include_tax,
      tax_rate: doc.tax_rate,
      currency: doc.currency,
      notes: doc.notes,
      terms: doc.terms,
      issue_date: today,
      valid_until: doc.type === "devis" ? new Date(Date.now() + invoice.devis_validity_days * 86400000).toISOString().slice(0, 10) : null,
    })
    .select("id")
    .single();
  if (error || !data) return fail(error);
  revalidate();
  return { ok: true, data: { id: data.id } };
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const { error } = await admin.supabase.from("documents").delete().eq("id", id);
  if (error) return fail(error);
  revalidate();
  return { ok: true };
}
