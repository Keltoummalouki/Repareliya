import clsx from "clsx";
import { BreadcrumbSkeleton } from "@/components/site/skeletons";
import { repeat, Skeleton, SkeletonScreen, varyWidth } from "@/components/ui/skeleton";

export default function BrandLoading() {
  return (
    <SkeletonScreen className="container-page py-10 sm:py-14">
      <BreadcrumbSkeleton className="w-36" />
      <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="w-full max-w-xl">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="mt-5 h-10 w-4/5 max-w-sm sm:h-12" />
          <Skeleton className="mt-4 h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-11 w-48 shrink-0 rounded-[10px]" />
      </div>
      {repeat(2, (section) => (
        <section key={section} className="mt-12">
          <Skeleton className="h-6 w-32" />
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {repeat(section ? 4 : 8, (i) => (
              <div key={i} className="card flex items-center justify-between gap-3 px-4 py-3.5">
                <Skeleton className={clsx("h-4 max-w-[75%]", varyWidth(i))} />
                <Skeleton className="size-4 shrink-0" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </SkeletonScreen>
  );
}
