import { Suspense } from "react";
import { IgnoreReasonList } from "@/features/admin/components/IgnoreReasonList";
import { RuleFeedbackTable } from "@/features/admin/components/RuleFeedbackTable";
import { getFeedbackOverview } from "@/features/admin/services/feedback";
import { isAdmin, requireUser } from "@/lib/auth";
import { PageHeader } from "@/shared/ui/page-header";

export default function FeedbackPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        trail={[{ label: "관리" }, { label: "오탐 피드백" }]}
        title="오탐 피드백"
        description="모든 사용자의 점검 결과에서 AI 가 오탐으로 본 것과 사용자가 무시한 것을 규칙별로 모읍니다. 잡음 비율이 높은 규칙부터 손봅니다. 같은 문제가 스캔·커밋마다 반복돼도 한 건으로 셉니다."
      />
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Feedback />
      </Suspense>
    </main>
  );
}

async function Feedback() {
  const user = await requireUser();
  if (!isAdmin(user))
    return (
      <p role="alert" className="text-sm">
        관리자만 볼 수 있습니다.
      </p>
    );
  const { rules, reasons } = await getFeedbackOverview();
  return (
    <>
      <section className="flex flex-col gap-3" aria-labelledby="fb-rules">
        <h2 id="fb-rules" className="text-lg font-semibold">
          규칙별 잡음 비율
        </h2>
        <RuleFeedbackTable rules={rules} />
      </section>
      <section className="flex flex-col gap-3" aria-labelledby="fb-reasons">
        <h2 id="fb-reasons" className="text-lg font-semibold">
          최근 무시한 이유 (/lego ignore)
        </h2>
        <IgnoreReasonList reasons={reasons} />
      </section>
    </>
  );
}
