"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, getAdmin, notAllowed, type ActionResult } from "@/lib/auth";
import { slugify, type CatalogCandidate, type CategorySlug } from "@/lib/catalog/normalize";
import { getAndroidBrands, getAndroidCandidates, getAppleCandidates } from "@/lib/catalog/sources";

const uuid = z.string().uuid();
const optionalUrl = z
  .string()
  .trim()
  .max(600)
  .nullish()
  .transform((v) => (v ? v : null));

function refresh() {
  revalidatePath("/", "layout");
}

// ------------------------------------------------------------------ Modèles
const modelSchema = z.object({
  brand_id: uuid,
  category_id: uuid,
  name: z.string().trim().min(1, "Nom requis").max(120),
  release_year: z.number().int().min(1990).max(2100).nullish(),
  image_url: optionalUrl,
  is_active: z.boolean().default(true),
  is_popular: z.boolean().default(false),
  sort_order: z.number().int().min(-10000).max(100000).default(0),
});

export async function saveModel(id: string | null, input: z.input<typeof modelSchema>): Promise<ActionResult<{ id: string }>> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const parsed = modelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const values = { ...parsed.data, release_year: parsed.data.release_year ?? null, slug: slugify(parsed.data.name) };
  if (!values.slug) return { ok: false, error: "Nom invalide." };
  const query = id
    ? admin.supabase.from("device_models").update(values).eq("id", id).select("id").single()
    : admin.supabase.from("device_models").insert({ ...values, source: "manuel" }).select("id").single();
  const { data, error } = await query;
  if (error || !data) return fail(error);
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function updateModelFlags(id: string, flags: { is_active?: boolean; is_popular?: boolean }): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const { error } = await admin.supabase.from("device_models").update(flags).eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function deleteModels(ids: string[]): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  if (!z.array(uuid).min(1).max(2000).safeParse(ids).success) return { ok: false, error: "Sélection invalide." };
  const { error } = await admin.supabase.from("device_models").delete().in("id", ids);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------- Tarifs
const priceSchema = z.object({
  id: uuid.optional(),
  repair_type_id: uuid,
  quality: z.string().trim().max(60).default(""),
  price: z.number().min(0).max(1_000_000).nullable(),
  price_is_from: z.boolean().default(false),
  duration: z
    .string()
    .trim()
    .max(40)
    .nullish()
    .transform((v) => (v ? v : null)),
  note: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => (v ? v : null)),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
});

export type PriceInput = z.input<typeof priceSchema>;

export async function savePrices(modelId: string, rows: PriceInput[]): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const parsed = z.array(priceSchema).max(300).safeParse(rows);
  if (!parsed.success || !uuid.safeParse(modelId).success) return { ok: false, error: parsed.error?.issues[0]?.message ?? "Données invalides." };

  const keep = parsed.data.filter((r) => r.price !== null || r.note || r.duration);
  const seen = new Set<string>();
  for (const row of keep) {
    const key = `${row.repair_type_id}|${row.quality.toLowerCase()}`;
    if (seen.has(key)) return { ok: false, error: "Deux lignes ont la même réparation et la même qualité." };
    seen.add(key);
  }

  const { data: existing } = await admin.supabase.from("repair_prices").select("id").eq("model_id", modelId);
  const keptIds = new Set(keep.map((r) => r.id).filter(Boolean));
  const toDelete = (existing ?? []).map((r) => r.id).filter((id) => !keptIds.has(id));
  if (toDelete.length) {
    const { error } = await admin.supabase.from("repair_prices").delete().in("id", toDelete);
    if (error) return fail(error);
  }
  const ordered = keep.map((row, index) => ({ ...row, model_id: modelId, sort_order: index }));
  const updates = ordered.filter((row): row is typeof row & { id: string } => Boolean(row.id));
  const inserts = ordered.filter((row) => !row.id).map(({ id: _id, ...row }) => row);
  if (updates.length) {
    const { error } = await admin.supabase.from("repair_prices").upsert(updates, { onConflict: "id" });
    if (error) return fail(error);
  }
  if (inserts.length) {
    const { error } = await admin.supabase.from("repair_prices").insert(inserts);
    if (error) return fail(error);
  }
  refresh();
  return { ok: true };
}

export async function copyPrices(fromModelId: string, toModelId: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const { data: source } = await admin.supabase.from("repair_prices").select("*").eq("model_id", fromModelId);
  if (!source?.length) return { ok: false, error: "Ce modèle n’a aucun tarif à copier." };
  const { error } = await admin.supabase.from("repair_prices").upsert(
    source.map(({ id: _id, updated_at: _u, model_id: _m, ...row }) => ({ ...row, model_id: toModelId })),
    { onConflict: "model_id,repair_type_id,quality" },
  );
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------- Marques
const brandSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(60),
  logo_url: optionalUrl,
  sort_order: z.number().int().min(0).max(10000).default(100),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export async function saveBrand(id: string | null, input: z.input<typeof brandSchema>): Promise<ActionResult<{ id: string }>> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const values = { ...parsed.data, slug: slugify(parsed.data.name) };
  const query = id
    ? admin.supabase.from("brands").update(values).eq("id", id).select("id").single()
    : admin.supabase.from("brands").insert(values).select("id").single();
  const { data, error } = await query;
  if (error || !data) return fail(error);
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function deleteBrand(id: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const { error } = await admin.supabase.from("brands").delete().eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- Catégories
const categorySchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(60),
  description: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => (v ? v : null)),
  icon: z.string().max(30),
  sort_order: z.number().int().min(0).max(1000).default(0),
  is_active: z.boolean().default(true),
});

export async function saveCategory(id: string | null, input: z.input<typeof categorySchema>): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const { error } = id
    ? await admin.supabase.from("device_categories").update(parsed.data).eq("id", id)
    : await admin.supabase.from("device_categories").insert({ ...parsed.data, slug: slugify(parsed.data.name) });
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const { count } = await admin.supabase.from("device_models").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (count) return { ok: false, error: `Impossible : ${count} modèle(s) utilisent cette catégorie.` };
  const { error } = await admin.supabase.from("device_categories").delete().eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// --------------------------------------------------------- Types de réparation
const repairTypeSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(80),
  description: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((v) => (v ? v : null)),
  icon: z.string().max(30),
  sort_order: z.number().int().min(0).max(1000).default(0),
  is_active: z.boolean().default(true),
  category_ids: z.array(uuid).max(50).default([]),
});

export async function saveRepairType(id: string | null, input: z.input<typeof repairTypeSchema>): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const parsed = repairTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const { category_ids, ...values } = parsed.data;
  let typeId = id;
  if (id) {
    const { error } = await admin.supabase.from("repair_types").update(values).eq("id", id);
    if (error) return fail(error);
  } else {
    const { data, error } = await admin.supabase.from("repair_types").insert({ ...values, slug: slugify(values.name) }).select("id").single();
    if (error || !data) return fail(error);
    typeId = data.id;
  }
  await admin.supabase.from("repair_type_categories").delete().eq("repair_type_id", typeId!);
  if (category_ids.length) {
    const { error } = await admin.supabase
      .from("repair_type_categories")
      .insert(category_ids.map((category_id) => ({ repair_type_id: typeId!, category_id })));
    if (error) return fail(error);
  }
  refresh();
  return { ok: true };
}

export async function deleteRepairType(id: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const { error } = await admin.supabase.from("repair_types").delete().eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------- Import
export type ImportCandidate = CatalogCandidate & { exists: boolean };

export async function loadAndroidBrands(): Promise<ActionResult<{ key: string; label: string; count: number }[]>> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  try {
    return { ok: true, data: await getAndroidBrands() };
  } catch (error) {
    return fail(error, "La liste Google Play est momentanément indisponible.");
  }
}

export async function loadCandidates(
  source: "apple" | "android",
  targetBrandId: string | null,
  androidBrandKey?: string,
): Promise<ActionResult<ImportCandidate[]>> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  try {
    const candidates = source === "apple" ? await getAppleCandidates() : await getAndroidCandidates(androidBrandKey ?? "");
    let existing = new Set<string>();
    if (targetBrandId) {
      const { data } = await admin.supabase.from("device_models").select("slug").eq("brand_id", targetBrandId).limit(5000);
      existing = new Set((data ?? []).map((m) => m.slug));
    }
    return { ok: true, data: candidates.map((c) => ({ ...c, exists: existing.has(c.slug) })) };
  } catch (error) {
    return fail(error, "Source indisponible, réessayez plus tard.");
  }
}

const importSchema = z.object({
  brand: z.union([z.object({ id: uuid }), z.object({ name: z.string().trim().min(1).max(60) })]),
  source: z.enum(["appledb", "google_play"]),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        category: z.enum(["smartphones", "tablettes", "ordinateurs", "consoles", "montres"]),
        releaseYear: z.number().int().min(1990).max(2100).nullable(),
      }),
    )
    .min(1, "Sélectionnez au moins un modèle.")
    .max(2000),
});

export async function importModels(input: z.input<typeof importSchema>): Promise<ActionResult<{ imported: number; brandId: string }>> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const { brand, items, source } = parsed.data;

  let brandId: string;
  if ("id" in brand) brandId = brand.id;
  else {
    const slug = slugify(brand.name);
    const { data: found } = await admin.supabase.from("brands").select("id").eq("slug", slug).maybeSingle();
    if (found) brandId = found.id;
    else {
      const { data: created, error } = await admin.supabase.from("brands").insert({ name: brand.name, slug }).select("id").single();
      if (error || !created) return fail(error);
      brandId = created.id;
    }
  }

  const { data: categories } = await admin.supabase.from("device_categories").select("id, slug");
  const categoryId = (slug: CategorySlug) => categories?.find((c) => c.slug === slug)?.id;
  const rows = items
    .map((item) => ({
      brand_id: brandId,
      category_id: categoryId(item.category),
      name: item.name,
      slug: slugify(item.name),
      release_year: item.releaseYear,
      sort_order: 1000,
      source,
    }))
    .filter((row): row is typeof row & { category_id: string } => Boolean(row.category_id && row.slug));

  let imported = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const { data, error } = await admin.supabase
      .from("device_models")
      .upsert(rows.slice(i, i + 500), { onConflict: "brand_id,slug", ignoreDuplicates: true })
      .select("id");
    if (error) return fail(error);
    imported += data?.length ?? 0;
  }
  refresh();
  return { ok: true, data: { imported, brandId } };
}
