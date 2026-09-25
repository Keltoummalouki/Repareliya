import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { EmptyNote, RealisationCard, SectionHeading } from "@/components/site/blocks";
import { ButtonLink } from "@/components/ui/button";
import { getRealisations } from "@/lib/data/public";
import { isSupabaseConfigured } from "@/lib/env";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Nos réalisations",
  description: "Avant / après : découvrez des réparations de smartphones, tablettes et consoles réalisées dans notre atelier.",
};

export default async function RealisationsPage() {
  if (!isSupabaseConfigured()) return null; // le layout affiche déjà <SetupNotice />
  const items = await getRealisations();
  return (
    <div className="container-page py-10 sm:py-14">
      <SectionHeading
        eyebrow="Nos réalisations"
        title={<>L’atelier<br />en images.</>}
        text="Écrans remplacés, consoles remises en route, micro-soudures : quelques interventions récentes."
        action={
          <ButtonLink href="/devis" icon={<ArrowUpRight className="size-4" />}>
            Faire réparer mon appareil
          </ButtonLink>
        }
      />
      {items.length ? (
        <div data-reveal="stagger" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <RealisationCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyNote>Nos premières réalisations seront bientôt publiées.</EmptyNote>
      )}
    </div>
  );
}
