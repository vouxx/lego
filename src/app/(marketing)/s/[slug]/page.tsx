import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LikeButton } from "@/features/sessions/components/LikeButton";
import { ReportButton } from "@/features/sessions/components/ReportButton";
import { SessionDetail } from "@/features/sessions/components/SessionDetail";
import {
  getSharedSession,
  getSharedSessionMeta,
} from "@/features/sessions/services/views";

type Props = PageProps<"/s/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const meta = await getSharedSessionMeta((await params).slug);
  // 본문은 스트리밍 중에 notFound 를 부르므로 상태 코드가 200 으로 나간다. 여기서 먼저 404 로 끝낸다.
  if (!meta) notFound();
  return {
    title: `${meta.title} · 레고 세션 회고`,
    description: meta.goal,
    robots: { index: false },
  };
}

export default function SharedSessionPage({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Shared params={params} />
      </Suspense>
    </main>
  );
}

async function Shared({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const session = await getSharedSession(slug);
  if (!session) notFound();
  const { card, viewer } = session;
  return (
    <SessionDetail
      detail={session}
      byline={session.author}
      canSave={viewer.loggedIn}
      saveLabel="내 템플릿으로 가져오기"
      actions={
        <div className="flex items-center gap-2">
          <LikeButton
            sessionId={card.id}
            slug={slug}
            liked={viewer.liked}
            count={card.likes}
            loggedIn={viewer.loggedIn}
          />
          {viewer.loggedIn && !viewer.isOwner ? (
            <ReportButton sessionId={card.id} />
          ) : null}
        </div>
      }
    />
  );
}
