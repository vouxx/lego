"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { CopyButton } from "@/shared/ui/copy-button";
import {
  regenerateTaskPromptAction,
  saveTaskTemplateAction,
  updateTaskStatusAction,
} from "../actions";
import type { SpecTaskView, TaskStatus } from "../schemas";

type Props = { task: SpecTaskView };

const NEXT: Record<TaskStatus, { status: TaskStatus; label: string } | null> = {
  todo: { status: "doing", label: "시작" },
  doing: { status: "done", label: "완료" },
  done: { status: "todo", label: "되돌리기" },
};

export function TaskCard({ task }: Props) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(task.prompt);
  const [note, setNote] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const next = NEXT[task.status];

  const run = (
    fn: () => Promise<{ ok: boolean; error?: { message: string } }>,
    done?: string,
  ) =>
    startTransition(async () => {
      setNote(null);
      const result = await fn();
      if (!result.ok) setNote(result.error?.message ?? "실패했습니다.");
      else {
        if (done) setNote(done);
        router.refresh();
      }
    });

  const regenerate = (tool: "claude_code" | "cursor") =>
    startTransition(async () => {
      setNote(null);
      const result = await regenerateTaskPromptAction({
        taskId: task.id,
        tool,
      });
      if (result.ok) setPrompt(result.data.prompt);
      else setNote(result.error.message);
    });

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold">
            <span className="text-muted-foreground mr-1.5 font-mono text-xs">
              {task.key}
            </span>
            {task.title}
          </h3>
          {task.locked && task.status !== "done" ? (
            <Lock
              className="text-muted-foreground size-4 shrink-0"
              aria-label={`선행 작업 ${task.dependsOn.join(", ")} 이 끝나야 합니다`}
            />
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">{task.description}</p>
        {task.dependsOn.length > 0 ? (
          <p className="text-muted-foreground text-xs">
            선행: {task.dependsOn.join(", ")}
          </p>
        ) : null}
        {task.doneCommit ? (
          <p className="text-muted-foreground text-xs">
            커밋 {task.doneCommit.slice(0, 7)} 으로 완료
          </p>
        ) : null}
        <details className="text-xs">
          <summary className="cursor-pointer">
            완료 조건 · 구현 프롬프트
          </summary>
          <ul className="mt-2 list-disc pl-4">
            {task.acceptanceCriteria.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <pre className="bg-muted mt-2 max-h-64 overflow-auto rounded p-2 whitespace-pre-wrap">
            {prompt || "프롬프트가 없습니다. 다시 만들어 주세요."}
          </pre>
          <div className="mt-2 flex flex-wrap gap-1">
            <Button
              size="xs"
              variant="ghost"
              disabled={isPending}
              onClick={() => regenerate("claude_code")}
            >
              Claude Code 용으로 다시
            </Button>
            <Button
              size="xs"
              variant="ghost"
              disabled={isPending}
              onClick={() => regenerate("cursor")}
            >
              Cursor 용으로 다시
            </Button>
            <Button
              size="xs"
              variant="ghost"
              disabled={isPending || !prompt}
              onClick={() =>
                run(
                  () => saveTaskTemplateAction({ taskId: task.id }),
                  "내 템플릿으로 저장했습니다.",
                )
              }
            >
              템플릿으로 저장
            </Button>
          </div>
        </details>
        <div className="flex flex-wrap gap-1">
          <CopyButton text={prompt} label="프롬프트 복사" size="xs" />
          {next ? (
            <Button
              size="xs"
              variant={task.status === "done" ? "ghost" : "outline"}
              disabled={isPending}
              onClick={() =>
                run(() =>
                  updateTaskStatusAction({
                    taskId: task.id,
                    status: next.status,
                  }),
                )
              }
            >
              {next.label}
            </Button>
          ) : null}
        </div>
        {note ? (
          <p className="text-muted-foreground text-xs" role="status">
            {note}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
