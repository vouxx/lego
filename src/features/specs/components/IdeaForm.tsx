"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { createSpecAction } from "../actions";

type Props = {
  projects: { id: string; name: string }[];
  defaultProjectId: string | null;
};

const EXAMPLES = [
  "중고책 거래 앱",
  "동네 헬스장 출석 체크",
  "팀 점심 메뉴 투표",
];

export function IdeaForm({ projects, defaultProjectId }: Props) {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSpecAction({
        idea,
        projectId: projectId || null,
      });
      if (result.ok) router.push(`/specs/${result.data.specId}`);
      else setError(result.error.message);
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="font-semibold">
          만들고 싶은 앱을 한 줄로 적어 주세요
        </span>
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="예: 대학생끼리 전공책을 사고파는 중고책 거래 앱"
          className="bg-background focus-visible:ring-ring/50 rounded-md border p-3 text-sm outline-none focus-visible:ring-3"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <Button
            key={example}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIdea(example)}
          >
            {example}
          </Button>
        ))}
      </div>
      {projects.length > 0 ? (
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">연결할 프로젝트 (선택)</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="bg-background rounded-md border p-2"
          >
            <option value="">아직 리포 없음</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground text-xs">
            연결하면 커밋 메시지의 [T-3] 같은 작업 ID 로 작업이 자동 완료되고,
            프로젝트 규칙 파일에 스펙 개요가 들어갑니다.
          </span>
        </label>
      ) : null}
      <Button type="submit" disabled={isPending || idea.trim().length < 2}>
        {isPending ? "확인 질문을 만드는 중…" : "다음: 확인 질문"}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </form>
  );
}
