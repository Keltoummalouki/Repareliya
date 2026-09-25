import clsx from "clsx";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { SearchSkeleton, TabsSkeleton } from "@/components/admin/skeletons";
import { repeat, Skeleton, SkeletonScreen, varyWidth } from "@/components/ui/skeleton";

export default function InboxLoading() {
  return (
    <SkeletonScreen>
      <PageHeader title="Boîte de réception" description="Demandes de devis, messages et réservations envoyés depuis le site.">
        <SearchSkeleton />
        <TabsSkeleton count={7} />
      </PageHeader>
      <PageBody>
        <div className="card divide-y divide-line overflow-hidden">
          {repeat(8, (i) => (
            <div key={i} className="flex gap-4 px-4 py-4 sm:px-5">
              <Skeleton className="mt-1.5 size-2.5 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className={clsx("h-4.5 max-w-full", varyWidth(i))} />
                  <Skeleton className="h-3.5 w-10" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="mt-2.5 h-3.5 w-3/4" />
                <Skeleton className="mt-2.5 h-3 w-48 max-w-full" />
              </div>
              <Skeleton className="h-3 w-12 shrink-0" />
            </div>
          ))}
        </div>
      </PageBody>
    </SkeletonScreen>
  );
}
