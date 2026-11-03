import Link from "next/link";
import { Suspense } from "react";
import { SessionCardList } from "@/features/sessions/components/SessionCardList";
import { getMySessionCards } from "@/features/sessions/services/views";
import { buttonVariants } from "@/shared/ui/button";

export default function SessionsPage() {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">세션 회고</h1>
          <p className="text-muted-foreground text-sm">
            AI 코딩 대화를 올리면 잘 먹힌 프롬프트와 막힌 지점을 정리해 줍니다.
          </p>
        </div>
        <Link href="/sessions/new" className={buttonVariants()}>
          세션 올리기
        </Link>
      </div>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Sessions />
      </Suspense>
    </main>
  );
}

async function Sessions() {
  const sessions = await getMySessionCards();
  if (!sessions.ok) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {sessions.error.message}
      </p>
    );
  }
  return (
    <SessionCardList
      sessions={sessions.data}
      linkTo="mine"
      empty="아직 올린 세션이 없습니다."
    />
  );
}
