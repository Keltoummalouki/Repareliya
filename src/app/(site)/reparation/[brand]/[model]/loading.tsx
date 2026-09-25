import clsx from "clsx";
import { BreadcrumbSkeleton, PageIntroSkeleton } from "@/components/site/skeletons";
import { repeat, Skeleton, SkeletonScreen, varyWidth } from "@/components/ui/skeleton";

export default function ModelLoading() {
  return (
    <SkeletonScreen className="container-page py-10 sm:py-14">
      <BreadcrumbSkeleton className="w-56" />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <PageIntroSkeleton />
          <div className="mt-8 flex flex-wrap gap-3">
            <Skeleton className="h-11 w-48 rounded-[10px]" />
            <Skeleton className="h-11 w-36 rounded-[10px]" />
          </div>
        </div>
        <div className="card divide-y divide-line self-start">
          {repeat(6, (i) => (
            <div key={i} className="flex items-center gap-4 p-4 sm:p-5">
              <Skeleton className="size-11 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <Skeleton className={clsx("h-4 max-w-full", varyWidth(i + 2))} />
                <Skeleton className="mt-2 h-3.5 w-48 max-w-full" />
              </div>
              <div className="flex flex-col items-end">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="mt-2 h-3 w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}
