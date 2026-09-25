import type { Metadata } from "next";
import { Camera, Inbox, Mail, Phone, Search } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageBody, PageHeader, TabLinks } from "@/components/admin/page-header";
import { RealtimeRefresh } from "@/components/admin/realtime-refresh";
import { REQUEST_KINDS, REQUEST_STATUSES, RequestStatusBadge } from "@/components/admin/status";
import { WhatsappIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/lib/data/public";
import { formatMoney, formatPhone, formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Boîte de réception" };

const PAGE_SIZE = 50;

export default async function InboxPage({ searchParams }: PageProps<"/admin/inbox">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const status = typeof params.statut === "string" ? params.statut : "actives";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const page = Math.max(1, Number(params.page) || 1);
  const settings = await getSiteSettings();

  let query = supabase
    .from("requests")
    .select("id, number, kind, status, is_read, customer_name, preferred_contact, phone, whatsapp, email, device_label, repair_labels, message, photos, estimated_price, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status === "actives") query = query.not("status", "in", "(archive,termine)");
  else if (status !== "toutes") query = query.eq("status", status);
  if (q) {
    const safe = q.replace(/[,()*%\\]/g, " ").trim();
    const digits = safe.replace(/\D/g, "");
    const filters = [
      `customer_name.ilike.%${safe}%`,
      `email.ilike.%${safe}%`,
      `device_label.ilike.%${safe}%`,
      `message.ilike.%${safe}%`,
    ];
    if (digits.length >= 3) filters.push(`phone.ilike.%${digits.slice(-8)}%`, `whatsapp.ilike.%${digits.slice(-8)}%`);
    if (/^#?\d{1,9}$/.test(safe)) filters.push(`number.eq.${safe.replace("#", "")}`);
    query = query.or(filters.join(","));
  }

  const [{ data: requests, count }, ...statusCounts] = await Promise.all([
    query,
    ...REQUEST_STATUSES.map((s) => supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", s.value)),
  ]);

  const counts = Object.fromEntries(REQUEST_STATUSES.map((s, i) => [s.value, statusCounts[i].count ?? 0]));
  const tabs = [
    { key: "actives", label: "À traiter", href: "/admin/inbox" },
    ...REQUEST_STATUSES.map((s) => ({ key: s.value, label: s.label === "Nouvelle" ? "Nouvelles" : s.label === "Acceptée" ? "Acceptées" : s.label === "Terminée" ? "Terminées" : s.label === "Archivée" ? "Archivées" : s.label, href: `/admin/inbox?statut=${s.value}`, count: s.value === "nouveau" ? counts[s.value] : undefined })),
    { key: "toutes", label: "Toutes", href: "/admin/inbox?statut=toutes" },
  ];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <RealtimeRefresh />
      <PageHeader title="Boîte de réception" description="Demandes de devis, messages et réservations envoyés depuis le site.">
        <form className="mt-5 flex max-w-md items-center gap-2 rounded-[10px] border border-line-strong bg-surface px-3" action="/admin/inbox">
          {status !== "actives" ? <input type="hidden" name="statut" value={status} /> : null}
          <Search className="size-4 text-muted" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Nom, téléphone, e-mail, appareil, n°…" className="h-10 w-full bg-transparent text-sm outline-none" aria-label="Rechercher" />
        </form>
        <TabLinks tabs={tabs} active={status} />
      </PageHeader>
      <PageBody>
        {requests?.length ? (
          <div className="card divide-y divide-line overflow-hidden">
            {requests.map((r) => {
              const contact = r.preferred_contact === "email" ? r.email : r.preferred_contact === "whatsapp" ? r.whatsapp : r.phone;
              return (
                <Link key={r.id} href={`/admin/inbox/${r.id}`} className="flex gap-4 px-4 py-4 transition-colors hover:bg-ink/[0.02] sm:px-5">
                  <span className={`mt-2 size-2.5 shrink-0 rounded-full ${r.is_read ? "bg-transparent" : "bg-brand-strong"}`} aria-label={r.is_read ? undefined : "Non lue"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={`truncate ${r.is_read ? "font-semibold" : "font-extrabold"}`}>{r.customer_name}</span>
                      <span className="text-sm text-muted">#{r.number}</span>
                      {r.kind !== "devis" ? <Badge tone="info">{REQUEST_KINDS[r.kind]}</Badge> : null}
                      <RequestStatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 truncate text-sm text-ink-soft">
                      {[r.device_label, r.repair_labels?.join(", ")].filter(Boolean).join(" — ") || r.message || "—"}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1 font-medium text-ink-soft">
                        {r.preferred_contact === "whatsapp" ? <WhatsappIcon className="size-3.5 text-whatsapp" /> : r.preferred_contact === "email" ? <Mail className="size-3.5" /> : <Phone className="size-3.5" />}
                        {r.preferred_contact === "email" ? contact : formatPhone(contact, settings.default_country)}
                      </span>
                      {r.photos?.length ? (
                        <span className="inline-flex items-center gap-1">
                          <Camera className="size-3.5" /> {r.photos.length}
                        </span>
                      ) : null}
                      {r.estimated_price !== null ? <span>Estimation {formatMoney(r.estimated_price, settings.currency)}</span> : null}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">{formatRelative(r.created_at)}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Inbox className="size-5" />}
            title={q ? "Aucun résultat" : "Rien à traiter ici"}
            text={q ? `Aucune demande ne correspond à « ${q} ».` : "Les nouvelles demandes apparaissent ici en temps réel."}
          />
        )}
        {totalPages > 1 ? (
          <nav className="mt-6 flex items-center justify-center gap-2 text-sm" aria-label="Pagination">
            {page > 1 ? <Link className="rounded-lg border border-line-strong bg-surface px-3 py-1.5" href={`/admin/inbox?statut=${status}&q=${encodeURIComponent(q)}&page=${page - 1}`}>Précédent</Link> : null}
            <span className="text-muted">
              Page {page} / {totalPages}
            </span>
            {page < totalPages ? <Link className="rounded-lg border border-line-strong bg-surface px-3 py-1.5" href={`/admin/inbox?statut=${status}&q=${encodeURIComponent(q)}&page=${page + 1}`}>Suivant</Link> : null}
          </nav>
        ) : null}
      </PageBody>
    </>
  );
}
