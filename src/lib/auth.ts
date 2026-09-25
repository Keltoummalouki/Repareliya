import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Renvoie l'admin connecté (vérifié côté serveur) ou null. */
export const getAdmin = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) return null;
  return { supabase, userId, email: (data.claims.email as string | undefined) ?? "" };
});

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

export const notAllowed = { ok: false, error: "Session expirée. Reconnectez-vous." } as const;

export function fail(error: unknown, fallback = "Une erreur est survenue."): { ok: false; error: string } {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    const message = error.message;
    if (/duplicate key|unique/i.test(message)) return { ok: false, error: "Cet élément existe déjà (doublon)." };
    if (/violates foreign key|still referenced/i.test(message))
      return { ok: false, error: "Impossible : cet élément est utilisé ailleurs." };
    return { ok: false, error: message.length < 220 ? message : fallback };
  }
  return { ok: false, error: fallback };
}
