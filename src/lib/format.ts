import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export function formatMoney(amount: number | string | null | undefined, currency = "MAD") {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

/** Montant avec toujours deux décimales (documents comptables). */
export function formatAmount(amount: number | string | null | undefined, currency = "MAD") {
  const value = Number(amount ?? 0);
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function formatDate(value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value.length === 10 ? `${value}T12:00:00` : value) : value;
  return new Intl.DateTimeFormat("fr-FR", options ?? { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatRelative(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = (date.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return "à l’instant";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(date, { day: "numeric", month: "short", year: "numeric" });
}

/** Numéro au format international E.164 (+212612345678), ou null si invalide. */
export function toE164(phone: string | null | undefined, defaultCountry = "MA"): string | null {
  if (!phone) return null;
  const parsed = parsePhoneNumberFromString(phone.trim(), defaultCountry as CountryCode);
  if (!parsed || !parsed.isPossible()) return null;
  return parsed.number;
}

export function isValidPhone(phone: string, defaultCountry = "MA") {
  const parsed = parsePhoneNumberFromString(phone.trim(), defaultCountry as CountryCode);
  return Boolean(parsed?.isPossible());
}

export function formatPhone(phone: string | null | undefined, defaultCountry = "MA") {
  if (!phone) return "";
  const parsed = parsePhoneNumberFromString(phone.trim(), defaultCountry as CountryCode);
  if (!parsed) return phone;
  return parsed.country === defaultCountry ? parsed.formatNational() : parsed.formatInternational();
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
