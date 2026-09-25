import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/icons";
import { SectionHeading } from "@/components/site/blocks";
import { PriceEstimator } from "@/components/site/price-estimator";
import { getAllBrandsWithModels, getCategories, getRepairTypes, getSiteSettings } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Tarifs des réparations",
  description: "Consultez les tarifs de réparation de votre smartphone, tablette, ordinateur, console ou montre : écran, batterie, connecteur…",
};

export default async function TarifsPage({ searchParams }: PageProps<"/tarifs">) {
  const { categorie } = await searchParams;
  const [settings, categories, repairTypes, brands] = await Promise.all([
    getSiteSettings(),
    getCategories(),
    getRepairTypes(),
    getAllBrandsWithModels(),
  ]);
  const initial = categories.find((c) => c.slug === categorie)?.id ?? null;

  return (
    <div className="container-page py-10 sm:py-14">
      <SectionHeading
        eyebrow="Tarifs"
        title={<>Le prix de votre<br />réparation.</>}
        text="Sélectionnez votre appareil pour afficher nos tarifs. Pièce et main-d’œuvre comprises ; le prix est confirmé après diagnostic."
      />
      <PriceEstimator categories={categories} repairTypes={repairTypes} currency={settings.currency} initialCategoryId={initial} key={initial ?? "all"} />

      <section className="mt-16">
        <h2 className="text-2xl font-bold">Toutes les marques</h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {brands.map((brand) => (
            <li key={brand.id}>
              <Link
                href={`/reparation/${brand.slug}`}
                className="card flex h-full flex-col items-start justify-between gap-3 p-4 transition-colors hover:border-ink"
              >
                <BrandMark slug={brand.slug} name={brand.name} logoUrl={brand.logo_url} iconClassName="size-5" className="text-[16px]" />
                <span className="text-xs text-muted">{brand.count} modèle{brand.count > 1 ? "s" : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
