import type { Metadata } from "next";
import { BrandsManager } from "@/components/admin/catalog-managers";
import { CatalogTabs } from "@/components/admin/catalog-tabs";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Marques" };

export default async function BrandsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("brands").select("*, device_models(count)").order("sort_order").order("name");
  const brands = (data ?? []).map((b) => ({ ...b, models: b.device_models?.[0]?.count ?? 0 }));
  return (
    <>
      <PageHeader title="Appareils & tarifs" description="Marques affichées dans les sélecteurs et sur l’accueil.">
        <CatalogTabs active="marques" />
      </PageHeader>
      <PageBody>
        <BrandsManager brands={brands} />
      </PageBody>
    </>
  );
}
