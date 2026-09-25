import type { Metadata } from "next";
import { CategoriesManager } from "@/components/admin/catalog-managers";
import { CatalogTabs } from "@/components/admin/catalog-tabs";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Catégories" };

export default async function CategoriesPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("device_categories").select("*, device_models(count)").order("sort_order");
  const categories = (data ?? []).map((c) => ({ ...c, models: c.device_models?.[0]?.count ?? 0 }));
  return (
    <>
      <PageHeader title="Appareils & tarifs" description="Types d’appareils proposés sur le site.">
        <CatalogTabs active="categories" />
      </PageHeader>
      <PageBody>
        <CategoriesManager categories={categories} />
      </PageBody>
    </>
  );
}
