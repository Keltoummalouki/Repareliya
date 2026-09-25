import type { Metadata } from "next";
import { FilePlus2, Mail, MessageSquare, Phone, ReceiptText, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageBody, PageHeader, Panel } from "@/components/admin/page-header";
import { RequestActions, RequestNotes, RequestStatusSelect } from "@/components/admin/request-controls";
import { REQUEST_KINDS } from "@/components/admin/status";
import { WhatsappIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { ButtonLink, ExternalButton } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { mailtoLink, smsLink, telLink, whatsappLink } from "@/lib/contact";
import { getSiteSettings } from "@/lib/data/public";
import { documentStatusLabel, DOCUMENT_STATUS, type DocumentStatus, type DocumentType } from "@/lib/documents";
import { formatAmount, formatDateTime, formatMoney, formatPhone } from "@/lib/format";

export const metadata: Metadata = { title: "Demande" };

export default async function RequestPage({ params }: PageProps<"/admin/inbox/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: request } = await supabase.from("requests").select("*, accessories(name)").eq("id", id).maybeSingle();
  if (!request) notFound();

  if (!request.is_read) await supabase.from("requests").update({ is_read: true }).eq("id", id);

  const [settings, { data: documents }, photoUrls] = await Promise.all([
    getSiteSettings(),
    supabase.from("documents").select("id, type, number, status, total, currency, created_at").eq("request_id", id).order("created_at"),
    request.photos.length
      ? supabase.storage.from("request-photos").createSignedUrls(request.photos, 3600).then((r) => r.data ?? [])
      : Promise.resolve([]),
  ]);

  const country = settings.default_country;
  const firstName = request.customer_name.split(" ")[0];
  const intro = `Bonjour ${firstName}, c’est ${settings.business_name} au sujet de votre demande #${request.number}${request.device_label ? ` (${request.device_label})` : ""}.`;
  type Channel = { key: string; label: string; value: string | null; display: string | null; icon: React.ReactNode; actions: { label: string; href: string | null; external?: boolean }[] };
  const channels: Channel[] = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      value: request.whatsapp,
      display: formatPhone(request.whatsapp, country),
      icon: <WhatsappIcon className="size-4" />,
      actions: [{ label: "Écrire", href: whatsappLink(request.whatsapp, intro, country), external: true }],
    },
    {
      key: "telephone",
      label: "Téléphone",
      value: request.phone,
      display: formatPhone(request.phone, country),
      icon: <Phone className="size-4" />,
      actions: [
        { label: "Appeler", href: telLink(request.phone, country) },
        { label: "SMS", href: smsLink(request.phone, intro, country) },
        { label: "WhatsApp", href: whatsappLink(request.phone, intro, country), external: true },
      ],
    },
    {
      key: "email",
      label: "E-mail",
      value: request.email,
      display: request.email,
      icon: <Mail className="size-4" />,
      actions: [{ label: "Écrire", href: mailtoLink(request.email, `Votre demande #${request.number} — ${settings.business_name}`, `${intro}\n\n`) }],
    },
  ].sort((a, b) => Number(b.key === request.preferred_contact) - Number(a.key === request.preferred_contact));

  return (
    <>
      <PageHeader
        back={{ href: "/admin/inbox", label: "Boîte de réception" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {request.customer_name}
            <span className="text-lg font-semibold text-muted">#{request.number}</span>
          </span>
        }
        description={`${REQUEST_KINDS[request.kind]} reçue le ${formatDateTime(request.created_at)}`}
        actions={
          <>
            <RequestStatusSelect id={request.id} status={request.status} />
            <ButtonLink href={`/admin/documents/nouveau?type=devis&demande=${request.id}`} size="sm" icon={<FilePlus2 className="size-4" />}>
              Créer un devis
            </ButtonLink>
            <ButtonLink href={`/admin/documents/nouveau?type=facture&demande=${request.id}`} size="sm" variant="outline" icon={<ReceiptText className="size-4" />}>
              Facture
            </ButtonLink>
          </>
        }
      />
      <PageBody className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <Panel title="Demande">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Appareil</dt>
                <dd className="mt-1 font-semibold">{request.device_label || "Non précisé"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Estimation catalogue</dt>
                <dd className="mt-1 font-semibold">{request.estimated_price !== null ? formatMoney(request.estimated_price, settings.currency) : "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{request.kind === "accessoire" ? "Article" : "Réparations souhaitées"}</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {request.repair_labels.length ? request.repair_labels.map((label) => <Badge key={label} tone="brand">{label}</Badge>) : <span className="text-sm text-muted">—</span>}
                </dd>
              </div>
            </dl>
            {request.message ? (
              <div className="mt-5 rounded-xl bg-bg p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  <MessageSquare className="size-3.5" aria-hidden /> Message du client
                </p>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed">{request.message}</p>
              </div>
            ) : null}
            {photoUrls.length ? (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Photos</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {photoUrls.map((photo, index) =>
                    photo.signedUrl ? (
                      <a key={photo.path ?? index} href={photo.signedUrl} target="_blank" rel="noopener noreferrer" className="block size-32 overflow-hidden rounded-xl border border-line">
                        <img src={photo.signedUrl} alt={`Photo ${index + 1} envoyée par le client`} className="size-full object-cover" />
                      </a>
                    ) : null,
                  )}
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel title="Notes internes">
            <RequestNotes id={request.id} notes={request.admin_notes ?? ""} />
          </Panel>

          <RequestActions id={request.id} status={request.status} />
        </div>

        <div className="space-y-6">
          <Panel title="Contacter le client">
            <p className="mb-4 flex items-center gap-2 text-sm">
              <Star className="size-4 fill-[#f5a524] text-[#f5a524]" aria-hidden />
              Préfère être contacté par{" "}
              <strong>{channels.find((c) => c.key === request.preferred_contact)?.label}</strong>
            </p>
            <ul className="space-y-3">
              {channels.map((channel) => (
                <li
                  key={channel.key}
                  className={`rounded-xl border p-3.5 ${channel.key === request.preferred_contact ? "border-brand-strong bg-brand-soft/40" : "border-line"}`}
                >
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                    {channel.icon} {channel.label}
                  </p>
                  {channel.value ? (
                    <>
                      <p className="mt-1 break-all font-semibold">{channel.display}</p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {channel.actions.map((action) =>
                          action.href ? (
                            <ExternalButton
                              key={action.label}
                              href={action.href}
                              target={action.external ? "_blank" : undefined}
                              rel={action.external ? "noopener noreferrer" : undefined}
                              size="sm"
                              variant={channel.key === request.preferred_contact && action === channel.actions[0] ? (channel.key === "whatsapp" ? "whatsapp" : "primary") : "outline"}
                            >
                              {action.label}
                            </ExternalButton>
                          ) : null,
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-muted">Non renseigné</p>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Devis & factures liés" bodyClassName="p-0">
            {documents?.length ? (
              <ul className="divide-y divide-line">
                {documents.map((doc) => (
                  <li key={doc.id}>
                    <Link href={`/admin/documents/${doc.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-ink/[0.02]">
                      <span>
                        <span className="block font-semibold">
                          {doc.type === "devis" ? "Devis" : "Facture"} {doc.number ?? "(brouillon)"}
                        </span>
                        <span className="text-xs text-muted">{formatDateTime(doc.created_at)}</span>
                      </span>
                      <span className="text-right">
                        <span className="block font-semibold">{formatAmount(doc.total, doc.currency)}</span>
                        <Badge tone={DOCUMENT_STATUS[doc.status as DocumentStatus]?.tone}>{documentStatusLabel(doc.type as DocumentType, doc.status as DocumentStatus)}</Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-muted">Aucun document. Créez un devis à partir de cette demande : les informations du client et de l’appareil seront reprises automatiquement.</p>
            )}
          </Panel>
        </div>
      </PageBody>
    </>
  );
}
