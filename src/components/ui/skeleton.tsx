import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * Bloc qui réserve la place d’un contenu en cours de chargement (voir .skeleton dans globals.css).
 * Un <span> en display block : il peut se placer dans un <p> ou un <h1> sans casser le HTML.
 */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={clsx("skeleton block", className)} />;
}

/** Enveloppe d’un écran de chargement : un seul message pour les lecteurs d’écran, les blocs restent muets. */
export function SkeletonScreen({ label = "Chargement…", className, children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <div aria-busy="true" className={className}>
      <p role="status" className="sr-only">
        {label}
      </p>
      {children}
    </div>
  );
}

/** Champ de formulaire : libellé puis .field-input (44 px). */
export function FieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-2.5 h-11 rounded-[10px]" />
    </div>
  );
}

/** Répète un squelette n fois (listes, grilles). */
export function repeat(count: number, render: (index: number) => ReactNode) {
  return Array.from({ length: count }, (_, index) => render(index));
}

/** Largeurs qui alternent d’une ligne à l’autre, pour éviter l’effet « code-barres ». */
const WIDTHS = ["w-40", "w-52", "w-32", "w-48", "w-36", "w-44", "w-28", "w-56"];
export const varyWidth = (index: number) => WIDTHS[index % WIDTHS.length];
