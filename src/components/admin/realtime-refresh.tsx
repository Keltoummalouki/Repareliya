"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/** Rafraîchit la page quand une demande arrive ou change (Supabase Realtime). */
export function RealtimeRefresh({ notify = true }: { notify?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    (async () => {
      // Sans jeton de session, Realtime s'abonne en anonyme et la RLS (admins
      // uniquement) filtre tous les événements : on transmet donc le jeton.
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel("requests-inbox")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "requests" }, (payload) => {
          if (notify) {
            const row = payload.new as { customer_name?: string; number?: number };
            toast.success(`Nouvelle demande #${row.number ?? ""}`, { description: row.customer_name });
          }
          router.refresh();
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "requests" }, () => router.refresh())
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [router, notify]);

  return null;
}
