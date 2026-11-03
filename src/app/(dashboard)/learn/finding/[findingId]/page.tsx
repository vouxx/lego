import { z } from "zod";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExplainFindingStarter } from "@/features/learn/components/ExplainFindingStarter";
import { PageHeader } from "@/shared/ui/page-header";

type Props = PageProps<"/learn/finding/[findingId]">;

export default function ExplainFindingPage({ params }: Props) {
  return (
    <main className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        trail={[{ href: "/learn", label: "학습" }, { label: "점검 결과 설명" }]}
        title="이게 뭐예요?"
        description="보안 점검에서 나온 코드를 설명하고, 관련 개념과 퀴즈로 이어집니다."
      />
      <Suspense>
        <Starter params={params} />
      </Suspense>
    </main>
  );
}

async function Starter({ params }: Pick<Props, "params">) {
  const { findingId } = await params;
  if (!z.uuid().safeParse(findingId).success) notFound();
  return <ExplainFindingStarter findingId={findingId} />;
}
