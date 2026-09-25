import clsx from "clsx";
import { DevisFormSkeleton, SectionHeadingSkeleton } from "@/components/site/skeletons";
import { repeat, Skeleton, SkeletonScreen, varyWidth } from "@/components/ui/skeleton";

export default function ContactLoading() {
  return (
    <SkeletonScreen className="container-page py-10 sm:py-14">
      <SectionHeadingSkeleton />
      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          {repeat(4, (i) => (
            <div key={i} className="card flex items-center gap-4 p-5">
              <Skeleton className="size-11 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className={clsx("mt-2 h-4 max-w-full", varyWidth(i + 1))} />
              </div>
            </div>
          ))}
          <div className="card p-5">
            <Skeleton className="h-4 w-24" />
            <div className="mt-4 space-y-2.5">
              {repeat(5, (i) => (
                <div key={i} className="flex justify-between gap-4">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <DevisFormSkeleton />
      </div>
    </SkeletonScreen>
  );
}
