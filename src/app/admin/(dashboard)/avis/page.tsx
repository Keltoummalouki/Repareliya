import type { Metadata } from "next";
import { PageBody, PageHeader, TabLinks } from "@/components/admin/page-header";
import { ReviewsManager } from "@/components/admin/reviews-manager";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Avis" };

const STATUSES = ["en_attente", "publie", "refuse"] as const;

export default async function ReviewsAdminPage({ searchParams }: PageProps<"/admin/avis">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const status = STATUSES.find((s) => s === params.statut) ?? "en_attente";
  const [{ data }, ...counts] = await Promise.all([
    supabase.from("reviews").select("id, author_name, rating, comment, device_label, source, status, is_featured, reply, created_at").eq("status", status).order("created_at", { ascending: false }).limit(200),
    ...STATUSES.map((s) => supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", s)),
  ]);
  const reviews = (data ?? []).map((r) => ({
    ...r,
    source: r.source as "site" | "google" | "facebook" | "manuel",
    status: r.status as "en_attente" | "publie" | "refuse",
  }));
  return (
    <>
      <PageHeader title="Avis clients" description="Validez les avis déposés sur le site, répondez-y ou ajoutez ceux reçus ailleurs.">
        <TabLinks
          active={status}
          tabs={[
            { key: "en_attente", label: "En attente", href: "/admin/avis", count: counts[0].count ?? 0 },
            { key: "publie", label: "Publiés", href: "/admin/avis?statut=publie", count: counts[1].count ?? 0 },
            { key: "refuse", label: "Refusés", href: "/admin/avis?statut=refuse", count: counts[2].count ?? 0 },
          ]}
        />
      </PageHeader>
      <PageBody>
        <ReviewsManager reviews={reviews} />
      </PageBody>
    </>
  );
}
