import { PriceEstimatorSkeleton, SectionHeadingSkeleton } from "@/components/site/skeletons";
import { repeat, Skeleton, SkeletonScreen } from "@/components/ui/skeleton";

export default function TarifsLoading() {
  return (
    <SkeletonScreen className="container-page py-10 sm:py-14">
      <SectionHeadingSkeleton text />
      <PriceEstimatorSkeleton />
      <section className="mt-16">
        <Skeleton className="h-7 w-56" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {repeat(10, (i) => (
            <div key={i} className="card flex flex-col gap-3 p-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </section>
    </SkeletonScreen>
  );
}
