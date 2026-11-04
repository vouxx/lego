import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PrReviewScreen } from "@/features/scans/components/PrReviewScreen";
import { getPrReviewDetail } from "@/features/scans/services/pr-reviews";

type Props = PageProps<"/projects/[projectId]/reviews/[reviewId]">;

export default function PrReviewPage({ params }: Props) {
  return (
    <main className="flex max-w-4xl flex-col gap-6">
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Review params={params} />
      </Suspense>
    </main>
  );
}

async function Review({ params }: Pick<Props, "params">) {
  const { projectId, reviewId } = await params;
  const review = await getPrReviewDetail(reviewId);
  if (!review || review.projectId !== projectId) notFound();
  return <PrReviewScreen review={review} />;
}
