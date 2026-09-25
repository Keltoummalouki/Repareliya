import { ReviewCardSkeleton, SectionHeadingSkeleton } from "@/components/site/skeletons";
import { repeat, Skeleton, SkeletonScreen } from "@/components/ui/skeleton";

export default function AvisLoading() {
  return (
    <SkeletonScreen className="container-page py-10 sm:py-14">
      <SectionHeadingSkeleton />
      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        {repeat(2, (i) => (
          <div key={i} className="card flex items-center gap-5 p-6">
            <Skeleton className="h-12 w-20" />
            <div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-3.5 w-32" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {repeat(6, (i) => (
          <ReviewCardSkeleton key={i} />
        ))}
      </div>
    </SkeletonScreen>
  );
}
