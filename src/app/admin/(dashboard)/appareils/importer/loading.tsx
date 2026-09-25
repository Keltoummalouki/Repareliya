import { CatalogTabs } from "@/components/admin/catalog-tabs";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { FieldSkeleton, repeat, Skeleton, SkeletonScreen } from "@/components/ui/skeleton";

export default function ImportLoading() {
  return (
    <SkeletonScreen>
      <PageHeader
        title="Appareils & tarifs"
        description="Ajoutez en quelques clics tous les modèles d’une marque à partir de sources publiques et à jour."
      >
        <CatalogTabs active="importer" />
      </PageHeader>
      <PageBody>
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {repeat(2, (i) => (
              <div key={i} className="card p-5">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-5 rounded-md" />
                  <Skeleton className="h-5 w-44" />
                </div>
                <Skeleton className="mt-3 h-3.5" />
                <Skeleton className="mt-2 h-3.5 w-2/3" />
              </div>
            ))}
          </div>
          <div className="card flex flex-wrap items-end gap-3 p-4">
            <FieldSkeleton className="min-w-64 flex-1" />
            <Skeleton className="h-11 w-32 rounded-[10px]" />
          </div>
        </div>
      </PageBody>
    </SkeletonScreen>
  );
}
