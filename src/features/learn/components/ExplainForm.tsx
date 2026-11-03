"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { explainFileAction, explainPasteAction } from "../actions";
import { MAX_CODE_CHARS, type Level } from "../schemas";
import { LevelSelect } from "./LevelSelect";

type Props = { projects: { id: string; name: string }[] };

export function ExplainForm({ projects }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [level, setLevel] = useState<Level>("beginner");
  const [code, setCode] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [path, setPath] = useState("");
  const [lines, setLines] = useState({ start: 1, end: 80 });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result =
        mode === "paste"
          ? await explainPasteAction({ code, level })
          : await explainFileAction({
              projectId,
              path,
              startLine: lines.start,
              endLine: lines.end,
              level,
            });
      if (result.ok) router.push(`/learn/${result.data.explanationId}`);
      else setError(result.error.message);
    });
  };

  const tab = (id: "paste" | "file", label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === id}
      onClick={() => setMode(id)}
      className={cn(
        "-mb-px border-b-2 px-3 py-2 text-sm",
        mode === id
          ? "border-primary font-medium"
          : "text-muted-foreground border-transparent",
      )}
    >
      {label}
    </button>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div role="tablist" className="flex gap-1 border-b">
        {tab("paste", "코드 붙여넣기")}
        {projects.length > 0 ? tab("file", "리포 파일") : null}
      </div>
      {mode === "paste" ? (
        <textarea
          aria-label="설명할 코드"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={MAX_CODE_CHARS}
          rows={12}
          placeholder="AI 가 만든 코드를 붙여넣어 주세요."
          className="bg-background rounded-md border p-3 font-mono text-xs"
        />
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          <select
            aria-label="프로젝트"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="bg-background rounded-md border p-2"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Input
            aria-label="파일 경로"
            placeholder="파일 경로 (예: src/app/api/posts/route.ts)"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Input
              aria-label="시작 줄"
              type="number"
              min={1}
              value={lines.start}
              onChange={(e) =>
                setLines((l) => ({ ...l, start: Number(e.target.value) }))
              }
              className="w-24"
            />
            <span>~</span>
            <Input
              aria-label="끝 줄"
              type="number"
              min={1}
              value={lines.end}
              onChange={(e) =>
                setLines((l) => ({ ...l, end: Number(e.target.value) }))
              }
              className="w-24"
            />
            <span className="text-muted-foreground">줄 (기본 브랜치 기준)</span>
          </div>
        </div>
      )}
      <LevelSelect value={level} onChange={setLevel} />
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "설명을 만드는 중… (20~40초)" : "설명해 줘"}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </form>
  );
}
