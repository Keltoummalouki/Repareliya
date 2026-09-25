"use server";

import { z } from "zod";
import { ipHash, submittedTooFast, verifyTurnstile } from "@/lib/request-guard";
import { createServiceClient } from "@/lib/supabase/server";

export type ReviewState = { status: "idle" } | { status: "success" } | { status: "error"; error: string };

const schema = z.object({
  author_name: z.string().trim().min(2, "Indiquez votre prénom.").max(80),
  rating: z.coerce.number().int().min(1, "Choisissez une note.").max(5),
  comment: z.string().trim().min(10, "Votre avis doit faire au moins 10 caractères.").max(1500),
  device_label: z.string().trim().max(100).optional(),
});

export async function submitReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  if (formData.get("website") || submittedTooFast(formData.get("started_at"))) {
    return { status: "error", error: "Votre avis n’a pas pu être envoyé. Réessayez dans un instant." };
  }
  if (formData.get("consent") !== "on") return { status: "error", error: "Merci d’accepter la publication de votre avis." };

  const parsed = schema.safeParse({
    author_name: formData.get("author_name"),
    rating: formData.get("rating") ?? 0,
    comment: formData.get("comment"),
    device_label: formData.get("device_label") || undefined,
  });
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0]?.message ?? "Vérifiez le formulaire." };

  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) {
    return { status: "error", error: "La vérification anti-robot a échoué. Réessayez." };
  }

  const supabase = createServiceClient();
  const hash = await ipHash();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", hash)
    .gte("created_at", since);
  if ((count ?? 0) >= 3) return { status: "error", error: "Vous avez déjà partagé plusieurs avis aujourd’hui. Merci !" };

  const { error } = await supabase.from("reviews").insert({
    ...parsed.data,
    device_label: parsed.data.device_label || null,
    source: "site",
    status: "en_attente",
    ip_hash: hash,
  });
  if (error) {
    console.error("submitReview", error);
    return { status: "error", error: "Le service est momentanément indisponible. Réessayez plus tard." };
  }
  return { status: "success" };
}
