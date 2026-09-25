"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, getAdmin, notAllowed, type ActionResult } from "@/lib/auth";

const STATUSES = ["nouveau", "en_cours", "devis_envoye", "accepte", "termine", "archive"] as const;

export async function updateRequest(
  id: string,
  patch: { status?: (typeof STATUSES)[number]; admin_notes?: string; is_read?: boolean },
): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const parsed = z
    .object({
      status: z.enum(STATUSES).optional(),
      admin_notes: z.string().max(5000).optional(),
      is_read: z.boolean().optional(),
    })
    .safeParse(patch);
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return { ok: false, error: "Données invalides." };
  const { error } = await admin.supabase.from("requests").update(parsed.data).eq("id", id);
  if (error) return fail(error);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function deleteRequest(id: string): Promise<ActionResult> {
  const admin = await getAdmin();
  if (!admin) return notAllowed;
  const { data: request } = await admin.supabase.from("requests").select("photos").eq("id", id).maybeSingle();
  if (request?.photos?.length) await admin.supabase.storage.from("request-photos").remove(request.photos);
  const { error } = await admin.supabase.from("requests").delete().eq("id", id);
  if (error) return fail(error);
  revalidatePath("/admin", "layout");
  return { ok: true };
}
