"use client";

import { Check, MessageSquareReply, Pencil, Plus, Save, Star, Trash, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteReview, saveReview, setReviewStatus } from "@/app/admin/(dashboard)/content-actions";
import { Stars } from "@/components/site/blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { formatDateTime } from "@/lib/format";
import { Dialog } from "./dialog";
import { EmptyState } from "./page-header";

type Review = {
  id: string;
  author_name: string;
  rating: number;
  comment: string;
  device_label: string | null;
  source: "site" | "google" | "facebook" | "manuel";
  status: "en_attente" | "publie" | "refuse";
  is_featured: boolean;
  reply: string | null;
  created_at: string;
};

const SOURCES = { site: "Site", google: "Google", facebook: "Facebook", manuel: "Ajout manuel" } as const;

export function ReviewsManager({ reviews }: { reviews: Review[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<Review | "new" | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(success);
      router.refresh();
    });

  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
          Ajouter un avis
        </Button>
      </div>
      {reviews.length ? (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Stars rating={review.rating} />
                <span className="font-semibold">{review.author_name}</span>
                {review.device_label ? <span className="text-sm text-muted">· {review.device_label}</span> : null}
                <Badge>{SOURCES[review.source]}</Badge>
                {review.is_featured ? <Badge tone="brand">Mis en avant</Badge> : null}
                <span className="ml-auto text-xs text-muted">{formatDateTime(review.created_at)}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap leading-relaxed text-ink-soft">{review.comment}</p>
              {review.reply ? (
                <p className="mt-3 rounded-lg bg-bg px-3 py-2 text-sm">
                  <span className="font-semibold">Votre réponse : </span>
                  {review.reply}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {review.status !== "publie" ? (
                  <Button size="sm" variant="primary" disabled={pending} icon={<Check className="size-4" />} onClick={() => run(() => setReviewStatus(review.id, "publie"), "Avis publié")}>
                    Publier
                  </Button>
                ) : null}
                {review.status !== "refuse" ? (
                  <Button size="sm" variant="outline" disabled={pending} icon={<X className="size-4" />} onClick={() => run(() => setReviewStatus(review.id, "refuse"), "Avis refusé")}>
                    {review.status === "publie" ? "Dépublier" : "Refuser"}
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" icon={review.reply ? <Pencil className="size-4" /> : <MessageSquareReply className="size-4" />} onClick={() => setEditing(review)}>
                  {review.reply ? "Modifier" : "Répondre / modifier"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  disabled={pending}
                  icon={<Trash className="size-4" />}
                  onClick={() => confirm("Supprimer cet avis ?") && run(() => deleteReview(review.id), "Avis supprimé")}
                >
                  Supprimer
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Star className="size-5" />} title="Aucun avis ici" text="Les avis déposés sur le site arrivent en attente de validation." />
      )}
      {editing ? <ReviewDialog review={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

function ReviewDialog({ review, onClose }: { review: Review | null; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [values, setValues] = useState({
    author_name: review?.author_name ?? "",
    rating: review?.rating ?? 5,
    comment: review?.comment ?? "",
    device_label: review?.device_label ?? "",
    source: review?.source ?? ("manuel" as Review["source"]),
    status: review?.status ?? ("publie" as Review["status"]),
    is_featured: review?.is_featured ?? false,
    reply: review?.reply ?? "",
  });
  return (
    <Dialog title={review ? `Avis de ${review.author_name}` : "Ajouter un avis"} onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await saveReview(review?.id ?? null, values);
            if (!r.ok) return void toast.error(r.error);
            toast.success("Avis enregistré");
            onClose();
            router.refresh();
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" htmlFor="rv-name" required>
            <Input id="rv-name" value={values.author_name} onChange={(e) => setValues({ ...values, author_name: e.target.value })} required />
          </Field>
          <Field label="Note" htmlFor="rv-rating">
            <Select id="rv-rating" value={values.rating} onChange={(e) => setValues({ ...values, rating: Number(e.target.value) })}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {"★".repeat(n)} ({n}/5)
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Avis" htmlFor="rv-comment" required>
          <Textarea id="rv-comment" rows={4} value={values.comment} onChange={(e) => setValues({ ...values, comment: e.target.value })} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Appareil" htmlFor="rv-device">
            <Input id="rv-device" value={values.device_label} onChange={(e) => setValues({ ...values, device_label: e.target.value })} />
          </Field>
          <Field label="Source" htmlFor="rv-source">
            <Select id="rv-source" value={values.source} onChange={(e) => setValues({ ...values, source: e.target.value as Review["source"] })}>
              {Object.entries(SOURCES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Votre réponse publique (facultatif)" htmlFor="rv-reply">
          <Textarea id="rv-reply" rows={2} value={values.reply} onChange={(e) => setValues({ ...values, reply: e.target.value })} />
        </Field>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2.5 text-sm font-medium">
            <Switch checked={values.status === "publie"} onChange={(v) => setValues({ ...values, status: v ? "publie" : "en_attente" })} label="Publié" /> Publié
          </label>
          <label className="flex items-center gap-2.5 text-sm font-medium">
            <Switch checked={values.is_featured} onChange={(v) => setValues({ ...values, is_featured: v })} label="Mis en avant" /> Mis en avant
          </label>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={pending} icon={<Save className="size-4" />}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
