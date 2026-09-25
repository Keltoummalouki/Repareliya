import { Plus } from "lucide-react";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { SearchSkeleton, TableSkeleton, TabsSkeleton } from "@/components/admin/skeletons";
import { ButtonLink } from "@/components/ui/button";
import { SkeletonScreen } from "@/components/ui/skeleton";

export default function DocumentsLoading() {
  return (
    <SkeletonScreen>
      <PageHeader
        title="Devis & factures"
        description="Créez, envoyez et suivez vos devis et factures."
        actions={
          <>
            <ButtonLink href="/admin/documents/nouveau?type=devis" size="sm" variant="outline" icon={<Plus className="size-4" />}>
              Devis
            </ButtonLink>
            <ButtonLink href="/admin/documents/nouveau?type=facture" size="sm" icon={<Plus className="size-4" />}>
              Facture
            </ButtonLink>
          </>
        }
      >
        <SearchSkeleton />
        <TabsSkeleton count={6} />
      </PageHeader>
      <PageBody>
        <TableSkeleton
          rows={10}
          grid="grid-cols-[1fr_1.3fr_0.9fr_0.8fr_1fr]"
          columns={[
            { width: "w-4/5" },
            { width: "w-3/4" },
            { width: "w-2/3" },
            { width: "w-3/4", align: "end" },
            { width: "w-4/5", align: "end", pill: true },
          ]}
        />
      </PageBody>
    </SkeletonScreen>
  );
}
