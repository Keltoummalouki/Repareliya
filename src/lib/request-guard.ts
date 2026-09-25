import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

/** Empreinte anonymisée de l'adresse IP (limite d'envoi, pas de stockage de l'IP en clair). */
export async function ipHash() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "inconnue";
  const salt = process.env.IP_HASH_SALT ?? "repareliya";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/** Refuse les envois trop rapides (robots) : le formulaire transmet l'heure d'affichage. */
export function submittedTooFast(startedAt: FormDataEntryValue | null, minimumMs = 2500) {
  const started = Number(startedAt);
  if (!Number.isFinite(started) || started <= 0) return false;
  return Date.now() - started < minimumMs;
}
