import { z } from "zod";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExplainFindingStarter } from "@/features/learn/components/ExplainFindingStarter";

type Props = PageProps<"/learn/finding/[findingId]">;

export default function ExplainFindingPage({ params }: Props) {
  return (
    <main className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">이게 뭐예요?</h1>
        <p className="text-muted-foreground text-sm">
          보안 점검에서 나온 코드를 설명하고, 관련 개념과 퀴즈로 이어집니다.
        </p>
      </div>
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
