import Link from "next/link";
import { PageBody, PageHeader, Panel } from "@/components/admin/page-header";
import { RowsSkeleton } from "@/components/admin/skeletons";
import { ButtonLink } from "@/components/ui/button";
import { repeat, Skeleton, SkeletonScreen } from "@/components/ui/skeleton";

// Squelette de la vue d’ensemble. Chaque autre page du tableau de bord a son propre
// loading.tsx : celui-ci, placé à la racine du groupe, ne s’affiche donc que pour /admin.
export default function AdminHomeLoading() {
  return (
    <SkeletonScreen>
      <PageHeader
        title="Vue d’ensemble"
        description={<Skeleton className="my-0.5 h-4 w-44" />}
        actions={
          <>
            <ButtonLink href="/admin/documents/nouveau?type=devis" variant="outline" size="sm">
              Nouveau devis
            </ButtonLink>
            <ButtonLink href="/admin/documents/nouveau?type=facture" size="sm">
              Nouvelle facture
            </ButtonLink>
          </>
        }
      />
      <PageBody className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {repeat(4, (i) => (
            <div key={i} className="card p-5">
              <Skeleton className="size-5 rounded-md" />
              <Skeleton className="mt-4 h-7 w-24" />
              <Skeleton className="mt-2 h-3.5 w-40 max-w-full" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Panel
            title="Dernières demandes"
            bodyClassName="p-0"
            actions={
              <Link href="/admin/inbox" className="text-sm font-semibold text-brand-strong">
                Tout voir
              </Link>
            }
          >
            <RowsSkeleton rows={8} dot />
          </Panel>
          <Panel
            title="Derniers documents"
            bodyClassName="p-0"
            actions={
              <Link href="/admin/documents" className="text-sm font-semibold text-brand-strong">
                Tout voir
              </Link>
            }
          >
            <RowsSkeleton rows={6} trailing="amount" />
          </Panel>
        </div>
      </PageBody>
    </SkeletonScreen>
  );
}
