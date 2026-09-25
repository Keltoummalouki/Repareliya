"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { respondToQuote } from "@/app/d/[token]/actions";
import { Button } from "@/components/ui/button";

export function QuoteResponse({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmRefuse, setConfirmRefuse] = useState(false);

  const respond = (decision: "accepte" | "refuse") =>
    start(async () => {
      const result = await respondToQuote(token, decision);
      if (!result.ok) setError(result.error ?? "Erreur");
      router.refresh();
    });

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <Button size="lg" variant="primary" loading={pending} icon={<Check className="size-4" />} onClick={() => respond("accepte")}>
          J’accepte ce devis
        </Button>
        {confirmRefuse ? (
          <Button size="lg" variant="outline" disabled={pending} icon={<X className="size-4" />} onClick={() => respond("refuse")}>
            Confirmer le refus
          </Button>
        ) : (
          <Button size="lg" variant="ghost" disabled={pending} onClick={() => setConfirmRefuse(true)}>
            Refuser
          </Button>
        )}
      </div>
      {error ? <p className="mt-3 text-sm font-medium text-danger">{error}</p> : null}
    </div>
  );
}
