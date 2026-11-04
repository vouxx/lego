import { Suspense } from "react";
import { GuardProjectList } from "@/features/scans/components/GuardProjectList";
import { GuardReviewList } from "@/features/scans/components/GuardReviewList";
import { getGuardOverview } from "@/features/scans/services/pr-reviews";
import { PageHeader } from "@/shared/ui/page-header";

export default function GuardPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="PR 가드"
        description="AI 가 고친 PR 을 바뀐 줄만 점검해 GitHub 에 리뷰 코멘트와 상태 체크를 남깁니다. 보안 규칙 22개와 함께 테스트 삭제, 검사 끄기, RLS 약화, 문서에 없는 환경 변수, 이름을 흉내 낸 패키지를 찾습니다."
      />
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Overview />
      </Suspense>
    </main>
  );
}

async function Overview() {
  const { projects, reviews } = await getGuardOverview();
  return (
    <>
      <section className="flex flex-col gap-3" aria-labelledby="guard-recent">
        <h2 id="guard-recent" className="text-lg font-semibold">
          최근 점검한 PR
        </h2>
        <GuardReviewList reviews={reviews} />
      </section>
      <section className="flex flex-col gap-3" aria-labelledby="guard-projects">
        <h2 id="guard-projects" className="text-lg font-semibold">
          프로젝트별 설정
        </h2>
        <GuardProjectList projects={projects} />
      </section>
    </>
  );
}
