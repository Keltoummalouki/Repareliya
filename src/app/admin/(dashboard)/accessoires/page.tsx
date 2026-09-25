import type { Metadata } from "next";
import { AccessoriesManager } from "@/components/admin/accessories-manager";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth";
import { getAllSettings } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Accessoires" };

export default async function AccessoriesPage() {
  const { supabase } = await requireAdmin();
  const [{ data }, { site }] = await Promise.all([
    supabase.from("accessories").select("*").order("sort_order").order("created_at", { ascending: false }),
    getAllSettings(supabase),
  ]);
  const items = (data ?? []).map((a) => ({
    ...a,
    price: a.price === null ? null : Number(a.price),
    compare_at_price: a.compare_at_price === null ? null : Number(a.compare_at_price),
    stock_status: a.stock_status as "en_stock" | "sur_commande" | "rupture",
  }));
  return (
    <>
      <PageHeader title="Accessoires" description="La boutique du site : les clients peuvent réserver un article, la demande arrive dans la boîte de réception." />
      <PageBody>
        <AccessoriesManager items={items} currency={site.currency} />
      </PageBody>
    </>
  );
}
