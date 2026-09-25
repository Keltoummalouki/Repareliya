import { PageBody, Panel } from "@/components/admin/page-header";
import { PageHeaderSkeleton, RowsSkeleton } from "@/components/admin/skeletons";
import { repeat, Skeleton, SkeletonScreen } from "@/components/ui/skeleton";

export default function RequestLoading() {
  return (
    <SkeletonScreen>
      <PageHeaderSkeleton back actions={3} />
      <PageBody className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <Panel title="Demande">
            <div className="grid gap-4 sm:grid-cols-2">
              {repeat(2, (i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-2 h-4.5 w-40 max-w-full" />
                </div>
              ))}
              <div className="sm:col-span-2">
                <Skeleton className="h-3 w-40" />
                <div className="mt-2 flex gap-1.5">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            </div>
            <Skeleton className="mt-5 h-28 rounded-xl" />
          </Panel>
          <Panel title="Notes internes">
            <Skeleton className="h-24 rounded-[10px]" />
            <Skeleton className="mt-3 h-9 w-32 rounded-[10px]" />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Contacter le client">
            <Skeleton className="mb-4 h-4 w-60 max-w-full" />
            <div className="space-y-3">
              {repeat(3, (i) => (
                <div key={i} className="rounded-xl border border-line p-3.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-2 h-4.5 w-44 max-w-full" />
                  <div className="mt-2.5 flex gap-2">
                    <Skeleton className="h-9 w-20 rounded-[10px]" />
                    {i === 1 ? <Skeleton className="h-9 w-16 rounded-[10px]" /> : null}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Devis & factures liés" bodyClassName="p-0">
            <RowsSkeleton rows={2} trailing="amount" />
          </Panel>
        </div>
      </PageBody>
    </SkeletonScreen>
  );
}
