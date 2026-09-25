import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import { parseSiteSettings } from "@/lib/settings";

// Lectures publiques (clé publishable + RLS). Les pages publiques sont mises
// en cache puis revalidées à chaque modification depuis le tableau de bord.

export const getSiteSettings = cache(async () => {
  const { data } = await createPublicClient().from("site_settings").select("data").eq("id", 1).maybeSingle();
  return parseSiteSettings(data?.data);
});

export const getSocialLinks = cache(async () => {
  const { data } = await createPublicClient()
    .from("social_links")
    .select("id, platform, label, url, handle")
    .eq("is_visible", true)
    .order("sort_order")
    .order("created_at");
  return data ?? [];
});

export const getCategories = cache(async () => {
  const { data } = await createPublicClient()
    .from("device_categories")
    .select("id, slug, name, description, icon")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
});

export const getFeaturedBrands = cache(async () => {
  const { data } = await createPublicClient()
    .from("brands")
    .select("id, slug, name, logo_url")
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("sort_order")
    .limit(16);
  return data ?? [];
});

export const getAllBrandsWithModels = cache(async () => {
  const { data } = await createPublicClient()
    .from("category_brands")
    .select("brand_id, slug, name, logo_url, sort_order, model_count");
  const byBrand = new Map<string, { id: string; slug: string; name: string; logo_url: string | null; sort_order: number; count: number }>();
  for (const row of data ?? []) {
    if (!row.brand_id || !row.slug || !row.name) continue;
    const current = byBrand.get(row.brand_id);
    byBrand.set(row.brand_id, {
      id: row.brand_id,
      slug: row.slug,
      name: row.name,
      logo_url: row.logo_url,
      sort_order: row.sort_order ?? 100,
      count: (current?.count ?? 0) + (row.model_count ?? 0),
    });
  }
  return [...byBrand.values()].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
});

export const getRepairTypes = cache(async () => {
  const supabase = createPublicClient();
  const [{ data: types }, { data: links }] = await Promise.all([
    supabase.from("repair_types").select("id, slug, name, description, icon").eq("is_active", true).order("sort_order"),
    supabase.from("repair_type_categories").select("repair_type_id, category_id"),
  ]);
  return (types ?? []).map((type) => ({
    ...type,
    category_ids: (links ?? []).filter((l) => l.repair_type_id === type.id).map((l) => l.category_id),
  }));
});

export type PublicRepairType = Awaited<ReturnType<typeof getRepairTypes>>[number];

export const getFeaturedPrices = cache(async () => {
  const { data } = await createPublicClient()
    .from("repair_prices")
    .select(
      "id, price, price_is_from, quality, duration, repair_types!inner(name, slug), device_models!inner(name, slug, is_active, brands!inner(name, slug))",
    )
    .eq("is_featured", true)
    .eq("is_active", true)
    .eq("device_models.is_active", true)
    .order("sort_order")
    .limit(12);
  return data ?? [];
});

export const getBrandBySlug = cache(async (slug: string) => {
  const { data } = await createPublicClient()
    .from("brands")
    .select("id, slug, name, logo_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data;
});

export const getModelsForBrand = cache(async (brandId: string) => {
  const { data } = await createPublicClient()
    .from("device_models")
    .select("id, slug, name, image_url, release_year, is_popular, category_id, device_categories(name, slug)")
    .eq("brand_id", brandId)
    .eq("is_active", true)
    .order("sort_order")
    .order("release_year", { ascending: false, nullsFirst: false })
    .order("name");
  return data ?? [];
});

export const getModelPage = cache(async (brandSlug: string, modelSlug: string) => {
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) return null;
  const supabase = createPublicClient();
  const { data: model } = await supabase
    .from("device_models")
    .select("id, slug, name, image_url, release_year, category_id, device_categories(id, name, slug)")
    .eq("brand_id", brand.id)
    .eq("slug", modelSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (!model) return null;
  const { data: prices } = await supabase
    .from("repair_prices")
    .select("id, price, price_is_from, quality, duration, note, repair_type_id, sort_order")
    .eq("model_id", model.id)
    .eq("is_active", true)
    .order("sort_order");
  return { brand, model, prices: prices ?? [] };
});

export const getRealisations = cache(async (limit?: number) => {
  let query = createPublicClient()
    .from("realisations")
    .select("id, slug, title, description, device_label, repair_label, before_image_url, after_image_url, images, performed_on, is_featured, device_categories(name, slug)")
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("sort_order")
    .order("performed_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return data ?? [];
});

export const getAccessories = cache(async (options?: { featuredOnly?: boolean; limit?: number }) => {
  let query = createPublicClient()
    .from("accessories")
    .select("id, slug, name, category, description, price, compare_at_price, image_url, compatible_with, stock_status, is_featured")
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (options?.featuredOnly) query = query.eq("is_featured", true);
  if (options?.limit) query = query.limit(options.limit);
  const { data } = await query;
  return data ?? [];
});

export const getPublishedReviews = cache(async (limit = 60) => {
  const supabase = createPublicClient();
  const [{ data }, { data: all }] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, author_name, rating, comment, device_label, source, reply, is_featured, created_at, published_at")
      .eq("status", "publie")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("reviews").select("rating").eq("status", "publie"),
  ]);
  const ratings = (all ?? []).map((r) => r.rating);
  const average = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  return { reviews: data ?? [], count: ratings.length, average };
});

export type PublicReview = Awaited<ReturnType<typeof getPublishedReviews>>["reviews"][number];
