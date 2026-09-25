import { CatalogTabs } from "@/components/admin/catalog-tabs";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { AddButtonSkeleton, ManagerListSkeleton } from "@/components/admin/skeletons";
import { SkeletonScreen } from "@/components/ui/skeleton";

export default function RepairTypesLoading() {
  return (
    <SkeletonScreen>
      <PageHeader title="Appareils & tarifs" description="Les réparations proposées : elles servent de lignes de tarifs pour chaque modèle.">
        <CatalogTabs active="reparations" />
      </PageHeader>
      <PageBody>
        <AddButtonSkeleton className="mb-4" />
        <ManagerListSkeleton rows={8} />
      </PageBody>
    </SkeletonScreen>
  );
}
