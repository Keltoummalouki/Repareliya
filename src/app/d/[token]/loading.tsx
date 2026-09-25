import clsx from "clsx";
import { repeat, Skeleton, SkeletonScreen, varyWidth } from "@/components/ui/skeleton";

// Page publique d’un devis ou d’une facture, ouverte depuis le lien envoyé au client.
export default function PublicDocumentLoading() {
  return (
    <SkeletonScreen className="min-h-screen bg-bg pb-16">
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Skeleton className="h-6 w-36" />
          <div className="flex gap-2">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="size-10 rounded-full" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 pt-8">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-4 h-9 w-72 max-w-full sm:h-10" />
        <Skeleton className="mt-3 h-4 w-52" />
        <div className="card mt-6 overflow-hidden">
          <div className="border-b border-line px-5 py-3.5">
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="divide-y divide-line">
            {repeat(3, (i) => (
              <div key={i} className="flex justify-between gap-4 px-5 py-4">
                <Skeleton className={clsx("h-4 max-w-[70%]", varyWidth(i + 1))} />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-line bg-bg px-5 py-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Skeleton className="h-13 w-full rounded-[10px] sm:w-52" />
          <Skeleton className="h-13 w-full rounded-[10px] sm:w-44" />
        </div>
      </div>
    </SkeletonScreen>
  );
}
