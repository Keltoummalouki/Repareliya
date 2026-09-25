import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { RealisationsManager } from "@/components/admin/realisations-manager";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Réalisations" };

export default async function RealisationsAdminPage() {
  const { supabase } = await requireAdmin();
  const [{ data }, { data: categories }] = await Promise.all([
    supabase.from("realisations").select("*").order("sort_order").order("performed_on", { ascending: false, nullsFirst: false }),
    supabase.from("device_categories").select("id, name").order("sort_order"),
  ]);
  return (
    <>
      <PageHeader title="Réalisations" description="Vos réparations en photos (avant / après), affichées sur l’accueil et la page Réalisations." />
      <PageBody>
        <RealisationsManager items={data ?? []} categories={categories ?? []} />
      </PageBody>
    </>
  );
}
