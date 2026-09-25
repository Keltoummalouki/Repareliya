"use client";

import { KeyRound, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveInvoiceSettings, saveSiteSettings } from "@/app/admin/(dashboard)/content-actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { COUNTRIES, CURRENCIES, type InvoiceSettings, type SiteSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "./image-upload";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card grid gap-6 p-5 lg:grid-cols-[240px_1fr] lg:p-6">
      <div>
        <h2 className="font-bold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function extractIframeSrc(value: string) {
  const match = value.match(/src=["']([^"']+)["']/i);
  return match ? match[1] : value.trim();
}

export function SiteSettingsForm({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [pending, start] = useTransition();
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setValues((s) => ({ ...s, [k]: v }));

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveSiteSettings({ ...values, maps_embed_url: extractIframeSrc(values.maps_embed_url) });
          if (!r.ok) return void toast.error(r.error);
          toast.success("Paramètres du site enregistrés");
          router.refresh();
        });
      }}
    >
      <Section title="Entreprise" description="Affiché sur le site, les devis et les factures.">
        <Field label="Nom de l’atelier" htmlFor="s-name" required>
          <Input id="s-name" value={values.business_name} onChange={(e) => set("business_name", e.target.value)} />
        </Field>
        <Field label="Ville" htmlFor="s-city">
          <Input id="s-city" value={values.city} onChange={(e) => set("city", e.target.value)} placeholder="Ex. Casablanca" />
        </Field>
        <Field label="Slogan" htmlFor="s-tagline" className="sm:col-span-2">
          <Input id="s-tagline" value={values.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
        <Field label="Titre de l’accueil" htmlFor="s-hero" hint="Vide = « Une seconde vie. Pas un nouvel appareil. » La dernière phrase s’affiche en orange.">
          <Input id="s-hero" value={values.hero_title} onChange={(e) => set("hero_title", e.target.value)} />
        </Field>
        <Field label="Texte d’accroche" htmlFor="s-hero-sub">
          <Textarea id="s-hero-sub" rows={2} value={values.hero_subtitle} onChange={(e) => set("hero_subtitle", e.target.value)} />
        </Field>
        <Field label="Bandeau d’annonce (facultatif)" htmlFor="s-announcement" className="sm:col-span-2" hint="Ex. « Ouvert exceptionnellement dimanche 12 ». Vide = pas de bandeau.">
          <Input id="s-announcement" value={values.announcement} onChange={(e) => set("announcement", e.target.value)} />
        </Field>
      </Section>

      <Section title="Coordonnées" description="Boutons d’appel, WhatsApp et e-mail du site.">
        <Field label="Téléphone" htmlFor="s-phone">
          <Input id="s-phone" type="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} placeholder="06 12 34 56 78" />
        </Field>
        <Field label="WhatsApp" htmlFor="s-wa" hint="Vide = même numéro que le téléphone.">
          <Input id="s-wa" type="tel" value={values.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
        </Field>
        <Field label="E-mail" htmlFor="s-email" hint="Reçoit aussi les notifications de nouvelles demandes.">
          <Input id="s-email" type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Adresse" htmlFor="s-address">
          <Input id="s-address" value={values.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Lien Google Maps" htmlFor="s-maps" hint="Lien « Partager » de votre fiche.">
          <Input id="s-maps" value={values.maps_url} onChange={(e) => set("maps_url", e.target.value)} placeholder="https://maps.app.goo.gl/…" />
        </Field>
        <Field label="Carte intégrée" htmlFor="s-embed" hint="Google Maps → Partager → Intégrer une carte : collez le code ou le lien.">
          <Input id="s-embed" value={values.maps_embed_url} onChange={(e) => set("maps_embed_url", e.target.value)} placeholder="<iframe src=…" />
        </Field>
      </Section>

      <Section title="Horaires" description="Laissez vide pour masquer un jour.">
        {values.hours.map((h, i) => (
          <Field key={h.day} label={h.day} htmlFor={`h-${i}`}>
            <Input
              id={`h-${i}`}
              value={h.value}
              placeholder="09:00 – 19:00"
              onChange={(e) => set("hours", values.hours.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
            />
          </Field>
        ))}
      </Section>

      <Section title="Région & avis Google">
        <Field label="Pays (numéros de téléphone)" htmlFor="s-country">
          <Select id="s-country" value={values.default_country} onChange={(e) => set("default_country", e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Devise" htmlFor="s-currency">
          <Select id="s-currency" value={values.currency} onChange={(e) => set("currency", e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lien pour laisser un avis Google" htmlFor="s-greviews">
          <Input id="s-greviews" value={values.google_reviews_url} onChange={(e) => set("google_reviews_url", e.target.value)} placeholder="https://g.page/r/…/review" />
        </Field>
        <Field label="Google Place ID (facultatif)" htmlFor="s-place" hint="Avec GOOGLE_PLACES_API_KEY : affiche la note et les avis Google.">
          <Input id="s-place" value={values.google_place_id} onChange={(e) => set("google_place_id", e.target.value)} placeholder="ChIJ…" />
        </Field>
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" size="lg" loading={pending} icon={<Save className="size-4" />} className="shadow-(--shadow-float)">
          Enregistrer le site
        </Button>
      </div>
    </form>
  );
}

export function InvoiceSettingsForm({ initial, currency }: { initial: InvoiceSettings; currency: string }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [pending, start] = useTransition();
  const set = <K extends keyof InvoiceSettings>(k: K, v: InvoiceSettings[K]) => setValues((s) => ({ ...s, [k]: v }));

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveInvoiceSettings(values);
          if (!r.ok) return void toast.error(r.error);
          toast.success("Paramètres de facturation enregistrés");
          router.refresh();
        });
      }}
    >
      <Section title="Devis & factures" description="Mentions imprimées sur les PDF. Ces informations ne sont pas publiées sur le site.">
        <Field label="Raison sociale" htmlFor="i-legal" hint="Si différente du nom de l’atelier.">
          <Input id="i-legal" value={values.legal_name} onChange={(e) => set("legal_name", e.target.value)} />
        </Field>
        <Field label="Adresse de facturation" htmlFor="i-address" hint="Vide = adresse du site.">
          <Input id="i-address" value={values.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Identifiants légaux" htmlFor="i-ids" className="sm:col-span-2" hint="Une mention par ligne : ICE, RC, IF, Patente… ou SIRET, TVA intracom.">
          <Textarea id="i-ids" rows={3} value={values.legal_ids} onChange={(e) => set("legal_ids", e.target.value)} placeholder={"ICE : 000000000000000\nRC : 00000 — IF : 00000000"} />
        </Field>
        <ImageUpload className="max-w-56" label="Logo pour les PDF (PNG ou JPG)" folder="logo" aspect="aspect-[3/1]" value={values.logo_url || null} onChange={(url) => set("logo_url", url ?? "")} />
        <div />
        <Field label="TVA par défaut (%)" htmlFor="i-tax" hint="0 si vous n’êtes pas assujetti.">
          <Input id="i-tax" type="number" min={0} max={100} step="0.1" value={values.tax_rate} onChange={(e) => set("tax_rate", e.target.valueAsNumber || 0)} />
        </Field>
        <label className="flex items-center gap-2.5 self-end pb-3 text-sm font-medium">
          <Switch checked={values.prices_include_tax} onChange={(v) => set("prices_include_tax", v)} label="Prix saisis TTC" /> Prix saisis TTC (recommandé)
        </label>
        <Field label="Mention si TVA à 0 %" htmlFor="i-taxnote" className="sm:col-span-2" hint="Ex. « TVA non applicable, art. 293 B du CGI » (France).">
          <Input id="i-taxnote" value={values.tax_note} onChange={(e) => set("tax_note", e.target.value)} />
        </Field>
        <Field label="Validité des devis (jours)" htmlFor="i-validity">
          <Input id="i-validity" type="number" min={1} max={365} value={values.devis_validity_days} onChange={(e) => set("devis_validity_days", e.target.valueAsNumber || 30)} />
        </Field>
        <Field label="Échéance des factures (jours)" htmlFor="i-due" hint="0 = paiement immédiat.">
          <Input id="i-due" type="number" min={0} max={365} value={values.invoice_due_days} onChange={(e) => set("invoice_due_days", e.target.valueAsNumber || 0)} />
        </Field>
        <Field label="Conditions des devis" htmlFor="i-devis-terms" className="sm:col-span-2">
          <Textarea id="i-devis-terms" rows={3} value={values.devis_terms} onChange={(e) => set("devis_terms", e.target.value)} />
        </Field>
        <Field label="Conditions de paiement (factures)" htmlFor="i-terms" className="sm:col-span-2">
          <Textarea id="i-terms" rows={2} value={values.payment_terms} onChange={(e) => set("payment_terms", e.target.value)} />
        </Field>
        <Field label="Coordonnées bancaires (facultatif)" htmlFor="i-bank" className="sm:col-span-2" hint="Imprimées sur les factures uniquement.">
          <Textarea id="i-bank" rows={2} value={values.bank_details} onChange={(e) => set("bank_details", e.target.value)} placeholder="RIB / IBAN…" />
        </Field>
        <Field label="Pied de page des PDF" htmlFor="i-footer" className="sm:col-span-2">
          <Input id="i-footer" value={values.footer_note} onChange={(e) => set("footer_note", e.target.value)} />
        </Field>
        <p className="text-xs text-muted sm:col-span-2">Devise des documents : {currency} (modifiable dans « Région »).</p>
      </Section>
      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending} icon={<Save className="size-4" />}>
          Enregistrer la facturation
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="card grid gap-6 p-5 lg:grid-cols-[240px_1fr] lg:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (password.length < 8) return void toast.error("8 caractères minimum.");
        if (password !== confirm) return void toast.error("Les mots de passe ne correspondent pas.");
        start(async () => {
          const { error } = await createClient().auth.updateUser({ password });
          if (error) return void toast.error(error.message);
          toast.success("Mot de passe modifié");
          setPassword("");
          setConfirm("");
        });
      }}
    >
      <div>
        <h2 className="font-bold">Mot de passe</h2>
        <p className="mt-1 text-sm text-muted">Changez le mot de passe de votre compte administrateur.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nouveau mot de passe" htmlFor="p-new">
          <Input id="p-new" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirmer" htmlFor="p-confirm">
          <Input id="p-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" variant="outline" loading={pending} icon={<KeyRound className="size-4" />}>
            Modifier le mot de passe
          </Button>
        </div>
      </div>
    </form>
  );
}
