import { CatalogTabs } from "@/components/admin/catalog-tabs";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { AddButtonSkeleton, ManagerListSkeleton } from "@/components/admin/skeletons";
import { SkeletonScreen } from "@/components/ui/skeleton";

export default function BrandsLoading() {
  return (
    <SkeletonScreen>
      <PageHeader title="Appareils & tarifs" description="Marques affichées dans les sélecteurs et sur l’accueil.">
        <CatalogTabs active="marques" />
      </PageHeader>
      <PageBody>
        <AddButtonSkeleton className="mb-4" />
        <ManagerListSkeleton rows={10} leading="logo" />
      </PageBody>
    </SkeletonScreen>
  );
}
