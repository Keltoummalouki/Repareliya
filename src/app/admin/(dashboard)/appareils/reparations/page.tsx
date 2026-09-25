import type { Metadata } from "next";
import { RepairTypesManager } from "@/components/admin/catalog-managers";
import { CatalogTabs } from "@/components/admin/catalog-tabs";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Types de réparation" };

export default async function RepairTypesPage() {
  const { supabase } = await requireAdmin();
  const [{ data: types }, { data: links }, { data: categories }] = await Promise.all([
    supabase.from("repair_types").select("*").order("sort_order"),
    supabase.from("repair_type_categories").select("repair_type_id, category_id"),
    supabase.from("device_categories").select("id, name").order("sort_order"),
  ]);
  const rows = (types ?? []).map((t) => ({
    ...t,
    category_ids: (links ?? []).filter((l) => l.repair_type_id === t.id).map((l) => l.category_id),
  }));
  return (
    <>
      <PageHeader title="Appareils & tarifs" description="Les réparations proposées : elles servent de lignes de tarifs pour chaque modèle.">
        <CatalogTabs active="reparations" />
      </PageHeader>
      <PageBody>
        <RepairTypesManager types={rows} categories={categories ?? []} />
      </PageBody>
    </>
  );
}
