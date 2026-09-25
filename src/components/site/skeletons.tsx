import clsx from "clsx";
import type { ReactNode } from "react";
import { FieldSkeleton, repeat, Skeleton, varyWidth } from "@/components/ui/skeleton";

/*
 * Squelettes du site public, utilisés par les loading.tsx de app/(site).
 * Chacun reprend la mise en page du composant réel qu’il remplace (mêmes grilles, mêmes
 * espacements) pour que la page ne saute pas à l’arrivée du contenu.
 * Aucun attribut data-reveal ici : seules les vraies pages sont animées par SiteMotion.
 */

/** SectionHeading (blocks.tsx) : sur-titre, titre sur deux lignes, texte et action facultatifs. */
export function SectionHeadingSkeleton({ text, action, className }: { text?: boolean; action?: boolean; className?: string }) {
  return (
    <div className={clsx("mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between", className)}>
      <div className="w-full max-w-2xl">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-5 h-8 w-4/5 max-w-sm sm:h-10" />
        <Skeleton className="mt-2.5 h-8 w-3/5 max-w-xs sm:h-10" />
        {text ? (
          <div className="mt-5 max-w-xl space-y-2">
            <Skeleton className="h-4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : null}
      </div>
      {action ? <Skeleton className="h-11 w-48 shrink-0 rounded-[10px]" /> : null}
    </div>
  );
}

/** Titre de page à gauche (devis, fiche modèle) : sur-titre, h1 sur deux lignes, paragraphe. */
export function PageIntroSkeleton() {
  return (
    <>
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-5 h-9 w-11/12 max-w-md sm:h-12" />
      <Skeleton className="mt-2.5 h-9 w-2/3 max-w-xs sm:h-12" />
      <div className="mt-6 max-w-md space-y-2">
        <Skeleton className="h-4" />
        <Skeleton className="h-4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </>
  );
}

export function BreadcrumbSkeleton({ className }: { className?: string }) {
  return <Skeleton className={clsx("h-4", className ?? "w-40")} />;
}

/** RealisationCard (blocks.tsx). */
export function RealisationCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="p-5">
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="mt-4 h-5 w-3/4" />
        <div className="mt-3 space-y-2">
          <Skeleton className="h-3.5" />
          <Skeleton className="h-3.5 w-5/6" />
        </div>
      </div>
    </div>
  );
}

/** AccessoryCard (blocks.tsx). */
export function AccessoryCardSkeleton() {
  return (
    <div className="card flex flex-col overflow-hidden">
      <Skeleton className="aspect-square rounded-none" />
      <div className="flex flex-1 flex-col p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-2.5 h-4 w-4/5" />
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** ReviewCard (blocks.tsx). */
export function ReviewCardSkeleton() {
  return (
    <div className="card flex h-full flex-col p-6">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-5 rounded-md" />
      </div>
      <div className="mt-5 flex-1 space-y-2">
        <Skeleton className="h-3.5" />
        <Skeleton className="h-3.5" />
        <Skeleton className="h-3.5 w-3/5" />
      </div>
      <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-1.5 h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

/** PriceEstimator : étapes à gauche, invitation à choisir un appareil à droite. */
export function PriceEstimatorSkeleton() {
  return (
    <div className="card overflow-hidden shadow-(--shadow-card)">
      <div className="grid lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-7 border-b border-line p-5 sm:p-8 lg:border-b-0 lg:border-r">
          <div>
            <StepTitleSkeleton />
            <div className="flex flex-wrap gap-2">
              {repeat(5, (i) => (
                <Skeleton key={i} className={clsx("h-10 rounded-xl", ["w-32", "w-28", "w-36", "w-28", "w-24"][i])} />
              ))}
            </div>
          </div>
          <div>
            <StepTitleSkeleton />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {repeat(8, (i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex min-h-64 flex-col items-center justify-center bg-bg p-5 text-center sm:p-8">
          <Skeleton className="size-14 rounded-2xl" />
          <Skeleton className="mt-5 h-5 w-64 max-w-full" />
          <Skeleton className="mt-3 h-4 w-52 max-w-full" />
        </div>
      </div>
    </div>
  );
}

function StepTitleSkeleton() {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <Skeleton className="size-6 rounded-full" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

/** DevisForm : appareil, réparations, coordonnées, bouton d’envoi. */
export function DevisFormSkeleton() {
  return (
    <div className="card divide-y divide-line">
      <FormSectionSkeleton>
        <div className="flex flex-wrap gap-2">
          {repeat(5, (i) => (
            <Skeleton key={i} className={clsx("h-11 rounded-xl", ["w-32", "w-28", "w-36", "w-28", "w-24"][i])} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {repeat(4, (i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      </FormSectionSkeleton>
      <FormSectionSkeleton>
        <div className="grid gap-2 sm:grid-cols-2">
          {repeat(6, (i) => (
            <Skeleton key={i} className="h-13 rounded-xl" />
          ))}
        </div>
      </FormSectionSkeleton>
      <FormSectionSkeleton>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {repeat(3, (i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-13 w-full rounded-[10px]" />
      </FormSectionSkeleton>
    </div>
  );
}

function FormSectionSkeleton({ children }: { children: ReactNode }) {
  return (
    <div className="p-5 sm:p-8">
      <Skeleton className="h-5 w-44" />
      <div className="mt-5">{children}</div>
    </div>
  );
}

/** Mentions légales, confidentialité : titre et intertitres suivis de paragraphes. */
export function LegalPageSkeleton() {
  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <Skeleton className="h-10 w-4/5 max-w-md" />
      <div className="mt-8">
        {repeat(3, (section) => (
          <div key={section} className="mt-8">
            <Skeleton className={clsx("h-6", varyWidth(section))} />
            <div className="mt-4 space-y-2.5">
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
