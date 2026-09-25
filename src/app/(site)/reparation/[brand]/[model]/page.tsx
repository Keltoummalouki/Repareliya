import type { Metadata } from "next";
import { ArrowUpRight, Clock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RepairIcon, WhatsappIcon } from "@/components/icons";
import { ButtonLink, ExternalButton } from "@/components/ui/button";
import { whatsappLink } from "@/lib/contact";
import { getModelPage, getRepairTypes, getSiteSettings } from "@/lib/data/public";
import { formatMoney } from "@/lib/format";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/reparation/[brand]/[model]">): Promise<Metadata> {
  const { brand, model } = await params;
  const page = await getModelPage(brand, model);
  if (!page) return {};
  const full = `${page.brand.name} ${page.model.name}`;
  return {
    title: `Réparation ${full} : écran, batterie, tarifs`,
    description: `Tarifs de réparation ${full} : écran, batterie, connecteur de charge, caméra… Devis gratuit en ligne.`,
  };
}

export default async function ModelPage({ params }: PageProps<"/reparation/[brand]/[model]">) {
  const { brand: brandSlug, model: modelSlug } = await params;
  const [page, repairTypes, settings] = await Promise.all([getModelPage(brandSlug, modelSlug), getRepairTypes(), getSiteSettings()]);
  if (!page) notFound();
  const { brand, model, prices } = page;
  const full = `${brand.name} ${model.name}`;
  const categoryId = model.category_id;
  const types = repairTypes.filter((t) => !t.category_ids.length || t.category_ids.includes(categoryId));
  const sorted = [
    ...types.filter((t) => prices.some((p) => p.repair_type_id === t.id && p.price !== null)),
    ...types.filter((t) => !prices.some((p) => p.repair_type_id === t.id && p.price !== null)),
  ];
  const whatsapp = whatsappLink(settings.whatsapp || settings.phone, `Bonjour, j’aimerais un devis pour mon ${full}.`, settings.default_country);

  return (
    <div className="container-page py-10 sm:py-14">
      <nav aria-label="Fil d’Ariane" className="text-sm text-muted">
        <Link href="/tarifs" className="hover:text-ink">Tarifs</Link> <span aria-hidden>/</span>{" "}
        <Link href={`/reparation/${brand.slug}`} className="hover:text-ink">{brand.name}</Link> <span aria-hidden>/</span>{" "}
        <span className="text-ink">{model.name}</span>
      </nav>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">{model.device_categories?.name}</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] sm:text-5xl">Réparation {full}</h1>
          <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
            Écran, batterie, connecteur de charge… Voici nos tarifs pour votre {full}. Le prix final est confirmé après diagnostic,
            avant toute intervention.
          </p>
          {model.image_url ? <img src={model.image_url} alt={full} className="mt-6 max-h-64 w-auto" /> : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={`/devis?modele=${model.id}`} icon={<ArrowUpRight className="size-4" />}>
              Demander un devis
            </ButtonLink>
            {whatsapp ? (
              <ExternalButton href={whatsapp} target="_blank" rel="noopener noreferrer" variant="whatsapp" icon={<WhatsappIcon className="size-5" />}>
                WhatsApp
              </ExternalButton>
            ) : null}
          </div>
        </div>
        <ul className="card divide-y divide-line self-start">
          {sorted.map((type) => {
            const typePrices = prices.filter((p) => p.repair_type_id === type.id && p.price !== null);
            return (
              <li key={type.id} className="flex items-center gap-4 p-4 sm:p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong">
                  <RepairIcon icon={type.icon} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold">{type.name}</h2>
                  {type.description ? <p className="mt-0.5 text-sm text-muted">{type.description}</p> : null}
                  {typePrices.find((p) => p.duration) ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <Clock className="size-3" aria-hidden /> {typePrices.find((p) => p.duration)?.duration}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  {typePrices.length ? (
                    typePrices.map((p) => (
                      <p key={p.id} className="whitespace-nowrap">
                        {p.quality ? <span className="mr-1.5 text-xs text-muted">{p.quality}</span> : null}
                        <span className="font-display text-lg font-extrabold">
                          {p.price_is_from ? <span className="text-xs font-semibold text-muted">dès </span> : null}
                          {formatMoney(p.price, settings.currency)}
                        </span>
                      </p>
                    ))
                  ) : (
                    <span className="text-sm font-medium text-muted">Sur devis</span>
                  )}
                  <Link href={`/devis?modele=${model.id}&reparation=${type.id}`} className="mt-1 block text-xs font-semibold text-brand-strong underline underline-offset-2">
                    Devis
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
