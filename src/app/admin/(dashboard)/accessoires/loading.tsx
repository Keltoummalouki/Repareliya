import { PageBody, PageHeader } from "@/components/admin/page-header";
import { AddButtonSkeleton, MediaGridSkeleton } from "@/components/admin/skeletons";
import { SkeletonScreen } from "@/components/ui/skeleton";

export default function AccessoriesLoading() {
  return (
    <SkeletonScreen>
      <PageHeader title="Accessoires" description="La boutique du site : les clients peuvent réserver un article, la demande arrive dans la boîte de réception." />
      <PageBody>
        <AddButtonSkeleton />
        <MediaGridSkeleton count={8} aspect="aspect-square" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4" />
      </PageBody>
    </SkeletonScreen>
  );
}
