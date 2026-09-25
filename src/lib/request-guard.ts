import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

/** Empreinte anonymisée de l'adresse IP (limite d'envoi, pas de stockage de l'IP en clair). */
export async function ipHash() {
  const ip = (await clientIp()) ?? "inconnue";
  const salt = process.env.IP_HASH_SALT ?? "repareliya";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Vérifie le jeton Cloudflare Turnstile transmis par le formulaire (usage unique, valable 5 min).
 * Sans les deux clés configurées, la vérification est désactivée.
 */
export async function verifyTurnstile(token: FormDataEntryValue | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;

  const body = new URLSearchParams({ secret, response: token });
  const ip = await clientIp();
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const result = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!result.success) console.warn("turnstile", result["error-codes"]);
    return result.success === true;
  } catch (error) {
    // Cloudflare injoignable : on refuse plutôt que de laisser passer les robots
    console.error("turnstile", error);
    return false;
  }
}

/** Refuse les envois trop rapides (robots) : le formulaire transmet l'heure d'affichage. */
export function submittedTooFast(startedAt: FormDataEntryValue | null, minimumMs = 2500) {
  const started = Number(startedAt);
  if (!Number.isFinite(started) || started <= 0) return false;
  return Date.now() - started < minimumMs;
}
