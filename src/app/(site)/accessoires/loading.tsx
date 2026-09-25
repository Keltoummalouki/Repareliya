import clsx from "clsx";
import { AccessoryCardSkeleton, SectionHeadingSkeleton } from "@/components/site/skeletons";
import { repeat, Skeleton, SkeletonScreen } from "@/components/ui/skeleton";

export default function AccessoiresLoading() {
  return (
    <SkeletonScreen className="container-page py-10 sm:py-14">
      <SectionHeadingSkeleton text />
      <div className="mb-8 flex flex-wrap gap-2">
        {repeat(5, (i) => (
          <Skeleton key={i} className={clsx("h-9.5 rounded-full", ["w-16", "w-24", "w-28", "w-20", "w-32"][i])} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {repeat(8, (i) => (
          <AccessoryCardSkeleton key={i} />
        ))}
      </div>
    </SkeletonScreen>
  );
}
