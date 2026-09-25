"use client";

import { useEffect, useEffectEvent, useImperativeHandle, useRef, useState, type Ref } from "react";
import { useTheme } from "@/components/theme";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Vrai quand la vérification anti-robot Cloudflare Turnstile est configurée. */
export const turnstileEnabled = Boolean(SITE_KEY);

export type TurnstileHandle = { reset: () => void };

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string | null | undefined;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

// Script Cloudflare chargé une seule fois, uniquement sur les pages qui affichent un formulaire
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error("turnstile"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Widget Cloudflare Turnstile. Ajoute au formulaire parent un champ caché `cf-turnstile-response`
 * vérifié côté serveur par `verifyTurnstile`. Le jeton ne sert qu’une fois : appeler `reset()`
 * après chaque réponse en erreur.
 */
export function Turnstile({
  onTokenChange,
  ref,
  className,
}: {
  onTokenChange: (token: string | null) => void;
  ref?: Ref<TurnstileHandle>;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const theme = useTheme();
  const emit = useEffectEvent((token: string | null) => onTokenChange(token));

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        if (widgetId.current) window.turnstile?.reset(widgetId.current);
        onTokenChange(null);
      },
    }),
    [onTokenChange],
  );

  // Recréé au changement de thème pour suivre le mode clair / sombre du site
  useEffect(() => {
    if (!SITE_KEY || !theme) return;
    let cancelled = false;
    loadTurnstile().then(
      (turnstile) => {
        if (cancelled || !container.current) return;
        widgetId.current =
          turnstile.render(container.current, {
            sitekey: SITE_KEY,
            theme,
            language: "fr",
            size: "flexible",
            callback: (token: string) => {
              setFailed(false);
              emit(token);
            },
            "expired-callback": () => emit(null),
            "error-callback": () => {
              setFailed(true);
              emit(null);
            },
          }) ?? null;
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
      emit(null);
    };
  }, [theme]);

  if (!SITE_KEY) return null;
  return (
    <div className={className}>
      <div ref={container} className="min-h-[65px]" />
      {failed ? (
        <p className="mt-1.5 text-[13px] font-medium text-danger" role="alert">
          La vérification anti-robot n’a pas pu se charger. Désactivez votre bloqueur de publicités ou rechargez la page.
        </p>
      ) : null}
    </div>
  );
}
