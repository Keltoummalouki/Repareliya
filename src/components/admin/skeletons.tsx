import clsx from "clsx";
import type { ReactNode } from "react";
import { FieldSkeleton, repeat, Skeleton, varyWidth } from "@/components/ui/skeleton";

/*
 * Squelettes du tableau de bord, utilisés par les loading.tsx de app/admin/(dashboard).
 * Quand le titre d’une page est fixe, le loading.tsx affiche le vrai <PageHeader> : seules
 * les données chargées sont remplacées par des blocs.
 */

/** PageHeader dont le titre dépend des données (fiche demande, document, modèle…). */
export function PageHeaderSkeleton({ back, actions = 0, children }: { back?: boolean; actions?: number; children?: ReactNode }) {
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-8 sm:py-6">
        {back ? <Skeleton className="mb-3 h-4 w-36" /> : null}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-7 w-64 max-w-full sm:h-8" />
            <Skeleton className="mt-2 h-4 w-80 max-w-full" />
          </div>
          {actions ? (
            <div className="flex flex-wrap gap-2">
              {repeat(actions, (i) => (
                <Skeleton key={i} className={clsx("h-9 rounded-[10px]", i ? "w-24" : "w-32")} />
              ))}
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Champ de recherche des en-têtes (boîte de réception, documents). */
export function SearchSkeleton() {
  return <Skeleton className="mt-5 h-[42px] max-w-md rounded-[10px]" />;
}

/** TabLinks, quand l’onglet actif ou les compteurs dépendent de la requête. */
export function TabsSkeleton({ count }: { count: number }) {
  return (
    <div className="mt-5 flex gap-1 overflow-hidden">
      {repeat(count, (i) => (
        <span key={i} className="shrink-0 px-3 pb-3 pt-1">
          <Skeleton className={clsx("h-4", ["w-20", "w-24", "w-16", "w-28", "w-20", "w-24", "w-16"][i % 7])} />
        </span>
      ))}
    </div>
  );
}

/** Lignes d’une liste (Panel en bodyClassName="p-0", ou carte divide-y). */
export function RowsSkeleton({ rows, dot, trailing = "badge" }: { rows: number; dot?: boolean; trailing?: "badge" | "amount" | "none" }) {
  return (
    <div className="divide-y divide-line">
      {repeat(rows, (i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3.5">
          {dot ? <Skeleton className="size-2 shrink-0 rounded-full" /> : null}
          <div className="min-w-0 flex-1">
            <Skeleton className={clsx("h-4 max-w-full", varyWidth(i))} />
            <Skeleton className={clsx("mt-2 h-3.5 max-w-full", varyWidth(i + 3))} />
          </div>
          {trailing === "badge" ? <Skeleton className="hidden h-5 w-20 shrink-0 rounded-full sm:block" /> : null}
          {trailing === "amount" ? (
            <div className="flex shrink-0 flex-col items-end">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-2 h-5 w-20 rounded-full" />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Tableau : `grid` porte le gabarit des colonnes (classe Tailwind littérale), `columns`
 * la largeur de chaque cellule, son alignement et sa forme (pill : badge de statut).
 */
export function TableSkeleton({
  grid,
  columns,
  rows = 8,
}: {
  grid: string;
  columns: { width: string; align?: "center" | "end"; pill?: boolean }[];
  rows?: number;
}) {
  const align = (a?: "center" | "end") => (a === "end" ? "ml-auto" : a === "center" ? "mx-auto" : undefined);
  return (
    <div className="card overflow-hidden">
      <div className={clsx("grid items-center gap-4 border-b border-line px-5 py-3.5", grid)}>
        {columns.map((column, i) => (
          <Skeleton key={i} className={clsx("h-3 w-3/5 max-w-16", align(column.align))} />
        ))}
      </div>
      <div className="divide-y divide-line">
        {repeat(rows, (row) => (
          <div key={row} className={clsx("grid items-center gap-4 px-5 py-3.5", grid)}>
            {columns.map((column, i) => (
              <Skeleton key={i} className={clsx(column.pill ? "h-5 rounded-full" : "h-4", column.width, align(column.align))} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Bouton « Ajouter » en haut à droite des gestionnaires (accessoires, avis, marques…). */
export function AddButtonSkeleton({ className = "mb-5" }: { className?: string }) {
  return (
    <div className={clsx("flex justify-end", className)}>
      <Skeleton className="h-9 w-28 rounded-[10px]" />
    </div>
  );
}

/** Liste d’éléments modifiables (marques, catégories, types de réparation, réseaux sociaux). */
export function ManagerListSkeleton({ rows, leading = "icon" }: { rows: number; leading?: "icon" | "logo" }) {
  return (
    <div className="card divide-y divide-line">
      {repeat(rows, (i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3">
          {leading === "logo" ? <Skeleton className="h-6 w-28 shrink-0 sm:w-36" /> : <Skeleton className="size-10 shrink-0 rounded-xl" />}
          <div className="min-w-0 flex-1">
            <Skeleton className={clsx("h-4 max-w-full", varyWidth(i))} />
            <Skeleton className={clsx("mt-2 h-3.5 max-w-full", varyWidth(i + 4))} />
          </div>
          <Skeleton className="size-9 shrink-0 rounded-[10px]" />
        </div>
      ))}
    </div>
  );
}

/** Grille de cartes illustrées (accessoires, réalisations). */
export function MediaGridSkeleton({ count, aspect, className }: { count: number; aspect: string; className: string }) {
  return (
    <div className={className}>
      {repeat(count, (i) => (
        <div key={i} className="card overflow-hidden">
          <Skeleton className={clsx("rounded-none", aspect)} />
          <div className="p-3.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-4 w-4/5" />
            <Skeleton className="mt-2.5 h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Section de formulaire de réglages : titre et aide à gauche, champs à droite. */
export function SettingsSectionSkeleton({ fields }: { fields: number }) {
  return (
    <div className="card grid gap-6 p-5 lg:grid-cols-[240px_1fr] lg:p-6">
      <div>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-2.5 h-3.5 w-full max-w-56" />
        <Skeleton className="mt-2 h-3.5 w-2/3" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {repeat(fields, (i) => (
          <FieldSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** DocumentEditor : client, prestations et conditions à gauche, totaux et envoi à droite. */
export function DocumentEditorSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div className="card p-5">
          <Skeleton className="h-5 w-20" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FieldSkeleton className="sm:col-span-2" />
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
        </div>
        <div className="card">
          <div className="border-b border-line px-5 py-4">
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="space-y-3 p-5">
            {repeat(3, (i) => (
              <div key={i} className="grid grid-cols-[1fr_64px_96px] gap-2">
                <Skeleton className="h-11 rounded-[10px]" />
                <Skeleton className="h-11 rounded-[10px]" />
                <Skeleton className="h-11 rounded-[10px]" />
              </div>
            ))}
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </div>
        <div className="card grid gap-4 p-5 sm:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
      </div>
      <div className="space-y-4">
        <div className="card space-y-3 p-5">
          {repeat(3, (i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
          <div className="flex justify-between border-t border-line pt-4">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-7 w-28" />
          </div>
          <Skeleton className="h-11 w-full rounded-[10px]" />
        </div>
        <div className="card p-5">
          <FieldSkeleton />
        </div>
      </div>
    </div>
  );
}
