import { Suspense } from "react";
import { SessionUploader } from "@/features/sessions/components/SessionUploader";
import { getUploadProjects } from "@/features/sessions/services/views";
import { PageHeader } from "@/shared/ui/page-header";

export default function NewSessionPage() {
  return (
    <main className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        trail={[{ href: "/sessions", label: "세션 회고" }, { label: "올리기" }]}
        title="세션 올리기"
        description="원본 로그는 브라우저에서만 읽고, 가린 내용만 올라갑니다."
      />
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Uploader />
      </Suspense>
    </main>
  );
}

async function Uploader() {
  return <SessionUploader projects={await getUploadProjects()} />;
}
