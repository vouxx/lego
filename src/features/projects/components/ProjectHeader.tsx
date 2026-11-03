import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/shared/ui/button";
import type { DetectedStack } from "@/shared/stack/schema";
import { StackTags } from "./StackTags";

type Props = {
  projectId: string;
  repoFullName: string;
  stack: DetectedStack | null;
  /** 오른쪽에 붙일 다른 기능의 버튼(예: 보안 점검 시작) */
  actions?: ReactNode;
};

export function ProjectHeader({
  projectId,
  repoFullName,
  stack,
  actions,
}: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold break-all">{repoFullName}</h1>
        {stack ? <StackTags tags={stack.tags} /> : null}
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <Link
          href={`/projects/${projectId}/context`}
          className={buttonVariants({ variant: "outline" })}
        >
          AI 규칙 파일
        </Link>
        {actions}
      </div>
    </div>
  );
}
