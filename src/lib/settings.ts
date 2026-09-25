import { z } from "zod";

// ---------------------------------------------------------------------
// Paramètres publics (table site_settings)
// ---------------------------------------------------------------------
export const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

export const siteSettingsSchema = z.object({
  business_name: z.string().trim().min(1).max(80).catch("Repareliya"),
  tagline: z.string().trim().max(160).catch(""),
  hero_title: z.string().trim().max(120).catch(""),
  hero_subtitle: z.string().trim().max(300).catch(""),
  phone: z.string().trim().max(40).catch(""),
  whatsapp: z.string().trim().max(40).catch(""),
  email: z.string().trim().max(160).catch(""),
  address: z.string().trim().max(200).catch(""),
  city: z.string().trim().max(80).catch(""),
  maps_url: z.string().trim().max(600).catch(""),
  maps_embed_url: z.string().trim().max(1200).catch(""),
  hours: z
    .array(z.object({ day: z.string(), value: z.string().max(80) }))
    .catch([]),
  google_reviews_url: z.string().trim().max(600).catch(""),
  google_place_id: z.string().trim().max(200).catch(""),
  default_country: z.string().trim().length(2).catch("MA"),
  currency: z.string().trim().length(3).catch("MAD"),
  announcement: z.string().trim().max(200).catch(""),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  business_name: "Repareliya",
  tagline: "Réparation de smartphones, tablettes, ordinateurs et consoles",
  hero_title: "",
  hero_subtitle: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  city: "",
  maps_url: "",
  maps_embed_url: "",
  hours: DAYS.map((day) => ({ day, value: day === "Dimanche" ? "Fermé" : "" })),
  google_reviews_url: "",
  google_place_id: "",
  default_country: "MA",
  currency: "MAD",
  announcement: "",
};

export function parseSiteSettings(data: unknown): SiteSettings {
  const merged = { ...DEFAULT_SITE_SETTINGS, ...(isObject(data) ? data : {}) };
  const parsed = siteSettingsSchema.parse(merged);
  if (!parsed.hours.length) parsed.hours = DEFAULT_SITE_SETTINGS.hours;
  return parsed;
}

// ---------------------------------------------------------------------
// Paramètres de facturation (table invoice_settings, admin uniquement)
// ---------------------------------------------------------------------
export const invoiceSettingsSchema = z.object({
  legal_name: z.string().trim().max(160).catch(""),
  legal_ids: z.string().trim().max(600).catch(""),
  address: z.string().trim().max(400).catch(""),
  logo_url: z.string().trim().max(600).catch(""),
  tax_rate: z.coerce.number().min(0).max(100).catch(0),
  prices_include_tax: z.boolean().catch(true),
  tax_note: z.string().trim().max(300).catch(""),
  payment_terms: z.string().trim().max(600).catch(""),
  bank_details: z.string().trim().max(600).catch(""),
  devis_validity_days: z.coerce.number().int().min(1).max(365).catch(30),
  invoice_due_days: z.coerce.number().int().min(0).max(365).catch(0),
  footer_note: z.string().trim().max(600).catch(""),
  devis_terms: z.string().trim().max(1500).catch(""),
});

export type InvoiceSettings = z.infer<typeof invoiceSettingsSchema>;

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  legal_name: "",
  legal_ids: "",
  address: "",
  logo_url: "",
  tax_rate: 0,
  prices_include_tax: true,
  tax_note: "",
  payment_terms: "Paiement à la restitution de l’appareil.",
  bank_details: "",
  devis_validity_days: 30,
  invoice_due_days: 0,
  footer_note: "Merci pour votre confiance.",
  devis_terms:
    "Devis gratuit, valable pendant la durée indiquée. Les pièces sont commandées après votre accord. Une panne supplémentaire découverte pendant l’intervention fait l’objet d’un nouveau devis.",
};

export function parseInvoiceSettings(data: unknown): InvoiceSettings {
  return invoiceSettingsSchema.parse({ ...DEFAULT_INVOICE_SETTINGS, ...(isObject(data) ? data : {}) });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const CURRENCIES = [
  { code: "MAD", label: "Dirham marocain (MAD)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "DZD", label: "Dinar algérien (DZD)" },
  { code: "TND", label: "Dinar tunisien (TND)" },
  { code: "XOF", label: "Franc CFA (XOF)" },
  { code: "CHF", label: "Franc suisse (CHF)" },
  { code: "CAD", label: "Dollar canadien (CAD)" },
  { code: "USD", label: "Dollar américain (USD)" },
];

export const COUNTRIES = [
  { code: "MA", label: "Maroc (+212)" },
  { code: "FR", label: "France (+33)" },
  { code: "BE", label: "Belgique (+32)" },
  { code: "CH", label: "Suisse (+41)" },
  { code: "DZ", label: "Algérie (+213)" },
  { code: "TN", label: "Tunisie (+216)" },
  { code: "SN", label: "Sénégal (+221)" },
  { code: "CI", label: "Côte d’Ivoire (+225)" },
  { code: "CA", label: "Canada (+1)" },
];
