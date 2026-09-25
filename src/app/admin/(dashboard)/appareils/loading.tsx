import { CatalogTabs } from "@/components/admin/catalog-tabs";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { TableSkeleton } from "@/components/admin/skeletons";
import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton";

export default function ModelsLoading() {
  return (
    <SkeletonScreen>
      <PageHeader
        title="Appareils & tarifs"
        description={<Skeleton className="my-0.5 h-4 w-96 max-w-full" />}
        actions={<Skeleton className="h-9 w-36 rounded-[10px]" />}
      >
        <CatalogTabs active="modeles" />
      </PageHeader>
      <PageBody>
        <div className="mb-5 flex flex-wrap gap-2">
          <Skeleton className="h-10 w-44 rounded-[10px]" />
          <Skeleton className="h-10 w-40 rounded-[10px]" />
          <Skeleton className="h-10 min-w-56 flex-1 rounded-[10px]" />
          <Skeleton className="h-10 w-20 rounded-[10px]" />
        </div>
        <TableSkeleton
          rows={12}
          grid="grid-cols-[16px_1.8fr_1fr_0.6fr_0.6fr_0.6fr]"
          columns={[
            { width: "w-4" },
            { width: "w-3/4" },
            { width: "w-2/3" },
            { width: "w-8", align: "center", pill: true },
            { width: "w-4", align: "center" },
            { width: "w-9", align: "center", pill: true },
          ]}
        />
      </PageBody>
    </SkeletonScreen>
  );
}
