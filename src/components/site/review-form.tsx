"use client";

import clsx from "clsx";
import { CheckCircle2, Star } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitReview, type ReviewState } from "@/app/(site)/avis/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Turnstile, turnstileEnabled, type TurnstileHandle } from "@/components/ui/turnstile";

const LABELS = ["", "Décevant", "Moyen", "Bien", "Très bien", "Excellent"];

export function ReviewForm() {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, { status: "idle" });
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [captcha, setCaptcha] = useState<string | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);

  // Jeton Turnstile à usage unique : nouveau défi après chaque échec
  useEffect(() => {
    if (state.status === "error") turnstile.current?.reset();
  }, [state]);

  if (state.status === "success") {
    return (
      <div className="card p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
        <p className="mt-4 font-display text-2xl font-bold">Merci pour votre avis !</p>
        <p className="mt-2 text-muted">Il sera publié après une rapide vérification.</p>
      </div>
    );
  }

  const shown = hover || rating;
  return (
    <form action={action} className="card space-y-5 p-6 sm:p-8">
      <input type="hidden" name="started_at" value={startedAt} />
      <input type="hidden" name="rating" value={rating} />
      <div className="hidden" aria-hidden>
        <label>
          Site web <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <fieldset>
        <legend className="field-label">
          Votre note<span className="text-brand-strong"> *</span>
        </legend>
        <div className="flex items-center gap-3">
          <div className="flex" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Note sur 5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                className="p-1"
              >
                <Star className={clsx("size-8 transition-colors", n <= shown ? "fill-[#f5a524] text-[#f5a524]" : "fill-transparent text-line-strong")} />
              </button>
            ))}
          </div>
          <span className="text-sm font-medium text-muted">{LABELS[shown]}</span>
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom ou pseudo" htmlFor="author_name" required>
          <Input id="author_name" name="author_name" maxLength={80} required autoComplete="given-name" placeholder="Ex. Amine B." />
        </Field>
        <Field label="Appareil réparé" htmlFor="device_label">
          <Input id="device_label" name="device_label" maxLength={100} placeholder="Ex. iPhone 13 · écran" />
        </Field>
      </div>
      <Field label="Votre avis" htmlFor="comment" required>
        <Textarea id="comment" name="comment" rows={4} minLength={10} maxLength={1500} required placeholder="Accueil, délai, qualité de la réparation…" />
      </Field>
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-soft">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4.5 shrink-0 accent-brand-strong" />
        J’accepte la publication de mon prénom, de ma note et de mon avis sur ce site.
      </label>
      <Turnstile ref={turnstile} onTokenChange={setCaptcha} />
      {state.status === "error" ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" loading={pending} disabled={!rating || (turnstileEnabled && !captcha)}>
        Publier mon avis
      </Button>
    </form>
  );
}
