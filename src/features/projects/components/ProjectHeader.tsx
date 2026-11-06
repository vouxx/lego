import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/shared/ui/page-header";
import type { DetectedStack } from "@/shared/stack/schema";
import { StackTags } from "./StackTags";
import { DeleteButton } from "@/shared/ui/delete-button";
import { Badge } from "@/shared/ui/badge";
import { deleteProjectAction } from "../actions";

type Props = {
  projectId: string;
  repoFullName: string;
  stack: DetectedStack | null;
  /** 보안 점검 시작 버튼(scans 기능) */
  scanAction?: ReactNode;
  /** 있으면 초대받은 멤버 화면: 도구 없이 이 동작(나가기)만 보여 준다 */
  viewerAction?: ReactNode;
};

/** 프로젝트 머리말과 이 리포에서 쓰는 도구 네 칸. */
export function ProjectHeader({
  projectId,
  repoFullName,
  stack,
  scanAction,
  viewerAction,
}: Props) {
  if (viewerAction) {
    return (
      <div className="flex flex-col gap-3">
        <PageHeader
          trail={[
            { href: "/projects", label: "프로젝트" },
            { label: repoFullName },
          ]}
          title={<span className="font-mono">{repoFullName}</span>}
          description={stack ? <StackTags tags={stack.tags} /> : null}
          actions={viewerAction}
        />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="secondary">보기 전용</Badge>
          <Link
            href={`/projects/${projectId}/live`}
            className="font-medium hover:underline"
          >
            운영 점검 결과 보기 →
          </Link>
        </div>
      </div>
    );
  }
  const tools = [
    {
      command: "scan",
      title: "보안 점검",
      text: "실수 22가지를 찾고 수정 프롬프트를 드립니다.",
      action: scanAction,
    },
    {
      command: "context",
      title: "AI 규칙 파일",
      text: "CLAUDE.md · .cursorrules · AGENTS.md 를 만듭니다.",
      href: `/projects/${projectId}/context`,
    },
    {
      command: "live",
      title: "운영 점검",
      text: "배포된 사이트를 밖에서 공격자처럼 확인합니다.",
      href: `/projects/${projectId}/live`,
    },
    {
      command: "spec",
      title: "스펙",
      text: "이 리포에서 만들 기능을 작업으로 나눕니다.",
      href: `/specs/new?projectId=${projectId}`,
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        trail={[
          { href: "/projects", label: "프로젝트" },
          { label: repoFullName },
        ]}
        title={<span className="font-mono">{repoFullName}</span>}
        description={stack ? <StackTags tags={stack.tags} /> : null}
        actions={
          <DeleteButton
            action={deleteProjectAction.bind(null, { projectId })}
            redirectTo="/projects"
            label="프로젝트 지우기"
            confirmText={`${repoFullName} 프로젝트를 지웁니다. 점검 기록과 규칙 파일도 같이 지워지고, GitHub 리포는 그대로입니다.`}
          />
        }
      />
      <ul className="bg-border grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((tool) => (
          <li
            key={tool.command}
            className="bg-background flex flex-col gap-2 p-4"
          >
            <code className="text-muted-foreground font-mono text-xs">
              lego {tool.command}
            </code>
            <p className="font-semibold">{tool.title}</p>
            <p className="text-muted-foreground text-sm break-keep">
              {tool.text}
            </p>
            <div className="mt-auto pt-1">
              {tool.href ? (
                <Link
                  href={tool.href}
                  className="text-sm font-medium hover:underline"
                >
                  {tool.title} 열기 →
                </Link>
              ) : (
                tool.action
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
