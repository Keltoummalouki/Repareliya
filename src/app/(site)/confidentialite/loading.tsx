import { LegalPageSkeleton } from "@/components/site/skeletons";
import { SkeletonScreen } from "@/components/ui/skeleton";

export default function ConfidentialiteLoading() {
  return (
    <SkeletonScreen>
      <LegalPageSkeleton />
    </SkeletonScreen>
  );
}
