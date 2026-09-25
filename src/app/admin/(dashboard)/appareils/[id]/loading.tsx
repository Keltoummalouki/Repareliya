import clsx from "clsx";
import { PageBody, Panel } from "@/components/admin/page-header";
import { PageHeaderSkeleton } from "@/components/admin/skeletons";
import { FieldSkeleton, repeat, Skeleton, SkeletonScreen, varyWidth } from "@/components/ui/skeleton";

export default function ModelLoading() {
  return (
    <SkeletonScreen>
      <PageHeaderSkeleton back actions={1} />
      <PageBody className="space-y-6">
        {/* PriceEditor */}
        <div className="card">
          <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="mt-2 h-3 w-72 max-w-full" />
            </div>
            <Skeleton className="h-11 w-36 rounded-[10px]" />
          </div>
          <div className="divide-y divide-line">
            {repeat(6, (i) => (
              <div
                key={i}
                className="grid grid-cols-2 items-center gap-2 px-5 py-4 lg:grid-cols-[minmax(160px,1.2fr)_minmax(110px,1fr)_120px_60px_100px_36px_36px]"
              >
                <div className="col-span-2 flex items-center gap-2 lg:col-span-1">
                  <Skeleton className="size-4 shrink-0 rounded" />
                  <Skeleton className={clsx("h-4 max-w-full", varyWidth(i + 2))} />
                </div>
                <Skeleton className="h-10 rounded-[10px]" />
                <Skeleton className="h-10 rounded-[10px]" />
                <Skeleton className="hidden h-5 w-9 rounded-full lg:block" />
                <Skeleton className="hidden h-10 rounded-[10px] lg:block" />
                <Skeleton className="hidden size-9 rounded-[10px] lg:block" />
                <Skeleton className="hidden size-9 rounded-[10px] lg:block" />
              </div>
            ))}
          </div>
        </div>
        <Panel title="Informations du modèle">
          <div className="grid gap-4 sm:grid-cols-2">
            {repeat(6, (i) => (
              <FieldSkeleton key={i} />
            ))}
          </div>
        </Panel>
      </PageBody>
    </SkeletonScreen>
  );
}
