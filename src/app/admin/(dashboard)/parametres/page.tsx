import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { InvoiceSettingsForm, PasswordForm, SiteSettingsForm } from "@/components/admin/settings-forms";
import { requireAdmin } from "@/lib/auth";
import { getAllSettings } from "@/lib/data/admin";
import { isEmailConfigured } from "@/lib/email";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { site, invoice } = await getAllSettings(supabase);
  const email = isEmailConfigured();
  const google = Boolean(process.env.GOOGLE_PLACES_API_KEY);
  return (
    <>
      <PageHeader title="Paramètres" description="Informations de l’atelier, facturation et compte." />
      <PageBody className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <p className={`card flex items-center gap-3 p-4 text-sm ${email ? "" : "border-warning/40"}`}>
            <Mail className={`size-5 ${email ? "text-success" : "text-warning"}`} aria-hidden />
            {email ? "Envoi d’e-mails activé (Resend)." : "Envoi d’e-mails non configuré : les devis s’envoient via votre messagerie. Voir README."}
          </p>
          <p className="card flex items-center gap-3 p-4 text-sm">
            <MapPin className={`size-5 ${google ? "text-success" : "text-muted"}`} aria-hidden />
            {google ? "Avis Google activés (Places API)." : "Avis Google : facultatif (GOOGLE_PLACES_API_KEY)."}
          </p>
        </div>
        <SiteSettingsForm initial={site} />
        <InvoiceSettingsForm initial={invoice} currency={site.currency} />
        <PasswordForm />
      </PageBody>
    </>
  );
}
