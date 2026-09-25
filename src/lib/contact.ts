import { toE164 } from "@/lib/format";

export type ContactMethod = "telephone" | "whatsapp" | "email";

export const CONTACT_METHODS: { value: ContactMethod; label: string; short: string }[] = [
  { value: "whatsapp", label: "WhatsApp", short: "WhatsApp" },
  { value: "telephone", label: "Téléphone (appel ou SMS)", short: "Téléphone" },
  { value: "email", label: "E-mail", short: "E-mail" },
];

export function contactMethodLabel(method: string | null | undefined) {
  return CONTACT_METHODS.find((m) => m.value === method)?.short ?? "—";
}

export function whatsappLink(phone: string | null | undefined, text?: string, defaultCountry = "MA") {
  const e164 = toE164(phone, defaultCountry);
  if (!e164) return null;
  const base = `https://wa.me/${e164.replace(/^\+/, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function telLink(phone: string | null | undefined, defaultCountry = "MA") {
  const e164 = toE164(phone, defaultCountry);
  return e164 ? `tel:${e164}` : null;
}

export function smsLink(phone: string | null | undefined, text?: string, defaultCountry = "MA") {
  const e164 = toE164(phone, defaultCountry);
  if (!e164) return null;
  return text ? `sms:${e164}?&body=${encodeURIComponent(text)}` : `sms:${e164}`;
}

export function mailtoLink(email: string | null | undefined, subject?: string, body?: string) {
  if (!email) return null;
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString().replace(/\+/g, "%20");
  return `mailto:${email}${query ? `?${query}` : ""}`;
}
