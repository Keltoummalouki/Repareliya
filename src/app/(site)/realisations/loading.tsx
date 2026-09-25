import { RealisationCardSkeleton, SectionHeadingSkeleton } from "@/components/site/skeletons";
import { repeat, SkeletonScreen } from "@/components/ui/skeleton";

export default function RealisationsLoading() {
  return (
    <SkeletonScreen className="container-page py-10 sm:py-14">
      <SectionHeadingSkeleton text action />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {repeat(6, (i) => (
          <RealisationCardSkeleton key={i} />
        ))}
      </div>
    </SkeletonScreen>
  );
}
