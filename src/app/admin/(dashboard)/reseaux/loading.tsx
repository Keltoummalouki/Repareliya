import { PageBody, PageHeader } from "@/components/admin/page-header";
import { AddButtonSkeleton, ManagerListSkeleton } from "@/components/admin/skeletons";
import { SkeletonScreen } from "@/components/ui/skeleton";

export default function SocialsLoading() {
  return (
    <SkeletonScreen>
      <PageHeader title="Réseaux sociaux" description="Liens affichés dans le pied de page et la page Contact." />
      <PageBody>
        <AddButtonSkeleton />
        <ManagerListSkeleton rows={4} />
      </PageBody>
    </SkeletonScreen>
  );
}
