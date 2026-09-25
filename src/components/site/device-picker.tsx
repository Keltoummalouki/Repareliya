"use client";

import clsx from "clsx";
import { Check, LoaderCircle, Search } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { BrandMark, CategoryIcon } from "@/components/icons";
import type { PickerBrand, PickerCategory, PickerModel } from "./catalog-client";

export function CategoryTabs({
  categories,
  value,
  onChange,
  compact,
}: {
  categories: PickerCategory[];
  value: string | null;
  onChange: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Type d’appareil" className={clsx(compact ? "flex flex-wrap gap-2" : "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5")}>
      {categories.map((category) => {
        const active = category.id === value;
        return (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(category.id)}
            className={clsx(
              "flex items-center gap-2 border text-left font-semibold transition-colors",
              compact ? "h-10 whitespace-nowrap rounded-full px-3.5 text-[13px]" : "min-h-14 rounded-xl px-3 py-3 text-sm",
              active ? "border-ink bg-ink text-on-fill" : "border-line-strong bg-surface hover:border-ink",
            )}
          >
            <CategoryIcon icon={category.icon} className={clsx("shrink-0", compact ? "size-4.5" : "size-5.5", active ? "text-brand" : "text-ink")} />
            <span className="leading-tight">{category.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export function BrandChooser({
  brands,
  loading,
  value,
  onChange,
}: {
  brands: PickerBrand[] | null;
  loading: boolean;
  value: string | null;
  onChange: (brand: PickerBrand) => void;
}) {
  if (loading) return <LoadingLine label="Chargement des marques…" />;
  if (!brands?.length) return <p className="text-sm text-muted">Aucune marque pour cette catégorie pour le moment.</p>;
  return (
    <div role="radiogroup" aria-label="Marque" className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {brands.map((brand) => {
        const active = brand.brand_id === value;
        return (
          <button
            key={brand.brand_id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(brand)}
            className={clsx(
              "relative flex min-h-14 items-center justify-center rounded-xl border bg-surface px-3 py-2 transition-colors",
              active ? "border-brand-strong ring-2 ring-brand/25" : "border-line-strong hover:border-ink",
            )}
          >
            <BrandMark slug={brand.slug} name={brand.name} logoUrl={brand.logo_url} iconClassName="size-5" className="text-[15px]" />
            {active ? <Check className="absolute right-2 top-2 size-3.5 text-brand-strong" aria-hidden /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function ModelSearch({
  models,
  loading,
  value,
  onChange,
  brandName,
}: {
  models: PickerModel[] | null;
  loading: boolean;
  value: string | null;
  onChange: (model: PickerModel) => void;
  brandName?: string;
}) {
  const [query, setQuery] = useState("");
  const listId = useId();
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, " ");
    if (!models) return [];
    if (!q) return models;
    const terms = q.split(" ");
    return models.filter((m) => {
      const hay = `${brandName ?? ""} ${m.name}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [models, query, brandName]);

  if (loading) return <LoadingLine label="Chargement des modèles…" />;
  if (!models) return null;
  if (!models.length) return <p className="text-sm text-muted">Aucun modèle listé pour cette marque.</p>;

  return (
    <div className="rounded-xl border border-line-strong bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-3">
        <Search className="size-4 shrink-0 text-muted" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Rechercher parmi ${models.length} modèles…`}
          aria-controls={listId}
          aria-label="Rechercher un modèle"
          className="h-11 w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
        />
      </div>
      <ul id={listId} role="listbox" aria-label="Modèles" className="max-h-72 overflow-y-auto p-1.5">
        {filtered.map((model) => {
          const active = model.id === value;
          return (
            <li key={model.id} role="option" aria-selected={active}>
              <button
                type="button"
                onClick={() => onChange(model)}
                className={clsx(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] transition-colors",
                  active ? "bg-ink text-on-fill" : "hover:bg-ink/[0.04]",
                )}
              >
                <span>
                  {model.name}
                  {model.is_popular && !active ? (
                    <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-dark">Populaire</span>
                  ) : null}
                </span>
                <span className={clsx("text-xs", active ? "text-on-fill/70" : "text-muted")}>{model.release_year ?? ""}</span>
              </button>
            </li>
          );
        })}
        {!filtered.length ? <li className="px-3 py-4 text-sm text-muted">Aucun modèle ne correspond à « {query} ».</li> : null}
      </ul>
    </div>
  );
}

export function LoadingLine({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted" role="status">
      <LoaderCircle className="size-4 animate-spin" aria-hidden /> {label}
    </p>
  );
}
