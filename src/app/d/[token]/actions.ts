"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { getSiteSettings } from "@/lib/data/public";
import { emailLayout, escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";

export async function respondToQuote(token: string, decision: "accepte" | "refuse"): Promise<{ ok: boolean; error?: string }> {
  if (!z.string().uuid().safeParse(token).success) return { ok: false, error: "Lien invalide." };
  const supabase = createServiceClient();
  const { data: doc, error } = await supabase
    .from("documents")
    .update({ status: decision, accepted_at: decision === "accepte" ? new Date().toISOString() : null })
    .eq("public_token", token)
    .eq("type", "devis")
    .in("status", ["brouillon", "envoye"])
    .select("id, number, customer_name, total, currency, request_id")
    .maybeSingle();
  if (error || !doc) return { ok: false, error: "Ce devis ne peut plus être modifié." };
  if (doc.request_id) {
    await supabase.from("requests").update({ status: decision === "accepte" ? "accepte" : "en_cours" }).eq("id", doc.request_id);
  }

  const settings = await getSiteSettings();
  const notifyTo = process.env.ADMIN_NOTIFICATION_EMAIL || settings.email;
  if (notifyTo && isEmailConfigured()) {
    after(() =>
      sendEmail({
        to: notifyTo,
        subject: `Devis ${doc.number} ${decision === "accepte" ? "accepté" : "refusé"} par ${doc.customer_name}`,
        text: `${doc.customer_name} a ${decision === "accepte" ? "accepté" : "refusé"} le devis ${doc.number}.`,
        html: emailLayout({
          title: `Devis ${doc.number} ${decision === "accepte" ? "accepté ✅" : "refusé"}`,
          body: `${escapeHtml(doc.customer_name)} a ${decision === "accepte" ? "accepté" : "refusé"} le devis en ligne.`,
          cta: { label: "Ouvrir le devis", url: `${siteUrl()}/admin/documents/${doc.id}` },
        }),
      }).then(() => undefined),
    );
  }
  revalidatePath(`/d/${token}`);
  return { ok: true };
}
