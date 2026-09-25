import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { getBrandBySlug, getModelsForBrand, getSiteSettings } from "@/lib/data/public";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/reparation/[brand]">): Promise<Metadata> {
  const { brand: slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return {};
  const settings = await getSiteSettings();
  return {
    title: `Réparation ${brand.name}${settings.city ? ` à ${settings.city}` : ""}`,
    description: `Réparation de votre appareil ${brand.name} : écran, batterie, connecteur de charge… Tarifs et devis en ligne.`,
  };
}

export default async function BrandPage({ params }: PageProps<"/reparation/[brand]">) {
  const { brand: slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();
  const models = await getModelsForBrand(brand.id);

  const groups = new Map<string, { name: string; models: typeof models }>();
  for (const model of models) {
    const key = model.device_categories?.slug ?? "autres";
    const group = groups.get(key) ?? { name: model.device_categories?.name ?? "Autres", models: [] };
    group.models.push(model);
    groups.set(key, group);
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <nav aria-label="Fil d’Ariane" className="text-sm text-muted">
        <Link href="/tarifs" className="hover:text-ink">Tarifs</Link> <span aria-hidden>/</span> <span className="text-ink">{brand.name}</span>
      </nav>
      <div data-reveal="heading" className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <BrandMark slug={brand.slug} name={brand.name} logoUrl={brand.logo_url} iconClassName="size-9" className="text-2xl" />
          <h1 className="mt-5 text-4xl font-extrabold sm:text-5xl">Réparation {brand.name}</h1>
          <p className="mt-3 max-w-xl text-ink-soft">Choisissez votre modèle pour voir les réparations et les tarifs.</p>
        </div>
        <ButtonLink href="/devis" icon={<ArrowRight className="size-4" />}>
          Demander un devis
        </ButtonLink>
      </div>

      {[...groups.entries()].map(([key, group]) => (
        <section key={key} className="mt-12">
          <h2 className="text-xl font-bold">{group.name}</h2>
          <ul data-reveal="stagger" className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {group.models.map((model) => (
              <li key={model.id}>
                <Link
                  href={`/reparation/${brand.slug}/${model.slug}`}
                  className="card flex items-center justify-between gap-3 px-4 py-3 text-[15px] font-medium transition-colors hover:border-ink"
                >
                  <span>{model.name}</span>
                  <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!models.length ? <p className="mt-10 text-muted">Aucun modèle n’est encore listé pour cette marque.</p> : null}
    </div>
  );
}
