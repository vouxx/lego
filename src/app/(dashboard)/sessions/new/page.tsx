import { Suspense } from "react";
import { SessionUploader } from "@/features/sessions/components/SessionUploader";
import { getUploadProjects } from "@/features/sessions/services/views";

export default function NewSessionPage() {
  return (
    <main className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">세션 올리기</h1>
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
