import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { SocialsManager } from "@/components/admin/socials-manager";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Réseaux sociaux" };

export default async function SocialsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("social_links").select("*").order("sort_order").order("created_at");
  const links = (data ?? []).map((l) => ({ ...l, platform: l.platform as Parameters<typeof SocialsManager>[0]["links"][number]["platform"] }));
  return (
    <>
      <PageHeader title="Réseaux sociaux" description="Liens affichés dans le pied de page et la page Contact." />
      <PageBody>
        <SocialsManager links={links} />
      </PageBody>
    </>
  );
}
