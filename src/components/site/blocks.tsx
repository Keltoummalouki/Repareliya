import clsx from "clsx";
import { ArrowUpRight, Quote, Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { GoogleIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/format";

export function SectionHeading({
  eyebrow,
  title,
  text,
  action,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-4 text-[34px] font-extrabold leading-[1.08] sm:text-[44px]">{title}</h2>
        {text ? <p className="mt-4 max-w-xl leading-relaxed text-ink-soft">{text}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={clsx("inline-flex gap-0.5", className)} aria-label={`${rating} sur 5`} role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={clsx("size-4", n <= Math.round(rating) ? "fill-[#f5a524] text-[#f5a524]" : "fill-line text-line-strong")}
          aria-hidden
        />
      ))}
    </span>
  );
}

export type ReviewCardData = {
  id: string;
  author_name: string;
  rating: number;
  comment: string;
  device_label?: string | null;
  source?: string | null;
  reply?: string | null;
  created_at: string;
  photoUrl?: string | null;
  relative?: string | null;
};

export function ReviewCard({ review }: { review: ReviewCardData }) {
  return (
    <figure className="card flex h-full flex-col p-6">
      <div className="flex items-center justify-between gap-3">
        <Stars rating={review.rating} />
        {review.source === "google" ? (
          <GoogleIcon className="size-4 text-muted" aria-label="Avis Google" />
        ) : (
          <Quote className="size-5 text-brand/60" aria-hidden />
        )}
      </div>
      <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-ink-soft">“{review.comment}”</blockquote>
      {review.reply ? (
        <p className="mt-4 rounded-lg bg-bg px-3 py-2 text-sm text-ink-soft">
          <span className="font-semibold text-ink">Réponse : </span>
          {review.reply}
        </p>
      ) : null}
      <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
        {review.photoUrl ? (
          <img src={review.photoUrl} alt="" className="size-9 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="grid size-9 place-items-center rounded-full bg-ink font-display text-sm font-bold text-on-fill">
            {review.author_name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate font-semibold">{review.author_name}</span>
          <span className="block truncate text-xs text-muted">
            {[review.device_label, review.relative ?? formatDate(review.created_at, { month: "long", year: "numeric" })]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

export type RealisationCardData = {
  id: string;
  title: string;
  description: string | null;
  device_label: string | null;
  repair_label: string | null;
  before_image_url: string | null;
  after_image_url: string | null;
  images: string[];
  performed_on: string | null;
};

export function RealisationCard({ item }: { item: RealisationCardData }) {
  const cover = item.after_image_url ?? item.images[0] ?? item.before_image_url;
  const hasBeforeAfter = Boolean(item.before_image_url && item.after_image_url);
  return (
    <article className="group card overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-subtle">
        {hasBeforeAfter ? (
          <div className="grid h-full grid-cols-2">
            <figure className="relative">
              <img src={item.before_image_url!} alt={`${item.title} — avant`} className="size-full object-cover" loading="lazy" />
              <figcaption className="absolute bottom-2 left-2 rounded-full bg-charcoal/85 px-2 py-0.5 text-[11px] font-semibold text-white">Avant</figcaption>
            </figure>
            <figure className="relative border-l-2 border-surface">
              <img src={item.after_image_url!} alt={`${item.title} — après`} className="size-full object-cover" loading="lazy" />
              <figcaption className="absolute bottom-2 left-2 rounded-full bg-brand-strong px-2 py-0.5 text-[11px] font-semibold text-on-fill">Après</figcaption>
            </figure>
          </div>
        ) : cover ? (
          <img src={cover} alt={item.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
        ) : null}
      </div>
      <div className="p-5">
        <div className="flex flex-wrap gap-1.5">
          {item.device_label ? <Badge>{item.device_label}</Badge> : null}
          {item.repair_label ? <Badge tone="brand">{item.repair_label}</Badge> : null}
        </div>
        <h3 className="mt-3 text-lg font-bold leading-snug">{item.title}</h3>
        {item.description ? <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{item.description}</p> : null}
        {item.performed_on ? <p className="mt-3 text-xs text-muted">{formatDate(item.performed_on, { month: "long", year: "numeric" })}</p> : null}
      </div>
    </article>
  );
}

export type AccessoryCardData = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number | string | null;
  compare_at_price: number | string | null;
  image_url: string | null;
  compatible_with: string | null;
  stock_status: string;
};

const STOCK: Record<string, { label: string; tone: "success" | "warning" | "danger" }> = {
  en_stock: { label: "En stock", tone: "success" },
  sur_commande: { label: "Sur commande", tone: "warning" },
  rupture: { label: "Épuisé", tone: "danger" },
};

export function AccessoryCard({ item, currency }: { item: AccessoryCardData; currency: string }) {
  const stock = STOCK[item.stock_status] ?? STOCK.en_stock;
  const price = item.price === null ? null : Number(item.price);
  const compare = item.compare_at_price === null ? null : Number(item.compare_at_price);
  return (
    <article className="card group flex flex-col overflow-hidden">
      <div className="relative aspect-square overflow-hidden bg-subtle">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" />
        ) : (
          <div className="grid size-full place-items-center font-display text-4xl font-extrabold text-line-strong">{item.name.slice(0, 1)}</div>
        )}
        <Badge tone={stock.tone} className="absolute left-3 top-3">
          {stock.label}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{item.category}</p>
        <h3 className="mt-1 font-bold leading-snug">{item.name}</h3>
        {item.compatible_with ? <p className="mt-1 text-xs text-muted">Compatible : {item.compatible_with}</p> : null}
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p>
            {price !== null ? <span className="font-display text-xl font-extrabold">{formatMoney(price, currency)}</span> : <span className="text-sm text-muted">Prix en boutique</span>}
            {compare !== null && price !== null && compare > price ? (
              <span className="ml-2 text-sm text-muted line-through">{formatMoney(compare, currency)}</span>
            ) : null}
          </p>
          {item.stock_status !== "rupture" ? (
            <Link
              href={`/devis?accessoire=${item.id}`}
              className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-on-fill transition-colors hover:bg-ink-soft"
            >
              Réserver <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="card p-8 text-center text-muted">{children}</p>;
}
