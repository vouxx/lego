import { Suspense } from "react";
import { UsageOverview } from "@/features/admin/components/UsageOverview";
import { getUsageOverview } from "@/features/admin/services/usage";
import { isAdmin, requireUser } from "@/lib/auth";
import { PageHeader } from "@/shared/ui/page-header";

export default function UsagePage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        trail={[{ label: "관리" }, { label: "사용 현황" }]}
        title="사용 현황"
        description="가입한 사람이 어디까지 쓰는지와 AI 비용을 봅니다. 요금과 한도를 정하는 근거입니다."
      />
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Usage />
      </Suspense>
    </main>
  );
}

async function Usage() {
  const user = await requireUser();
  if (!isAdmin(user))
    return (
      <p role="alert" className="text-sm">
        관리자만 볼 수 있습니다.
      </p>
    );
  return <UsageOverview overview={await getUsageOverview()} />;
}
