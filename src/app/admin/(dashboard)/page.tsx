import { ArrowRight, FileText, Inbox, Receipt, Star, Wallet } from "lucide-react";
import Link from "next/link";
import { PageBody, PageHeader, Panel } from "@/components/admin/page-header";
import { RequestStatusBadge } from "@/components/admin/status";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { contactMethodLabel } from "@/lib/contact";
import { getSiteSettings } from "@/lib/data/public";
import { documentStatusLabel, DOCUMENT_STATUS, type DocumentStatus, type DocumentType } from "@/lib/documents";
import { formatAmount, formatRelative } from "@/lib/format";

export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const settings = await getSiteSettings();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [newRequests, pendingDevis, unpaid, paidMonth, pendingReviews, recentRequests, recentDocs] = await Promise.all([
    supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "nouveau"),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("type", "devis").eq("status", "envoye"),
    supabase.from("documents").select("total").eq("type", "facture").eq("status", "envoye"),
    supabase.from("documents").select("total").eq("type", "facture").eq("status", "paye").gte("paid_at", monthStart),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "en_attente"),
    supabase
      .from("requests")
      .select("id, number, customer_name, device_label, repair_labels, preferred_contact, status, is_read, created_at, kind")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("documents")
      .select("id, type, number, status, customer_name, total, currency, created_at")
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);

  const sum = (rows: { total: number | string }[] | null) => (rows ?? []).reduce((acc, r) => acc + Number(r.total), 0);

  const stats = [
    { label: "Nouvelles demandes", value: String(newRequests.count ?? 0), icon: Inbox, href: "/admin/inbox?statut=nouveau" },
    { label: "Devis en attente de réponse", value: String(pendingDevis.count ?? 0), icon: FileText, href: "/admin/documents?type=devis&statut=envoye" },
    { label: "Factures à encaisser", value: formatAmount(sum(unpaid.data), settings.currency), icon: Receipt, href: "/admin/documents?type=facture&statut=envoye" },
    { label: "Encaissé ce mois-ci", value: formatAmount(sum(paidMonth.data), settings.currency), icon: Wallet, href: "/admin/documents?type=facture&statut=paye" },
  ];

  return (
    <>
      <PageHeader
        title="Vue d’ensemble"
        description={new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
        actions={
          <>
            <ButtonLink href="/admin/documents/nouveau?type=devis" variant="outline" size="sm">
              Nouveau devis
            </ButtonLink>
            <ButtonLink href="/admin/documents/nouveau?type=facture" size="sm">
              Nouvelle facture
            </ButtonLink>
          </>
        }
      />
      <PageBody className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href} className="card group p-5 transition-colors hover:border-ink">
              <div className="flex items-center justify-between">
                <stat.icon className="size-5 text-brand-strong" aria-hidden />
                <ArrowRight className="size-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
              </div>
              <p className="mt-4 font-display text-2xl font-extrabold">{stat.value}</p>
              <p className="mt-0.5 text-sm text-muted">{stat.label}</p>
            </Link>
          ))}
        </div>

        {pendingReviews.count ? (
          <Link href="/admin/avis" className="card flex items-center gap-3 border-warning/30 bg-warning-soft/60 px-5 py-3.5 text-sm">
            <Star className="size-4.5 text-warning" aria-hidden />
            <span className="flex-1">
              <strong>{pendingReviews.count}</strong> avis en attente de validation
            </span>
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Panel
            title="Dernières demandes"
            bodyClassName="p-0"
            actions={
              <Link href="/admin/inbox" className="text-sm font-semibold text-brand-strong">
                Tout voir
              </Link>
            }
          >
            {recentRequests.data?.length ? (
              <ul className="divide-y divide-line">
                {recentRequests.data.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/inbox/${r.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-ink/[0.02]">
                      <span className={`size-2 shrink-0 rounded-full ${r.is_read ? "bg-transparent" : "bg-brand-strong"}`} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">
                          {r.customer_name} <span className="font-normal text-muted">#{r.number}</span>
                        </span>
                        <span className="block truncate text-sm text-muted">
                          {[r.device_label, r.repair_labels?.join(", ")].filter(Boolean).join(" · ") || (r.kind === "contact" ? "Message" : "—")}
                        </span>
                      </span>
                      <span className="hidden text-right sm:block">
                        <RequestStatusBadge status={r.status} />
                        <span className="mt-1 block text-xs text-muted">
                          {contactMethodLabel(r.preferred_contact)} · {formatRelative(r.created_at)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted">Aucune demande pour le moment. Elles arriveront ici dès qu’un client remplit le formulaire.</p>
            )}
          </Panel>

          <Panel
            title="Derniers documents"
            bodyClassName="p-0"
            actions={
              <Link href="/admin/documents" className="text-sm font-semibold text-brand-strong">
                Tout voir
              </Link>
            }
          >
            {recentDocs.data?.length ? (
              <ul className="divide-y divide-line">
                {recentDocs.data.map((d) => (
                  <li key={d.id}>
                    <Link href={`/admin/documents/${d.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-ink/[0.02]">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{d.customer_name}</span>
                        <span className="block text-xs text-muted">
                          {d.type === "devis" ? "Devis" : "Facture"} {d.number ?? "brouillon"}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block font-semibold">{formatAmount(d.total, d.currency)}</span>
                        <Badge tone={DOCUMENT_STATUS[d.status as DocumentStatus]?.tone}>
                          {documentStatusLabel(d.type as DocumentType, d.status as DocumentStatus)}
                        </Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted">Aucun devis ni facture.</p>
            )}
          </Panel>
        </div>
      </PageBody>
    </>
  );
}
