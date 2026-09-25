"use client";

import clsx from "clsx";
import { ArrowRight, ArrowUpRight, Clock, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { BrandMark, RepairIcon } from "@/components/icons";
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
import { BrandChooser, CategoryTabs, LoadingLine, ModelSearch, PickedChoice } from "./device-picker";

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
  const resultsRef = useRef<HTMLDivElement>(null);

  const brands = useAsync(categoryId ? `b:${categoryId}` : null, () => loadBrands(categoryId!));
  const models = useAsync(brand && categoryId ? `m:${brand.brand_id}:${categoryId}` : null, () => loadModels(brand!.brand_id, categoryId!));
  const prices = useAsync(model ? `p:${model.id}` : null, () => loadPrices(model!.id));

  const category = categories.find((c) => c.id === categoryId);

  // Seules les réparations chiffrées sont listées : une ligne « Sur devis » laisserait croire
  // qu’elle fait partie du devis demandé.
  const rows = useMemo(() => {
    if (!categoryId) return [];
    const list = prices.data ?? [];
    return repairTypes
      .filter((r) => !r.category_ids.length || r.category_ids.includes(categoryId))
      .map((type) => ({ type, prices: list.filter((p) => p.repair_type_id === type.id && p.price !== null) }))
      .filter((r) => r.prices.length);
  }, [repairTypes, categoryId, prices.data]);

  function reset() {
    setBrand(null);
    setModel(null);
  }

  function pickModel(next: PickerModel) {
    setModel(next);
    // Mobile : les tarifs s’affichent sous le sélecteur, on les amène à l’écran.
    if (matchMedia("(min-width: 1024px)").matches) return;
    const smooth = matchMedia("(prefers-reduced-motion: no-preference)").matches;
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" }));
  }

  return (
    <div className="card overflow-hidden shadow-(--shadow-card)">
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-6 border-b border-line p-5 sm:space-y-7 sm:p-8 lg:border-b-0 lg:border-r">
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
            {brand ? (
              <PickedChoice className="lg:hidden" onEdit={reset}>
                <BrandMark slug={brand.slug} name={brand.name} logoUrl={brand.logo_url} iconClassName="size-4.5" className="text-[15px]" />
              </PickedChoice>
            ) : null}
            <div className={clsx(brand && "max-lg:hidden")}>
              <BrandChooser
                brands={brands.data}
                loading={brands.loading}
                value={brand?.brand_id ?? null}
                onChange={(b) => {
                  setBrand(b);
                  setModel(null);
                }}
              />
            </div>
          </Step>
          {brand ? (
            <Step n={3} title="Le modèle">
              {model ? (
                <PickedChoice className="lg:hidden" onEdit={() => setModel(null)}>
                  {model.name}
                </PickedChoice>
              ) : null}
              <div className={clsx(model && "max-lg:hidden")}>
                <ModelSearch models={models.data} loading={models.loading} value={model?.id ?? null} onChange={pickModel} brandName={brand.name} />
              </div>
            </Step>
          ) : null}
        </div>

        <div ref={resultsRef} className="bg-bg p-5 sm:p-8" aria-live="polite">
          {!model ? (
            // Sur mobile, les étapes guident déjà : l’état vide se réduit au lien vers le devis.
            <div className="flex flex-col items-center justify-center text-center lg:h-full lg:min-h-64">
              <span className="hidden size-14 place-items-center rounded-2xl bg-brand-soft text-brand-strong lg:grid">
                <RepairIcon icon="search" className="size-6" />
              </span>
              <p className="mt-4 hidden max-w-xs font-display text-lg font-bold lg:block">Choisissez votre appareil pour voir les tarifs</p>
              <p className="max-w-xs text-sm text-muted lg:mt-2">
                Modèle introuvable ?{" "}
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
              ) : rows.length ? (
                <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-surface">
                  {rows.map(({ type, prices: priced }) => (
                    <li key={type.id} className="relative flex items-center gap-3 px-4 py-3">
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
                        {priced.map((p) => (
                          <p key={p.id} className="whitespace-nowrap">
                            {p.quality ? <span className="mr-1.5 text-xs text-muted">{p.quality}</span> : null}
                            <span className="font-display text-[17px] font-extrabold">
                              {p.price_is_from ? <span className="text-xs font-semibold text-muted">dès </span> : null}
                              {formatMoney(p.price, currency)}
                            </span>
                          </p>
                        ))}
                      </div>
                      <Link
                        href={`/devis?modele=${model.id}&reparation=${type.id}`}
                        className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong text-ink transition-colors after:absolute after:inset-0 hover:border-ink hover:bg-ink hover:text-on-fill"
                        aria-label={`Demander un devis : ${type.name}`}
                      >
                        <ArrowUpRight className="size-4" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-6 rounded-xl border border-line bg-surface p-5">
                  <p className="font-semibold">Pas encore de tarif en ligne pour ce modèle</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Décrivez la panne dans une demande de devis : nous vous répondons avec un prix précis, gratuitement et sans engagement.
                  </p>
                </div>
              )}
              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <ButtonLink href={`/devis?modele=${model.id}`} size="lg" className="sm:h-11 sm:px-4 sm:text-sm" icon={<ArrowRight className="size-4" />}>
                  Demander un devis
                </ButtonLink>
                {brand ? (
                  <Link href={`/reparation/${brand.slug}/${model.slug}`} className="self-center text-sm font-semibold underline underline-offset-4 sm:self-auto">
                    Page du modèle
                  </Link>
                ) : null}
              </div>
              {rows.length ? (
                <p className="mt-4 text-xs leading-relaxed text-muted">
                  Tarifs indicatifs, main-d’œuvre comprise. Le prix final est confirmé après diagnostic, avant toute intervention.
                </p>
              ) : null}
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
