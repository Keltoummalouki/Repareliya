import type { Metadata } from "next";
import clsx from "clsx";
import Link from "next/link";
import { AccessoryCard, EmptyNote, SectionHeading } from "@/components/site/blocks";
import { getAccessories, getSiteSettings } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Accessoires",
  description: "Coques, protections d’écran, chargeurs, câbles et accessoires pour smartphones, tablettes et consoles. Réservez en ligne.",
};

export default async function AccessoiresPage({ searchParams }: PageProps<"/accessoires">) {
  const { categorie } = await searchParams;
  const [settings, accessories] = await Promise.all([getSiteSettings(), getAccessories()]);
  const categories = [...new Set(accessories.map((a) => a.category))].sort((a, b) => a.localeCompare(b, "fr"));
  const active = typeof categorie === "string" && categories.includes(categorie) ? categorie : null;
  const list = active ? accessories.filter((a) => a.category === active) : accessories;

  return (
    <div className="container-page py-10 sm:py-14">
      <SectionHeading
        eyebrow="Boutique"
        title={<>Accessoires<br />pour vos appareils.</>}
        text="Réservez en ligne : nous confirmons la disponibilité et gardons l’article de côté pour vous."
      />
      {categories.length > 1 ? (
        <nav aria-label="Catégories d’accessoires" className="mb-8 flex flex-wrap gap-2">
          <FilterLink href="/accessoires" active={!active}>Tout</FilterLink>
          {categories.map((c) => (
            <FilterLink key={c} href={`/accessoires?categorie=${encodeURIComponent(c)}`} active={active === c}>
              {c}
            </FilterLink>
          ))}
        </nav>
      ) : null}
      {list.length ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {list.map((item) => (
            <AccessoryCard key={item.id} item={item} currency={settings.currency} />
          ))}
        </div>
      ) : (
        <EmptyNote>Les accessoires arrivent bientôt. Passez nous voir ou contactez-nous pour connaître le stock.</EmptyNote>
      )}
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active ? "border-ink bg-ink text-on-fill" : "border-line-strong bg-surface hover:border-ink",
      )}
    >
      {children}
    </Link>
  );
}
