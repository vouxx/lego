import { Suspense } from "react";
import { LiveOverview } from "@/features/live/components/LiveOverview";
import { getLiveOverview } from "@/features/live/services/live";
import { PageHeader } from "@/shared/ui/page-header";

export default function LivePage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="운영 점검"
        description="배포된 사이트를 밖에서 공격자가 보는 그대로 확인합니다. 로그인 없이 읽히는 테이블·버킷, 배포된 JS 의 비밀 키, 보안 헤더, 열려 있는 .env·.git 을 소유 확인 뒤 하루 한 번 점검합니다."
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
  return <LiveOverview rows={await getLiveOverview()} />;
}
