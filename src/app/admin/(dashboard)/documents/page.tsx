import type { Metadata } from "next";
import { FileText, Mail, MessageSquare, Phone, Plus, Search } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageBody, PageHeader, TabLinks } from "@/components/admin/page-header";
import { WhatsappIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { documentStatusLabel, DOCUMENT_STATUS, type DocumentStatus, type DocumentType } from "@/lib/documents";
import { formatAmount, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Devis & factures" };

const SENT_ICON: Record<string, React.ReactNode> = {
  email: <Mail className="size-3.5" />,
  whatsapp: <WhatsappIcon className="size-3.5 text-whatsapp" />,
  sms: <MessageSquare className="size-3.5" />,
  telephone: <Phone className="size-3.5" />,
};

export default async function DocumentsPage({ searchParams }: PageProps<"/admin/documents">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const type = params.type === "facture" || params.type === "devis" ? params.type : "tous";
  const status = typeof params.statut === "string" ? params.statut : "";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";

  let query = supabase
    .from("documents")
    .select("id, type, number, status, customer_name, device_label, total, currency, issue_date, sent_via, sent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (type !== "tous") query = query.eq("type", type);
  if (status) query = query.eq("status", status);
  if (q) {
    const safe = q.replace(/[,()*%\\]/g, " ").trim();
    query = query.or(`customer_name.ilike.%${safe}%,number.ilike.%${safe}%,device_label.ilike.%${safe}%`);
  }
  const { data: documents } = await query;

  const base = (t: string) => `/admin/documents?type=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageHeader
        title="Devis & factures"
        description="Créez, envoyez et suivez vos devis et factures."
        actions={
          <>
            <ButtonLink href="/admin/documents/nouveau?type=devis" size="sm" variant="outline" icon={<Plus className="size-4" />}>
              Devis
            </ButtonLink>
            <ButtonLink href="/admin/documents/nouveau?type=facture" size="sm" icon={<Plus className="size-4" />}>
              Facture
            </ButtonLink>
          </>
        }
      >
        <form className="mt-5 flex max-w-md items-center gap-2 rounded-[10px] border border-line-strong bg-surface px-3" action="/admin/documents">
          <input type="hidden" name="type" value={type} />
          <Search className="size-4 text-muted" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Client, numéro, appareil…" className="h-10 w-full bg-transparent text-sm outline-none" aria-label="Rechercher" />
        </form>
        <TabLinks
          active={status ? `${type}-${status}` : type}
          tabs={[
            { key: "tous", label: "Tous", href: base("tous") },
            { key: "devis", label: "Devis", href: base("devis") },
            { key: "devis-envoye", label: "Devis en attente", href: `${base("devis")}&statut=envoye` },
            { key: "facture", label: "Factures", href: base("facture") },
            { key: "facture-envoye", label: "À encaisser", href: `${base("facture")}&statut=envoye` },
            { key: "facture-paye", label: "Payées", href: `${base("facture")}&statut=paye` },
          ]}
        />
      </PageHeader>
      <PageBody>
        {documents?.length ? (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-[0.08em] text-muted">
                  <th className="px-5 py-3 font-semibold">Document</th>
                  <th className="px-3 py-3 font-semibold">Client</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 text-right font-semibold">Montant</th>
                  <th className="px-5 py-3 text-right font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-ink/[0.02]">
                    <td className="px-5 py-3">
                      <Link href={`/admin/documents/${doc.id}`} className="font-semibold hover:text-brand-strong">
                        {doc.type === "devis" ? "Devis" : "Facture"} {doc.number ?? <span className="text-muted">(brouillon)</span>}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block font-medium">{doc.customer_name}</span>
                      {doc.device_label ? <span className="block text-xs text-muted">{doc.device_label}</span> : null}
                    </td>
                    <td className="px-3 py-3 text-muted">{formatDate(doc.issue_date, { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className="px-3 py-3 text-right font-semibold">{formatAmount(doc.total, doc.currency)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex items-center gap-2">
                        {doc.sent_via ? <span title={`Envoyé par ${doc.sent_via}`}>{SENT_ICON[doc.sent_via]}</span> : null}
                        <Badge tone={DOCUMENT_STATUS[doc.status as DocumentStatus]?.tone}>
                          {documentStatusLabel(doc.type as DocumentType, doc.status as DocumentStatus)}
                        </Badge>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<FileText className="size-5" />}
            title="Aucun document"
            text="Créez un devis depuis une demande de la boîte de réception, ou partez de zéro."
            action={
              <ButtonLink href="/admin/documents/nouveau?type=devis" icon={<Plus className="size-4" />}>
                Nouveau devis
              </ButtonLink>
            }
          />
        )}
      </PageBody>
    </>
  );
}
