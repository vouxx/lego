"use client";

import { ShieldCheck, Upload } from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useSessionUpload } from "../hooks/useSessionUpload";
import { SESSION_TOOLS, TOOL_LABELS, type SessionTool } from "../schemas";
import { MessageTimeline } from "./MessageTimeline";

type Props = { projects: { id: string; name: string }[] };

const PREVIEW_TURNS = 30;

export function SessionUploader({ projects }: Props) {
  const upload = useSessionUpload();
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const { prepared } = upload;

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void upload.load(file);
  };

  return (
    <div className="flex flex-col gap-5">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center text-sm",
          dragging && "border-primary bg-primary/5",
        )}
      >
        <Upload className="size-6" />
        <span className="font-medium">
          대화 로그 파일을 끌어다 놓거나 눌러서 고르세요
        </span>
        <span className="text-muted-foreground text-xs">
          Claude Code(.jsonl, ~/.claude/projects 아래), Cursor 내보내기(.md),
          일반 텍스트
        </span>
        <input
          type="file"
          accept=".jsonl,.json,.md,.txt,text/plain,application/json"
          aria-label="세션 로그 파일"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload.load(file);
          }}
        />
      </label>
      <p className="text-muted-foreground flex items-start gap-2 text-xs">
        <ShieldCheck className="size-4 shrink-0" />
        원본 로그는 서버로 보내지 않습니다. 브라우저에서 비밀값·이메일·홈 경로를
        가린 뒤, 아래 미리보기를 확인하고 올린 내용만 저장됩니다. 서버에서도 한
        번 더 검사합니다.
      </p>

      {prepared ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">{prepared.fileName}</span>
            <select
              aria-label="로그 형식"
              value={prepared.tool}
              onChange={(e) => upload.changeTool(e.target.value as SessionTool)}
              className="bg-background rounded-md border p-1.5"
            >
              {SESSION_TOOLS.map((t) => (
                <option key={t} value={t}>
                  {TOOL_LABELS[t]}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground">
              {prepared.stats.turns}턴 · 도구 {prepared.stats.toolCalls}번 ·
              가린 값 {prepared.maskedCount}개
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              aria-label="세션 제목"
              placeholder="제목 (비우면 AI 가 지어 줍니다)"
              value={title}
              maxLength={80}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select
              aria-label="연결할 프로젝트"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="bg-background rounded-md border p-2 text-sm"
            >
              <option value="">프로젝트 연결 안 함</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={upload.uploading}
              onClick={() =>
                upload.upload({
                  title: title.trim(),
                  projectId: projectId || null,
                })
              }
            >
              {upload.uploading ? "올리는 중…" : "확인했어요, 올리고 분석하기"}
            </Button>
            <Button
              variant="ghost"
              onClick={upload.reset}
              disabled={upload.uploading}
            >
              취소
            </Button>
          </div>
          <section aria-label="마스킹 미리보기" className="flex flex-col gap-2">
            <h2 className="font-semibold">올라갈 내용 미리보기</h2>
            <MessageTimeline
              messages={prepared.messages.slice(0, PREVIEW_TURNS)}
              total={prepared.messages.length}
            />
          </section>
        </div>
      ) : null}
      {upload.error ? (
        <p role="alert" className="text-destructive text-sm">
          {upload.error}
        </p>
      ) : null}
    </div>
  );
}
