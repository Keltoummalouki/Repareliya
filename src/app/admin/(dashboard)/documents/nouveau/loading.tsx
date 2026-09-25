import { PageBody } from "@/components/admin/page-header";
import { DocumentEditorSkeleton, PageHeaderSkeleton } from "@/components/admin/skeletons";
import { SkeletonScreen } from "@/components/ui/skeleton";

export default function NewDocumentLoading() {
  return (
    <SkeletonScreen>
      <PageHeaderSkeleton back />
      <PageBody>
        <DocumentEditorSkeleton />
      </PageBody>
    </SkeletonScreen>
  );
}
