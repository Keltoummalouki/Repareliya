import type { Metadata } from "next";
import { CatalogTabs } from "@/components/admin/catalog-tabs";
import { DeviceImporter } from "@/components/admin/device-importer";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Importer des appareils" };

export default async function ImportPage() {
  const { supabase } = await requireAdmin();
  const { data: brands } = await supabase.from("brands").select("id, name, slug").order("sort_order").order("name");
  return (
    <>
      <PageHeader
        title="Appareils & tarifs"
        description="Ajoutez en quelques clics tous les modèles d’une marque à partir de sources publiques et à jour."
      >
        <CatalogTabs active="importer" />
      </PageHeader>
      <PageBody>
        <DeviceImporter brands={brands ?? []} />
      </PageBody>
    </>
  );
}
