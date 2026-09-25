"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { getSiteSettings } from "@/lib/data/public";
import { emailLayout, escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email";
import { formatMoney, toE164 } from "@/lib/format";
import { contactMethodLabel } from "@/lib/contact";
import { ipHash, submittedTooFast } from "@/lib/request-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";

export type SubmitRequestState =
  | { status: "idle" }
  | { status: "success"; number: number; method: string; contactValue: string }
  | { status: "error"; error: string; fieldErrors?: Record<string, string> };

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const uuid = z
  .string()
  .uuid()
  .optional()
  .or(z.literal("").transform(() => undefined));

const schema = z.object({
  kind: z.enum(["devis", "contact", "accessoire"]).default("devis"),
  customer_name: z.string().trim().min(2, "Indiquez votre nom.").max(100, "Nom trop long."),
  preferred_contact: z.enum(["telephone", "whatsapp", "email"], { message: "Choisissez comment vous préférez être contacté." }),
  phone: optionalText(40),
  whatsapp: optionalText(40),
  email: optionalText(160),
  category_id: uuid,
  model_id: uuid,
  brand_id: uuid,
  accessory_id: uuid,
  device_other: optionalText(160),
  repair_type_ids: z.array(z.string().uuid()).max(20).default([]),
  message: optionalText(3000),
  source_page: optionalText(200),
});

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function submitRequest(_prev: SubmitRequestState, formData: FormData): Promise<SubmitRequestState> {
  // Pièges à robots : champ caché rempli ou envoi instantané
  if (formData.get("website") || submittedTooFast(formData.get("started_at"))) {
    return { status: "error", error: "Votre demande n’a pas pu être envoyée. Réessayez dans un instant." };
  }
  if (formData.get("consent") !== "on") {
    return { status: "error", error: "Merci d’accepter l’utilisation de vos coordonnées.", fieldErrors: { consent: "Obligatoire" } };
  }

  const parsed = schema.safeParse({
    kind: formData.get("kind") ?? undefined,
    customer_name: formData.get("customer_name"),
    preferred_contact: formData.get("preferred_contact") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    whatsapp: formData.get("whatsapp") ?? undefined,
    email: formData.get("email") ?? undefined,
    category_id: formData.get("category_id") ?? undefined,
    model_id: formData.get("model_id") ?? undefined,
    brand_id: formData.get("brand_id") ?? undefined,
    accessory_id: formData.get("accessory_id") ?? undefined,
    device_other: formData.get("device_other") ?? undefined,
    repair_type_ids: formData.getAll("repair_type_ids").map(String),
    message: formData.get("message") ?? undefined,
    source_page: formData.get("source_page") ?? undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "error", error: "Vérifiez les champs indiqués.", fieldErrors };
  }

  const input = parsed.data;
  const settings = await getSiteSettings();
  const country = settings.default_country;
  const fieldErrors: Record<string, string> = {};

  // Coordonnées : le moyen de contact préféré est obligatoire, les autres facultatifs
  const phone = input.phone ? toE164(input.phone, country) : null;
  const whatsapp = input.whatsapp ? toE164(input.whatsapp, country) : null;
  const email = input.email?.toLowerCase() ?? null;
  if (input.phone && !phone) fieldErrors.phone = "Numéro de téléphone invalide.";
  if (input.whatsapp && !whatsapp) fieldErrors.whatsapp = "Numéro WhatsApp invalide.";
  if (email && !z.string().email().safeParse(email).success) fieldErrors.email = "Adresse e-mail invalide.";
  if (input.preferred_contact === "telephone" && !input.phone) fieldErrors.phone = "Indiquez votre numéro de téléphone.";
  if (input.preferred_contact === "whatsapp" && !input.whatsapp) fieldErrors.whatsapp = "Indiquez votre numéro WhatsApp.";
  if (input.preferred_contact === "email" && !input.email) fieldErrors.email = "Indiquez votre adresse e-mail.";

  if (input.kind === "devis") {
    if (!input.model_id && !input.device_other) fieldErrors.device = "Choisissez votre modèle ou décrivez votre appareil.";
    if (!input.message || input.message.length < 5) fieldErrors.message = "Décrivez la panne en quelques mots.";
  }
  if (input.kind === "contact" && (!input.message || input.message.length < 5)) fieldErrors.message = "Écrivez votre message.";

  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length > MAX_PHOTOS) fieldErrors.photos = `${MAX_PHOTOS} photos maximum.`;
  for (const photo of photos) {
    if (!PHOTO_TYPES.has(photo.type)) fieldErrors.photos = "Formats acceptés : JPG, PNG, WebP, HEIC.";
    else if (photo.size > MAX_PHOTO_BYTES) fieldErrors.photos = "Chaque photo doit faire moins de 6 Mo.";
  }

  if (Object.keys(fieldErrors).length) return { status: "error", error: "Vérifiez les champs indiqués.", fieldErrors };

  const supabase = createServiceClient();
  const hash = await ipHash();

  // Limite : 6 demandes par heure et par connexion
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", hash)
    .gte("created_at", since);
  if ((count ?? 0) >= 6) {
    return { status: "error", error: "Vous avez déjà envoyé plusieurs demandes. Contactez-nous directement ou réessayez plus tard." };
  }

  // Instantané de l'appareil et des réparations choisies
  let deviceLabel = input.device_other;
  let brandId = input.brand_id ?? null;
  let categoryId = input.category_id ?? null;
  let estimatedPrice: number | null = null;
  if (input.model_id) {
    const { data: model } = await supabase
      .from("device_models")
      .select("id, name, brand_id, category_id, brands(name)")
      .eq("id", input.model_id)
      .maybeSingle();
    if (model) {
      deviceLabel = `${model.brands?.name ?? ""} ${model.name}`.trim() + (input.device_other ? ` — ${input.device_other}` : "");
      brandId = model.brand_id;
      categoryId = model.category_id;
    }
  }

  let repairLabels: string[] = [];
  if (input.repair_type_ids.length) {
    const { data: types } = await supabase.from("repair_types").select("id, name").in("id", input.repair_type_ids);
    repairLabels = input.repair_type_ids.map((id) => types?.find((t) => t.id === id)?.name).filter((v): v is string => Boolean(v));
    if (input.model_id) {
      const { data: prices } = await supabase
        .from("repair_prices")
        .select("repair_type_id, price")
        .eq("model_id", input.model_id)
        .eq("is_active", true)
        .in("repair_type_id", input.repair_type_ids);
      const best = input.repair_type_ids.map((id) => {
        const values = (prices ?? []).filter((p) => p.repair_type_id === id && p.price !== null).map((p) => Number(p.price));
        return values.length ? Math.min(...values) : null;
      });
      if (best.every((v) => v !== null)) estimatedPrice = best.reduce<number>((sum, v) => sum + (v ?? 0), 0);
    }
  }

  if (input.accessory_id && input.kind === "accessoire") {
    const { data: accessory } = await supabase.from("accessories").select("name, price").eq("id", input.accessory_id).maybeSingle();
    if (accessory) {
      deviceLabel = deviceLabel ?? null;
      repairLabels = [`Accessoire : ${accessory.name}`];
      estimatedPrice = accessory.price === null ? null : Number(accessory.price);
    }
  }

  // Photos → stockage privé
  const photoPaths: string[] = [];
  const month = new Date().toISOString().slice(0, 7);
  for (const photo of photos) {
    const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : photo.type.startsWith("image/hei") ? "heic" : "jpg";
    const path = `${month}/${randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("request-photos")
      .upload(path, Buffer.from(await photo.arrayBuffer()), { contentType: photo.type, upsert: false });
    if (!error) photoPaths.push(path);
  }

  const { data: inserted, error } = await supabase
    .from("requests")
    .insert({
      kind: input.kind,
      customer_name: input.customer_name,
      preferred_contact: input.preferred_contact,
      phone,
      whatsapp,
      email,
      category_id: categoryId,
      brand_id: brandId,
      model_id: input.model_id ?? null,
      device_label: deviceLabel,
      repair_type_ids: input.repair_type_ids,
      repair_labels: repairLabels,
      accessory_id: input.accessory_id ?? null,
      message: input.message,
      photos: photoPaths,
      estimated_price: estimatedPrice,
      source_page: input.source_page,
      ip_hash: hash,
    })
    .select("id, number")
    .single();

  if (error || !inserted) {
    console.error("submitRequest", error);
    return { status: "error", error: "Le service est momentanément indisponible. Réessayez ou contactez-nous directement." };
  }

  // Notification à l'atelier, sans ralentir la réponse
  const notifyTo = process.env.ADMIN_NOTIFICATION_EMAIL || settings.email;
  if (notifyTo && isEmailConfigured()) {
    after(async () => {
      const lines = [
        `<strong>${escapeHtml(input.customer_name)}</strong> — préfère ${escapeHtml(contactMethodLabel(input.preferred_contact))}`,
        phone ? `Téléphone : ${escapeHtml(phone)}` : "",
        whatsapp ? `WhatsApp : ${escapeHtml(whatsapp)}` : "",
        email ? `E-mail : ${escapeHtml(email)}` : "",
        deviceLabel ? `Appareil : ${escapeHtml(deviceLabel)}` : "",
        repairLabels.length ? `Demande : ${escapeHtml(repairLabels.join(", "))}` : "",
        estimatedPrice !== null ? `Estimation catalogue : ${escapeHtml(formatMoney(estimatedPrice, settings.currency))}` : "",
        input.message ? `<br>${escapeHtml(input.message).replace(/\n/g, "<br>")}` : "",
      ].filter(Boolean);
      await sendEmail({
        to: notifyTo,
        subject: `Nouvelle demande #${inserted.number} — ${input.customer_name}`,
        html: emailLayout({
          title: `Nouvelle demande #${inserted.number}`,
          body: lines.join("<br>"),
          cta: { label: "Ouvrir dans le tableau de bord", url: `${siteUrl()}/admin/inbox/${inserted.id}` },
        }),
        text: lines.join("\n").replace(/<[^>]+>/g, ""),
      }).catch((e) => console.error("notification", e));
    });
  }

  const contactValue =
    input.preferred_contact === "email" ? email! : input.preferred_contact === "whatsapp" ? whatsapp! : phone!;
  return { status: "success", number: Number(inserted.number), method: input.preferred_contact, contactValue };
}
