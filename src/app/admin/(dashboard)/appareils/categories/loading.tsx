import { CatalogTabs } from "@/components/admin/catalog-tabs";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { AddButtonSkeleton, ManagerListSkeleton } from "@/components/admin/skeletons";
import { SkeletonScreen } from "@/components/ui/skeleton";

export default function CategoriesLoading() {
  return (
    <SkeletonScreen>
      <PageHeader title="Appareils & tarifs" description="Types d’appareils proposés sur le site.">
        <CatalogTabs active="categories" />
      </PageHeader>
      <PageBody>
        <AddButtonSkeleton className="mb-4" />
        <ManagerListSkeleton rows={5} />
      </PageBody>
    </SkeletonScreen>
  );
}
