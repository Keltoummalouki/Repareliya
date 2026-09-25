import { PageBody, PageHeader } from "@/components/admin/page-header";
import { SettingsSectionSkeleton } from "@/components/admin/skeletons";
import { repeat, Skeleton, SkeletonScreen } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <SkeletonScreen>
      <PageHeader title="Paramètres" description="Informations de l’atelier, facturation et compte." />
      <PageBody className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {repeat(2, (i) => (
            <div key={i} className="card flex items-center gap-3 p-4">
              <Skeleton className="size-5 shrink-0 rounded-md" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
        <SettingsSectionSkeleton fields={8} />
        <SettingsSectionSkeleton fields={6} />
        <SettingsSectionSkeleton fields={2} />
      </PageBody>
    </SkeletonScreen>
  );
}
