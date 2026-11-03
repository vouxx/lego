"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/shared/ui/button";
import { CopyButton } from "@/shared/ui/copy-button";
import { MarkdownPreview } from "@/shared/ui/markdown-preview";

type Props = { content: string; project: { id: string; name: string } | null };

/** 스펙으로 만든 CLAUDE.md 초안. 리포가 연결돼 있으면 2단계 생성기로 이어진다. */
export function ContextDraftPanel({ content, project }: Props) {
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "CLAUDE.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        {project
          ? `${project.name} 리포를 분석해 폴더 구조·명령어까지 넣으려면 프로젝트 규칙 파일에서 만드세요. 스펙 개요가 자동으로 들어갑니다.`
          : "아직 리포가 없어서 스펙과 기술 스택만으로 만든 초안입니다. 리포를 만든 뒤 루트에 넣어 주세요."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={download}>
          <Download /> CLAUDE.md 내려받기
        </Button>
        <CopyButton text={content} />
        {project ? (
          <Link
            href={`/projects/${project.id}/context`}
            className={buttonVariants({ size: "sm" })}
          >
            프로젝트 규칙 파일로 이어서 만들기
          </Link>
        ) : null}
      </div>
      <div className="rounded-md border p-4">
        <MarkdownPreview content={content} />
      </div>
    </div>
  );
}
