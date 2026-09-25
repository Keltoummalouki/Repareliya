import { PageBody, PageHeader } from "@/components/admin/page-header";
import { AddButtonSkeleton, MediaGridSkeleton } from "@/components/admin/skeletons";
import { SkeletonScreen } from "@/components/ui/skeleton";

export default function RealisationsAdminLoading() {
  return (
    <SkeletonScreen>
      <PageHeader title="Réalisations" description="Vos réparations en photos (avant / après), affichées sur l’accueil et la page Réalisations." />
      <PageBody>
        <AddButtonSkeleton />
        <MediaGridSkeleton count={6} aspect="aspect-[4/3]" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" />
      </PageBody>
    </SkeletonScreen>
  );
}
