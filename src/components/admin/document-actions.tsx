"use client";

import clsx from "clsx";
import {
  Ban,
  BadgeCheck,
  Check,
  Copy,
  CopyPlus,
  Download,
  ExternalLink,
  Mail,
  MessageSquare,
  Phone,
  ReceiptText,
  Send,
  Stamp,
  ThumbsDown,
  Trash,
  Wallet,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  convertToInvoice,
  deleteDocument,
  duplicateDocument,
  markInvoicePaid,
  sendDocument,
  setDocumentStatus,
  validateInvoice,
} from "@/app/admin/(dashboard)/documents/actions";
import { WhatsappIcon } from "@/components/icons";
import { Button, ExternalButton } from "@/components/ui/button";
import { DatePicker, localDateValue } from "@/components/ui/date-picker";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { mailtoLink, smsLink, telLink, whatsappLink } from "@/lib/contact";
import { PAYMENT_METHODS } from "@/lib/documents";
import { formatPhone } from "@/lib/format";

export type ActionDoc = {
  id: string;
  type: "devis" | "facture";
  number: string | null;
  status: string;
  customer_name: string;
  customer_phone: string | null;
  customer_whatsapp: string | null;
  customer_email: string | null;
  preferred_contact: string | null;
  sent_at: string | null;
  sent_via: string | null;
};

type Channel = "whatsapp" | "sms" | "email" | "telephone";

export function DocumentActions({
  doc,
  publicUrl,
  message,
  emailEnabled,
  country,
  businessName,
}: {
  doc: ActionDoc;
  publicUrl: string;
  message: string;
  emailEnabled: boolean;
  country: string;
  businessName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sendOpen, setSendOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const isDevis = doc.type === "devis";
  const draftInvoice = !isDevis && doc.status === "brouillon";

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string; data?: unknown }>, success?: string, redirect?: (id: string) => string) =>
    start(async () => {
      const result = await fn();
      if (!result.ok) {
        toast.error(result.error ?? "Erreur");
        return;
      }
      if (success) toast.success(result.message ?? success);
      const newId = (result.data as { id?: string } | undefined)?.id;
      if (redirect && newId) router.push(redirect(newId));
      else router.refresh();
    });

  return (
    <div className="space-y-3">
      {draftInvoice ? (
        <div className="rounded-xl border border-warning/30 bg-warning-soft/60 p-4 text-sm">
          <p className="font-semibold">Facture en brouillon</p>
          <p className="mt-1 text-ink-soft">La validation attribue le numéro définitif et verrouille son contenu.</p>
          <Button
            className="mt-3 w-full"
            loading={pending}
            icon={<Stamp className="size-4" />}
            onClick={() => {
              if (confirm("Valider la facture ? Elle ne pourra plus être modifiée.")) run(() => validateInvoice(doc.id), "Facture validée");
            }}
          >
            Valider la facture
          </Button>
        </div>
      ) : (
        <Button className="w-full" size="lg" icon={<Send className="size-4" />} onClick={() => setSendOpen(true)} disabled={doc.status === "annule"}>
          Envoyer au client
        </Button>
      )}

      <div className="grid grid-cols-2 gap-2">
        <ExternalButton href={`/admin/documents/${doc.id}/pdf`} target="_blank" variant="outline" size="sm" icon={<Download className="size-4" />}>
          PDF
        </ExternalButton>
        {!draftInvoice ? (
          <Button
            variant="outline"
            size="sm"
            icon={<Copy className="size-4" />}
            onClick={async () => {
              await navigator.clipboard.writeText(publicUrl);
              toast.success("Lien client copié");
            }}
          >
            Lien client
          </Button>
        ) : null}
        {!draftInvoice ? (
          <ExternalButton href={publicUrl} target="_blank" variant="ghost" size="sm" className="col-span-2" icon={<ExternalLink className="size-4" />}>
            Voir comme le client
          </ExternalButton>
        ) : null}
      </div>

      <div className="space-y-1.5 border-t border-line pt-3">
        {isDevis && doc.status !== "annule" ? (
          <>
            {doc.status !== "accepte" ? (
              <ActionRow icon={<BadgeCheck className="size-4 text-success" />} label="Marquer accepté" disabled={pending} onClick={() => run(() => setDocumentStatus(doc.id, "accepte"), "Devis accepté")} />
            ) : null}
            {doc.status !== "refuse" ? (
              <ActionRow icon={<ThumbsDown className="size-4 text-danger" />} label="Marquer refusé" disabled={pending} onClick={() => run(() => setDocumentStatus(doc.id, "refuse"), "Devis refusé")} />
            ) : null}
            <ActionRow
              icon={<ReceiptText className="size-4 text-brand-strong" />}
              label="Convertir en facture"
              disabled={pending}
              onClick={() => run(() => convertToInvoice(doc.id), "Facture créée", (id) => `/admin/documents/${id}`)}
            />
          </>
        ) : null}
        {!isDevis && doc.status === "envoye" ? (
          <ActionRow icon={<Wallet className="size-4 text-success" />} label="Marquer payée" disabled={pending} onClick={() => setPayOpen((v) => !v)} />
        ) : null}
        {payOpen ? <PaidForm id={doc.id} onDone={() => { setPayOpen(false); router.refresh(); }} /> : null}
        <ActionRow icon={<CopyPlus className="size-4" />} label="Dupliquer" disabled={pending} onClick={() => run(() => duplicateDocument(doc.id), "Copie créée", (id) => `/admin/documents/${id}`)} />
        {doc.status !== "annule" && !(isDevis === false && doc.status === "brouillon") ? (
          <ActionRow
            icon={<Ban className="size-4" />}
            label={isDevis ? "Annuler le devis" : "Annuler la facture"}
            disabled={pending}
            onClick={() => {
              if (confirm(isDevis ? "Annuler ce devis ?" : "Annuler cette facture ? Elle restera dans l’historique avec la mention annulée.")) run(() => setDocumentStatus(doc.id, "annule"), "Document annulé");
            }}
          />
        ) : null}
        {isDevis || doc.status === "brouillon" ? (
          <ActionRow
            icon={<Trash className="size-4 text-danger" />}
            label="Supprimer"
            className="text-danger"
            disabled={pending}
            onClick={() => {
              if (confirm("Supprimer définitivement ce document ?")) run(() => deleteDocument(doc.id), "Document supprimé", () => "/admin/documents");
            }}
          />
        ) : null}
      </div>

      {sendOpen ? (
        <SendDialog
          doc={doc}
          initialMessage={message}
          emailEnabled={emailEnabled}
          country={country}
          businessName={businessName}
          onClose={() => setSendOpen(false)}
          onSent={() => {
            setSendOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ActionRow({ icon, label, onClick, disabled, className }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium hover:bg-black/[0.04] disabled:opacity-50", className)}
    >
      {icon}
      {label}
    </button>
  );
}

function PaidForm({ id, onDone }: { id: string; onDone: () => void }) {
  const [date, setDate] = useState(() => localDateValue());
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3 rounded-xl bg-bg p-3">
      <Field label="Date du paiement" htmlFor="paid_at">
        <DatePicker id="paid_at" value={date} onChange={(e) => setDate(e.target.value)} required />
      </Field>
      <Field label="Moyen de paiement" htmlFor="payment_method">
        <Select id="payment_method" value={method} onChange={(e) => setMethod(e.target.value)}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </Select>
      </Field>
      <Button
        size="sm"
        className="w-full"
        loading={pending}
        icon={<Check className="size-4" />}
        onClick={() =>
          start(async () => {
            const result = await markInvoicePaid(id, { paid_at: date, payment_method: method });
            if (result.ok) {
              toast.success("Facture payée");
              onDone();
            } else toast.error(result.error);
          })
        }
      >
        Confirmer le paiement
      </Button>
    </div>
  );
}

function SendDialog({
  doc,
  initialMessage,
  emailEnabled,
  country,
  businessName,
  onClose,
  onSent,
}: {
  doc: ActionDoc;
  initialMessage: string;
  emailEnabled: boolean;
  country: string;
  businessName: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const preferred = (doc.preferred_contact === "telephone" ? "sms" : doc.preferred_contact) as Channel | null;
  const [channel, setChannel] = useState<Channel>(preferred ?? (doc.customer_whatsapp ? "whatsapp" : doc.customer_email ? "email" : "sms"));
  const [message, setMessage] = useState(initialMessage);
  const [whatsapp, setWhatsapp] = useState(doc.customer_whatsapp ?? doc.customer_phone ?? "");
  const [phone, setPhone] = useState(doc.customer_phone ?? doc.customer_whatsapp ?? "");
  const [email, setEmail] = useState(doc.customer_email ?? "");
  const [pending, start] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  const label = doc.type === "devis" ? "devis" : "facture";

  const channels: { key: Channel; label: string; icon: React.ReactNode }[] = [
    { key: "whatsapp", label: "WhatsApp", icon: <WhatsappIcon className="size-4" /> },
    { key: "sms", label: "SMS", icon: <MessageSquare className="size-4" /> },
    { key: "email", label: "E-mail", icon: <Mail className="size-4" /> },
    { key: "telephone", label: "Appel", icon: <Phone className="size-4" /> },
  ];

  function markSent(via: Channel, extra?: { to?: string; markOnly?: boolean }) {
    start(async () => {
      const result = await sendDocument(doc.id, via, { ...extra, message });
      if (result.ok) {
        toast.success(result.message ?? "Envoyé");
        onSent();
      } else toast.error(result.error);
    });
  }

  function openWhatsapp() {
    const url = whatsappLink(whatsapp, message, country);
    if (!url) return toast.error("Numéro WhatsApp invalide.");
    window.open(url, "_blank", "noopener,noreferrer");
    markSent("whatsapp");
  }

  function openSms() {
    const url = smsLink(phone, message, country);
    if (!url) return toast.error("Numéro de téléphone invalide.");
    window.location.href = url;
    markSent("sms");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/40 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="send-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-(--shadow-float) sm:max-w-lg sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="send-title" className="text-xl font-bold">
              Envoyer le {label} {doc.number}
            </h2>
            <p className="mt-1 text-sm text-muted">
              À {doc.customer_name}
              {doc.preferred_contact ? " — contact préféré signalé ★" : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-lg hover:bg-black/5" aria-label="Fermer">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-1.5" role="tablist">
          {channels.map((c) => {
            const isPreferred = c.key === preferred;
            return (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={channel === c.key}
                onClick={() => setChannel(c.key)}
                className={clsx(
                  "relative flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors",
                  channel === c.key ? "border-ink bg-ink text-white" : "border-line-strong hover:border-ink",
                )}
              >
                {c.icon}
                {c.label}
                {isPreferred ? <span className="absolute -right-1 -top-1.5 rounded-full bg-brand-strong px-1.5 text-[10px] text-white">★</span> : null}
              </button>
            );
          })}
        </div>

        <Field label="Message" htmlFor="send-message" className="mt-5">
          <Textarea id="send-message" rows={8} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>

        <div className="mt-4 space-y-3">
          {channel === "whatsapp" ? (
            <>
              <Field label="Numéro WhatsApp" htmlFor="send-whatsapp">
                <Input id="send-whatsapp" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              </Field>
              <Button variant="whatsapp" className="w-full" size="lg" loading={pending} icon={<WhatsappIcon className="size-5" />} onClick={openWhatsapp}>
                Ouvrir WhatsApp avec le message
              </Button>
              <p className="text-xs text-muted">WhatsApp s’ouvre avec le message prêt : il ne reste qu’à appuyer sur Envoyer. Le lien permet au client de voir et télécharger le PDF.</p>
            </>
          ) : null}
          {channel === "sms" ? (
            <>
              <Field label="Numéro de téléphone" htmlFor="send-phone">
                <Input id="send-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Button className="w-full" size="lg" loading={pending} icon={<MessageSquare className="size-4" />} onClick={openSms}>
                Ouvrir l’application SMS
              </Button>
              <p className="text-xs text-muted">Fonctionne depuis un téléphone (ou un ordinateur relié à votre téléphone).</p>
            </>
          ) : null}
          {channel === "email" ? (
            <>
              <Field label="Adresse e-mail" htmlFor="send-email">
                <Input id="send-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              {emailEnabled ? (
                <Button className="w-full" size="lg" loading={pending} icon={<Send className="size-4" />} onClick={() => markSent("email", { to: email })}>
                  Envoyer l’e-mail avec le PDF
                </Button>
              ) : (
                <>
                  <ExternalButton
                    href={mailtoLink(email, `Votre ${label} ${doc.number} — ${businessName}`, message) ?? "#"}
                    className="w-full"
                    size="lg"
                    icon={<Mail className="size-4" />}
                  >
                    Ouvrir ma messagerie
                  </ExternalButton>
                  <Button variant="outline" className="w-full" loading={pending} icon={<Check className="size-4" />} onClick={() => markSent("email", { to: email, markOnly: true })}>
                    Marquer comme envoyé par e-mail
                  </Button>
                  <p className="text-xs text-muted">
                    Votre messagerie s’ouvre avec le message et le lien du {label}. Pour envoyer automatiquement l’e-mail avec le PDF joint,
                    configurez RESEND_API_KEY (voir le README).
                  </p>
                </>
              )}
            </>
          ) : null}
          {channel === "telephone" ? (
            <>
              <p className="text-sm">
                Appelez {doc.customer_name}
                {phone ? ` au ${formatPhone(phone, country)}` : ""}, puis marquez le document comme transmis.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <ExternalButton href={telLink(phone, country) ?? "#"} variant="outline" icon={<Phone className="size-4" />}>
                  Appeler
                </ExternalButton>
                <Button loading={pending} icon={<Check className="size-4" />} onClick={() => markSent("telephone")}>
                  Marquer transmis
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
