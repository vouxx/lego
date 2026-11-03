import Link from "next/link";
import { Suspense } from "react";
import { ExplainForm } from "@/features/learn/components/ExplainForm";
import { MasteryList } from "@/features/learn/components/MasteryList";
import { RecentExplanations } from "@/features/learn/components/RecentExplanations";
import { getLearningHome } from "@/features/learn/services/views";
import { PageHeader } from "@/shared/ui/page-header";
import { buttonVariants } from "@/shared/ui/button";

export default function LearnPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="학습"
        description="AI 가 만든 코드를 내 수준에 맞춰 설명받고, 퀴즈로 이해했는지 확인합니다."
        actions={
          <Link
            href="/concepts"
            className={buttonVariants({ variant: "outline" })}
          >
            개념 사전
          </Link>
        }
      />
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Learning />
      </Suspense>
    </main>
  );
}

async function Learning() {
  const home = await getLearningHome();
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex flex-col gap-8">
        <ExplainForm projects={home.projects} />
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">최근 설명</h2>
          <RecentExplanations items={home.explanations} />
        </section>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">내가 배운 개념</h2>
        <MasteryList items={home.mastery} />
      </section>
    </div>
  );
}
