import { PriceEstimatorSkeleton, SectionHeadingSkeleton } from "@/components/site/skeletons";
import { repeat, Skeleton, SkeletonScreen } from "@/components/ui/skeleton";

// Squelette de l’accueil. Chaque autre page du site a son propre loading.tsx : celui-ci,
// placé à la racine du groupe, ne s’affiche donc que pour « / ».
export default function HomeLoading() {
  return (
    <SkeletonScreen>
      {/* Hero */}
      <section className="container-page grid items-center gap-10 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1.02fr_1fr] lg:gap-14 lg:pb-20">
        <div>
          <Skeleton className="h-3 w-72 max-w-full" />
          <div className="mt-7 space-y-3">
            <Skeleton className="h-10 w-11/12 sm:h-14 lg:h-16" />
            <Skeleton className="h-10 w-4/5 sm:h-14 lg:h-16" />
            <Skeleton className="h-10 w-3/5 sm:h-14 lg:h-16" />
          </div>
          <div className="mt-7 max-w-lg space-y-2.5">
            <Skeleton className="h-4.5" />
            <Skeleton className="h-4.5 w-4/5" />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Skeleton className="h-13 w-52 rounded-[10px]" />
            <Skeleton className="h-13 w-36 rounded-[10px]" />
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="aspect-[3/2] rounded-[22px]" />
      </section>

      {/* Types d’appareils */}
      <section className="border-y border-line bg-surface">
        <div className="container-page py-14 sm:py-20">
          <SectionHeadingSkeleton />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {repeat(5, (i) => (
              <div key={i} className="flex min-h-48 flex-col justify-between rounded-(--radius-card) border border-line bg-bg p-5">
                <div className="flex items-start justify-between">
                  <Skeleton className="size-12 rounded-xl" />
                  <Skeleton className="h-3 w-5" />
                </div>
                <div>
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="mt-2.5 h-3.5" />
                  <Skeleton className="mt-4 h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Estimateur */}
      <section className="container-page py-14 sm:py-20">
        <SectionHeadingSkeleton text action />
        <PriceEstimatorSkeleton />
      </section>
    </SkeletonScreen>
  );
}
