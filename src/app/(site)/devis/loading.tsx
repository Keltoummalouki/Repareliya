import clsx from "clsx";
import { DevisFormSkeleton, PageIntroSkeleton } from "@/components/site/skeletons";
import { repeat, Skeleton, SkeletonScreen, varyWidth } from "@/components/ui/skeleton";

export default function DevisLoading() {
  return (
    <SkeletonScreen className="container-page py-10 sm:py-14">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.55fr] lg:gap-14">
        <div>
          <PageIntroSkeleton />
          <div className="mt-8 grid gap-5">
            {repeat(4, (i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Skeleton className={clsx("h-4 max-w-full", varyWidth(i))} />
                  <Skeleton className="mt-2 h-3.5 w-60 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <DevisFormSkeleton />
      </div>
    </SkeletonScreen>
  );
}
