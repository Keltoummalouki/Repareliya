"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, getAdmin, notAllowed, type ActionResult } from "@/lib/auth";
import { slugify } from "@/lib/catalog/normalize";
import { invoiceSettingsSchema, siteSettingsSchema } from "@/lib/settings";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));
const money = z.number().min(0).max(1_000_000).nullable();

function refresh() {
  revalidatePath("/", "layout");
}

const uniqueSlug = (name: string) => `${slugify(name).slice(0, 60)}-${randomBytes(2).toString("hex")}`;

// --------------------------------------------------------------- Accessoires
const accessorySchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(160),
  category: z.string().trim().min(1, "Catégorie requise").max(60),
  description: text(2000),
  price: money,
  compare_at_price: money,
  image_url: text(600),
  compatible_with: text(200),
  stock_status: z.enum(["en_stock", "sur_commande", "rupture"]),
  is_published: z.boolean(),
  is_featured: z.boolean(),
  sort_order: z.number().int().min(0).max(100000),
});

export async function saveAccessory(id: string | null, input: z.input<typeof accessorySchema>): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const parsed = accessorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const { error } = id
    ? await admin.supabase.from("accessories").update(parsed.data).eq("id", id)
    : await admin.supabase.from("accessories").insert({ ...parsed.data, slug: uniqueSlug(parsed.data.name) });
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function deleteAccessory(id: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const { error } = await admin.supabase.from("accessories").delete().eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// -------------------------------------------------------------- Réalisations
const realisationSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(160),
  description: text(3000),
  device_label: text(120),
  repair_label: text(120),
  category_id: z.string().uuid().nullish().transform((v) => v ?? null),
  before_image_url: text(600),
  after_image_url: text(600),
  images: z.array(z.string().url()).max(12),
  performed_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish()
    .or(z.literal("").transform(() => null))
    .transform((v) => v ?? null),
  is_published: z.boolean(),
  is_featured: z.boolean(),
  sort_order: z.number().int().min(0).max(100000),
});

export async function saveRealisation(id: string | null, input: z.input<typeof realisationSchema>): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const parsed = realisationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  if (!parsed.data.after_image_url && !parsed.data.before_image_url && !parsed.data.images.length) {
    return { ok: false, error: "Ajoutez au moins une photo." };
  }
  const { error } = id
    ? await admin.supabase.from("realisations").update(parsed.data).eq("id", id)
    : await admin.supabase.from("realisations").insert({ ...parsed.data, slug: uniqueSlug(parsed.data.title) });
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function deleteRealisation(id: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const { error } = await admin.supabase.from("realisations").delete().eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------- Avis
const reviewSchema = z.object({
  author_name: z.string().trim().min(2, "Nom requis").max(80),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(5, "Avis trop court").max(2000),
  device_label: text(100),
  source: z.enum(["site", "google", "facebook", "manuel"]),
  status: z.enum(["en_attente", "publie", "refuse"]),
  is_featured: z.boolean(),
  reply: text(1000),
  created_at: z.string().optional(),
});

export async function saveReview(id: string | null, input: z.input<typeof reviewSchema>): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const values = { ...parsed.data, published_at: parsed.data.status === "publie" ? new Date().toISOString() : null };
  if (!values.created_at) delete values.created_at;
  const { error } = id ? await admin.supabase.from("reviews").update(values).eq("id", id) : await admin.supabase.from("reviews").insert(values);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function setReviewStatus(id: string, status: "publie" | "refuse" | "en_attente"): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const { error } = await admin.supabase
    .from("reviews")
    .update({ status, published_at: status === "publie" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function deleteReview(id: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const { error } = await admin.supabase.from("reviews").delete().eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------- Réseaux sociaux
const socialSchema = z.object({
  platform: z.enum(["facebook", "instagram", "tiktok", "whatsapp", "snapchat", "youtube", "x", "linkedin", "google", "threads", "telegram", "autre"]),
  label: text(60),
  url: z
    .string()
    .trim()
    .max(600)
    .regex(/^(https?:\/\/|mailto:|tel:)/i, "Le lien doit commencer par https://"),
  handle: text(80),
  is_visible: z.boolean(),
  sort_order: z.number().int().min(0).max(1000),
});

export async function saveSocial(id: string | null, input: z.input<typeof socialSchema>): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const parsed = socialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const { error } = id ? await admin.supabase.from("social_links").update(parsed.data).eq("id", id) : await admin.supabase.from("social_links").insert(parsed.data);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function deleteSocial(id: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const { error } = await admin.supabase.from("social_links").delete().eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- Paramètres
export async function saveSiteSettings(input: unknown): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const parsed = siteSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  if (parsed.data.maps_embed_url && !/^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/i.test(parsed.data.maps_embed_url)) {
    return { ok: false, error: "Le lien de carte intégrée doit venir de Google Maps (Partager → Intégrer une carte)." };
  }
  const { error } = await admin.supabase.from("site_settings").update({ data: parsed.data }).eq("id", 1);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function saveInvoiceSettings(input: unknown): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const parsed = invoiceSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const { error } = await admin.supabase.from("invoice_settings").update({ data: parsed.data }).eq("id", 1);
  if (error) return fail(error);
  revalidatePath("/admin", "layout");
  return { ok: true };
}
