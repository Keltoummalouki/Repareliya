import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { parseInvoiceSettings, parseSiteSettings } from "@/lib/settings";

type Client = SupabaseClient<Database>;

export async function getInvoiceSettings(supabase: Client) {
  const { data } = await supabase.from("invoice_settings").select("data").eq("id", 1).maybeSingle();
  return parseInvoiceSettings(data?.data);
}

/** Paramètres lus avec le client fourni (pas de cache : tableau de bord). */
export async function getAllSettings(supabase: Client) {
  const [{ data: site }, invoice] = await Promise.all([
    supabase.from("site_settings").select("data").eq("id", 1).maybeSingle(),
    getInvoiceSettings(supabase),
  ]);
  return { site: parseSiteSettings(site?.data), invoice };
}
