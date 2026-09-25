import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/server";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages = ["", "/tarifs", "/devis", "/accessoires", "/realisations", "/avis", "/contact"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));
  if (!isSupabaseConfigured()) return pages;

  const { data: models } = await createPublicClient()
    .from("device_models")
    .select("slug, brands!inner(slug, is_active)")
    .eq("is_active", true)
    .eq("brands.is_active", true)
    .limit(5000);
  const brands = new Set<string>();
  const modelPages = (models ?? []).map((m) => {
    brands.add(m.brands.slug);
    return { url: `${base}/reparation/${m.brands.slug}/${m.slug}`, changeFrequency: "monthly" as const, priority: 0.6 };
  });
  return [...pages, ...[...brands].map((slug) => ({ url: `${base}/reparation/${slug}`, changeFrequency: "weekly" as const, priority: 0.7 })), ...modelPages];
}
