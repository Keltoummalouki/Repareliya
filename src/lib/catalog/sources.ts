import "server-only";
import {
  normalizeAppleDb,
  normalizeGooglePlay,
  parseGooglePlayCsv,
  summarizeAndroidBrands,
  type AppleDbDevice,
  type GooglePlayRow,
} from "./normalize";

// Sources publiques :
// - AppleDB : https://api.appledb.dev/device/main.json (tous les appareils Apple)
// - Google Play : liste officielle des appareils Android certifiés (mise à jour par Google)
export const APPLEDB_URL = "https://api.appledb.dev/device/main.json";
export const GOOGLE_PLAY_URL = "https://storage.googleapis.com/play_public/supported_devices.csv";

const TTL = 12 * 60 * 60 * 1000;
const memory = new Map<string, { at: number; value: unknown }>();

async function remember<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T;
  const value = await load();
  memory.set(key, { at: Date.now(), value });
  return value;
}

async function download(url: string) {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(45_000) });
  if (!response.ok) throw new Error(`Source indisponible (${response.status})`);
  return response;
}

export function getAppleCandidates() {
  return remember("appledb", async () => {
    const devices = (await (await download(APPLEDB_URL)).json()) as AppleDbDevice[];
    return normalizeAppleDb(devices);
  });
}

function getGooglePlayRows() {
  return remember<GooglePlayRow[]>("googleplay", async () => {
    const buffer = await (await download(GOOGLE_PLAY_URL)).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? "utf-16le" : "utf-8";
    return parseGooglePlayCsv(new TextDecoder(encoding).decode(buffer));
  });
}

export async function getAndroidBrands() {
  return summarizeAndroidBrands(await getGooglePlayRows());
}

export async function getAndroidCandidates(brandKey: string) {
  return normalizeGooglePlay(await getGooglePlayRows(), brandKey);
}
