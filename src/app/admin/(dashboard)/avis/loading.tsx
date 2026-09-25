import clsx from "clsx";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { AddButtonSkeleton, TabsSkeleton } from "@/components/admin/skeletons";
import { repeat, Skeleton, SkeletonScreen, varyWidth } from "@/components/ui/skeleton";

export default function ReviewsAdminLoading() {
  return (
    <SkeletonScreen>
      <PageHeader title="Avis clients" description="Validez les avis déposés sur le site, répondez-y ou ajoutez ceux reçus ailleurs.">
        <TabsSkeleton count={3} />
      </PageHeader>
      <PageBody>
        <AddButtonSkeleton />
        <div className="space-y-3">
          {repeat(4, (i) => (
            <div key={i} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className={clsx("h-4", varyWidth(i + 6))} />
                <Skeleton className="h-3.5 w-20" />
              </div>
              <div className="mt-3.5 space-y-2">
                <Skeleton className="h-3.5" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {repeat(3, (j) => (
                  <Skeleton key={j} className="h-9 w-24 rounded-[10px]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </PageBody>
    </SkeletonScreen>
  );
}
