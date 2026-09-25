"use client";

import { ArrowRight, ArrowUpRight, Clock, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RepairIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import {
  loadBrands,
  loadModels,
  loadPrices,
  useAsync,
  type PickerBrand,
  type PickerCategory,
  type PickerModel,
  type PickerRepairType,
} from "./catalog-client";
import { BrandChooser, CategoryTabs, LoadingLine, ModelSearch } from "./device-picker";

export function PriceEstimator({
  categories,
  repairTypes,
  currency,
  initialCategoryId,
}: {
  categories: PickerCategory[];
  repairTypes: PickerRepairType[];
  currency: string;
  initialCategoryId?: string | null;
}) {
  const [categoryId, setCategoryId] = useState<string | null>(initialCategoryId ?? categories[0]?.id ?? null);
  const [brand, setBrand] = useState<PickerBrand | null>(null);
  const [model, setModel] = useState<PickerModel | null>(null);

  const brands = useAsync(categoryId ? `b:${categoryId}` : null, () => loadBrands(categoryId!));
  const models = useAsync(brand && categoryId ? `m:${brand.brand_id}:${categoryId}` : null, () => loadModels(brand!.brand_id, categoryId!));
  const prices = useAsync(model ? `p:${model.id}` : null, () => loadPrices(model!.id));

  const category = categories.find((c) => c.id === categoryId);

  const rows = useMemo(() => {
    if (!categoryId) return [];
    const applicable = repairTypes.filter((r) => !r.category_ids.length || r.category_ids.includes(categoryId));
    return applicable.map((type) => ({
      type,
      prices: (prices.data ?? []).filter((p) => p.repair_type_id === type.id),
    }));
  }, [repairTypes, categoryId, prices.data]);

  const withPrice = rows.filter((r) => r.prices.some((p) => p.price !== null));
  const withoutPrice = rows.filter((r) => !r.prices.some((p) => p.price !== null));

  function reset() {
    setBrand(null);
    setModel(null);
  }

  return (
    <div className="card overflow-hidden shadow-(--shadow-card)">
      <div className="grid lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-7 border-b border-line p-5 sm:p-8 lg:border-b-0 lg:border-r">
          <Step n={1} title="Votre appareil">
            <CategoryTabs
              categories={categories}
              value={categoryId}
              compact
              onChange={(id) => {
                setCategoryId(id);
                reset();
              }}
            />
          </Step>
          <Step n={2} title="La marque">
            <BrandChooser
              brands={brands.data}
              loading={brands.loading}
              value={brand?.brand_id ?? null}
              onChange={(b) => {
                setBrand(b);
                setModel(null);
              }}
            />
          </Step>
          {brand ? (
            <Step n={3} title="Le modèle">
              <ModelSearch models={models.data} loading={models.loading} value={model?.id ?? null} onChange={setModel} brandName={brand.name} />
            </Step>
          ) : null}
        </div>

        <div className="bg-[#fbfbf8] p-5 sm:p-8" aria-live="polite">
          {!model ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
                <RepairIcon icon="search" className="size-6" />
              </span>
              <p className="mt-4 max-w-xs font-display text-lg font-bold">Choisissez votre appareil pour voir les tarifs</p>
              <p className="mt-2 max-w-xs text-sm text-muted">
                Modèle introuvable ?{" "}
                <Link href="/devis" className="font-semibold text-brand-strong underline underline-offset-4">
                  Décrivez-le dans une demande de devis
                </Link>
                .
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{category?.name}</p>
                  <h3 className="mt-1 text-2xl font-bold">
                    {brand?.name} {model.name}
                  </h3>
                </div>
                <button type="button" onClick={reset} className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
                  <RotateCcw className="size-3.5" aria-hidden /> Changer
                </button>
              </div>

              {prices.loading ? (
                <div className="mt-6">
                  <LoadingLine label="Chargement des tarifs…" />
                </div>
              ) : (
                <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-surface">
                  {[...withPrice, ...withoutPrice].map(({ type, prices: typePrices }) => {
                    const priced = typePrices.filter((p) => p.price !== null);
                    return (
                      <li key={type.id} className="flex items-center gap-3 px-4 py-3">
                        <RepairIcon icon={type.icon} className="size-5 shrink-0 text-brand-strong" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{type.name}</p>
                          {priced.some((p) => p.duration) ? (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                              <Clock className="size-3" aria-hidden /> {priced.find((p) => p.duration)?.duration}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          {priced.length ? (
                            priced.map((p) => (
                              <p key={p.id} className="whitespace-nowrap">
                                {p.quality ? <span className="mr-1.5 text-xs text-muted">{p.quality}</span> : null}
                                <span className="font-display text-[17px] font-extrabold">
                                  {p.price_is_from ? <span className="text-xs font-semibold text-muted">dès </span> : null}
                                  {formatMoney(p.price, currency)}
                                </span>
                              </p>
                            ))
                          ) : (
                            <span className="text-sm font-medium text-muted">Sur devis</span>
                          )}
                        </div>
                        <Link
                          href={`/devis?modele=${model.id}&reparation=${type.id}`}
                          className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong text-ink transition-colors hover:border-ink hover:bg-ink hover:text-white"
                          aria-label={`Demander un devis : ${type.name}`}
                        >
                          <ArrowUpRight className="size-4" aria-hidden />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <ButtonLink href={`/devis?modele=${model.id}`} icon={<ArrowRight className="size-4" />}>
                  Demander un devis
                </ButtonLink>
                {brand ? (
                  <Link href={`/reparation/${brand.slug}/${model.slug}`} className="text-sm font-semibold underline underline-offset-4">
                    Page du modèle
                  </Link>
                ) : null}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted">
                Tarifs indicatifs, main-d’œuvre comprise. Le prix final est confirmé après diagnostic, avant toute intervention.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2.5 text-[15px] font-bold">
        <span className="grid size-6 place-items-center rounded-full bg-brand-soft text-xs font-extrabold text-brand-dark">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}
