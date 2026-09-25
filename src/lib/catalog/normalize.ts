// Normalisation des noms d'appareils venant de sources externes :
// - AppleDB (https://api.appledb.dev) pour tous les appareils Apple
// - Liste officielle Google Play des appareils Android certifiés
// Ce fichier n'a aucune dépendance : il est aussi utilisé par scripts/.

export type CategorySlug = "smartphones" | "tablettes" | "ordinateurs" | "consoles" | "montres";

export type CatalogCandidate = {
  name: string;
  slug: string;
  category: CategorySlug;
  releaseYear: number | null;
};

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\+/g, " plus ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function collapse(value: string) {
  return value.replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim();
}

function frenchOrdinal(n: number) {
  return n === 1 ? "1re" : `${n}e`;
}

export function toFrenchDeviceName(name: string) {
  return name
    .replace(/\b(\d+)(?:st|nd|rd|th) generation\b/gi, (_, n: string) => `${frenchOrdinal(Number(n))} génération`)
    .replace(/(\d+(?:\.\d+)?)-inch\b/g, "$1 pouces")
    .replace(/\bEarly (\d{4})\b/g, "début $1")
    .replace(/\bMid (\d{4})\b/g, "mi-$1")
    .replace(/\bLate (\d{4})\b/g, "fin $1")
    .replace(/\bNov (\d{4})\b/g, "nov. $1")
    .replace(/\bTwo Thunderbolt 3 ports\b/g, "2 ports Thunderbolt 3")
    .replace(/\bFour Thunderbolt 3 ports\b/g, "4 ports Thunderbolt 3");
}

// ---------------------------------------------------------------------
// Apple (AppleDB)
// ---------------------------------------------------------------------
export type AppleDbDevice = {
  name: string;
  type: string;
  released?: string | string[];
};

const APPLE_TYPES: Record<string, CategorySlug> = {
  iPhone: "smartphones",
  iPad: "tablettes",
  "iPad mini": "tablettes",
  "iPad Air": "tablettes",
  "iPad Pro": "tablettes",
  "Apple Watch": "montres",
  MacBook: "ordinateurs",
  "MacBook Air": "ordinateurs",
  "MacBook Pro": "ordinateurs",
  "MacBook Neo": "ordinateurs",
};

export function normalizeAppleName(raw: string): string {
  let n = raw;
  n = n.replace(/\s*Wi-Fi(?:\s*\+\s*(?:Cellular|3G))?/g, "");
  n = n.replace(
    /\s*\((?:GSM|CDMA|US|Global|China mainland|GSM, 2012|VZ|MM|TD-LTE|1TB|1 or 2 TB|Store Display Model|Mid 2012)\)/g,
    "",
  );
  n = n.replace(/GPS \+ Cellular, |GPS, |Cellular, /g, "");
  n = n.replace(/, (?:Integrated|Dedicated) [Gg]raphics/g, "");
  n = n.replace(/, Radeon Pro [\w ]+ Graphics/g, "");
  n = n.replace(/\d+-core (M\d)/g, "$1");
  n = n.replace(/^Apple\s+/, "");
  return collapse(toFrenchDeviceName(n));
}

function firstYear(released: AppleDbDevice["released"]): { year: number | null; date: string | null } {
  const values = (Array.isArray(released) ? released : String(released ?? "").split(","))
    .map((v) => v.trim())
    .filter(Boolean)
    .sort();
  if (!values.length) return { year: null, date: null };
  const year = Number(values[0].slice(0, 4));
  return { year: Number.isFinite(year) ? year : null, date: values[0] };
}

export function normalizeAppleDb(devices: AppleDbDevice[], today = new Date()): CatalogCandidate[] {
  const todayIso = today.toISOString().slice(0, 10);
  const bySlug = new Map<string, CatalogCandidate & { date: string }>();
  for (const device of devices) {
    const category = APPLE_TYPES[device.type];
    if (!category || !device.name || /^Unreleased/i.test(device.name)) continue;
    const { year, date } = firstYear(device.released);
    if (!date || date > todayIso) continue;
    const name = normalizeAppleName(device.name);
    const slug = slugify(name);
    if (!slug) continue;
    const existing = bySlug.get(slug);
    if (!existing || date < existing.date) bySlug.set(slug, { name, slug, category, releaseYear: year, date });
  }
  return [...bySlug.values()]
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name))
    .map(({ date: _date, ...candidate }) => candidate);
}

// ---------------------------------------------------------------------
// Android (liste Google Play des appareils pris en charge)
// ---------------------------------------------------------------------
export type GooglePlayRow = { brand: string; name: string };

/** Le fichier officiel est en UTF-16 ; passez-lui le texte déjà décodé. */
export function parseGooglePlayCsv(text: string): GooglePlayRow[] {
  const rows: GooglePlayRow[] = [];
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  for (const line of lines.slice(1)) {
    if (!line) continue;
    const fields = [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1].replace(/""/g, '"'));
    const brand = (fields[0] ?? "").trim();
    const name = (fields[1] ?? "").trim();
    if (brand && name) rows.push({ brand, name });
  }
  return rows;
}

const BRAND_DISPLAY: Record<string, string> = {
  samsung: "Samsung",
  xiaomi: "Xiaomi",
  redmi: "Redmi",
  poco: "POCO",
  google: "Google",
  huawei: "Huawei",
  honor: "Honor",
  oppo: "Oppo",
  oneplus: "OnePlus",
  motorola: "Motorola",
  realme: "realme",
  vivo: "vivo",
  nokia: "Nokia",
  tecno: "Tecno",
  infinix: "Infinix",
  itel: "itel",
  "tct (alcatel)": "Alcatel",
  lge: "LG",
  sony: "Sony",
  asus: "Asus",
  lenovo: "Lenovo",
  zte: "ZTE",
  nothing: "Nothing",
  fairphone: "Fairphone",
  "hmd global": "HMD",
  tcl: "TCL",
  blackview: "Blackview",
  doogee: "Doogee",
  ulefone: "Ulefone",
  oukitel: "Oukitel",
  cubot: "Cubot",
  umidigi: "Umidigi",
  crosscall: "Crosscall",
  wiko: "Wiko",
};

/** Sous-marques importées par défaut dans la marque parente (ex. Redmi → Xiaomi). */
export const ANDROID_PARENT_BRAND: Record<string, string> = { redmi: "Xiaomi", poco: "Xiaomi" };

export function androidBrandKey(brand: string) {
  return brand.trim().toLowerCase();
}

export function androidBrandDisplay(key: string, fallback?: string) {
  return BRAND_DISPLAY[key] ?? fallback ?? key.replace(/\b\w/g, (c) => c.toUpperCase());
}

const EXCLUDED = /\b(tv|box|stick|chromebook|projector|projecteur|monitor|display|car|auto|dongle|streaming|set-?top|speaker|kiosk|pos|terminal|scanner)\b/i;
const TABLET = /\b(tab|tablet|pad|matepad|mediapad|magicpad|mipad)\b|pad\d|Tab [A-Z]?\d/i;
const WATCH = /\bwatch/i;

export function androidCategory(name: string): CategorySlug | null {
  if (EXCLUDED.test(name)) return null;
  if (WATCH.test(name)) return "montres";
  if (TABLET.test(name)) return "tablettes";
  return "smartphones";
}

// Références techniques plutôt que noms commerciaux (SM-J337A, X9079, WAFX-PS…)
const MODEL_CODE = /^(?:SM|GT|SC|SCH|SGH|SHV|SPH|SHW|SHL|SCV)-|^[A-Z]{0,2}\d{3,}[A-Za-z]{0,3}$|^[A-Z0-9]+[-_][A-Z0-9-]+$/;

export function normalizeAndroidName(brandKey: string, raw: string): string | null {
  let n = collapse(raw.replace(/\s*Wi-?Fi(?:\s*\+\s*(?:Cellular|LTE|4G|5G))?/gi, " "));
  if (!/^[\x20-\x7E]+$/.test(n)) return null; // noms non latins (versions chinoises…)
  if (MODEL_CODE.test(n)) return null;
  n = n.replace(/(\S)5G$/, "$1 5G");
  if (ANDROID_PARENT_BRAND[brandKey]) {
    // Redmi / POCO : on garde le préfixe, ils sont rangés sous Xiaomi
    n = n.replace(/^REDMI\b/, "Redmi").replace(/^Poco\b/, "POCO");
    if (brandKey === "redmi" && !/^Redmi\b/i.test(n)) n = `Redmi ${n}`;
    if (brandKey === "poco" && !/^POCO\b/i.test(n)) n = `POCO ${n}`;
    return n;
  }
  const display = androidBrandDisplay(brandKey);
  const prefixes = new Set([display, brandKey, brandKey.split(" ")[0]]);
  if (brandKey === "tecno") prefixes.add("TECNO Mobile");
  for (const prefix of prefixes) {
    const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i");
    if (re.test(n) && n.replace(re, "").length > 1) n = n.replace(re, "");
  }
  return n.length >= 2 ? n : null;
}

export function normalizeGooglePlay(rows: GooglePlayRow[], brandKey: string): CatalogCandidate[] {
  const bySlug = new Map<string, { candidate: CatalogCandidate; score: number }>();
  for (const row of rows) {
    if (androidBrandKey(row.brand) !== brandKey) continue;
    const name = normalizeAndroidName(brandKey, row.name);
    if (!name) continue;
    const category = androidCategory(name);
    if (!category) continue;
    const slug = slugify(name);
    if (!slug) continue;
    // Préfère la variante la plus « propre » (moins de majuscules)
    const score = (name.match(/[a-z]/g) ?? []).length;
    const existing = bySlug.get(slug);
    if (!existing || score > existing.score) {
      bySlug.set(slug, { candidate: { name, slug, category, releaseYear: null }, score });
    }
  }
  return [...bySlug.values()]
    .map((v) => v.candidate)
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }));
}

export function summarizeAndroidBrands(rows: GooglePlayRow[]) {
  const counts = new Map<string, { key: string; label: string; count: number }>();
  for (const row of rows) {
    const key = androidBrandKey(row.brand);
    const entry = counts.get(key) ?? { key, label: androidBrandDisplay(key, row.brand), count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}
