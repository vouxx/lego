import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteSessionButton } from "@/features/sessions/components/DeleteSessionButton";
import { SessionDetail } from "@/features/sessions/components/SessionDetail";
import { SessionStatusPanel } from "@/features/sessions/components/SessionStatusPanel";
import { VisibilityControl } from "@/features/sessions/components/VisibilityControl";
import { getMySessionDetail } from "@/features/sessions/services/views";

type Props = PageProps<"/sessions/[sessionId]">;

export default function SessionPage({ params }: Props) {
  return (
    <main className="flex max-w-4xl flex-col gap-6">
      <Link
        href="/sessions"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← 세션 회고
      </Link>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Session params={params} />
      </Suspense>
    </main>
  );
}

async function Session({ params }: Pick<Props, "params">) {
  const { sessionId } = await params;
  const result = await getMySessionDetail(sessionId);
  if (!result.ok) notFound();
  const { card } = result.data;
  return (
    <>
      <SessionStatusPanel
        sessionId={card.id}
        status={card.status}
        error={result.data.error}
        canRetry={result.data.canRetry}
      />
      <SessionDetail
        detail={result.data}
        canSave
        actions={
          <div className="flex flex-wrap items-start justify-between gap-3">
            <VisibilityControl
              sessionId={card.id}
              visibility={card.visibility}
              slug={card.slug}
              disabled={card.status !== "done"}
            />
            <DeleteSessionButton sessionId={card.id} />
          </div>
        }
      />
    </>
  );
}
