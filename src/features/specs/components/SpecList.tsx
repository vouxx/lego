import Link from "next/link";
import { formatDateTime } from "@/shared/lib/format";
import { buttonVariants } from "@/shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import type { SpecStatus, SpecSummary } from "../schemas";

type Props = { specs: SpecSummary[] };

const STATUS_LABELS: Record<SpecStatus, string> = {
  questions: "질문 답변 대기",
  generating: "만드는 중",
  ready: "완성",
  failed: "실패",
};

export function SpecList({ specs }: Props) {
  if (specs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>아직 스펙이 없습니다</CardTitle>
          <CardDescription>
            한 줄 아이디어로 PRD, 데이터 모델, 화면, 작업별 프롬프트까지
            만듭니다.
          </CardDescription>
        </CardHeader>
        <div className="px-4">
          <Link href="/specs/new" className={buttonVariants()}>
            아이디어로 시작하기
          </Link>
        </div>
      </Card>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {specs.map((spec) => (
        <li key={spec.id}>
          <Card size="sm">
            <CardHeader>
              <CardTitle>
                <Link href={`/specs/${spec.id}`} className="hover:underline">
                  {spec.title}
                </Link>
              </CardTitle>
              <CardDescription>
                {STATUS_LABELS[spec.status]}
                {spec.taskCount > 0
                  ? ` · 작업 ${spec.doneCount}/${spec.taskCount}`
                  : ""}
                {" · "}
                {formatDateTime(spec.createdAt)}
              </CardDescription>
            </CardHeader>
          </Card>
        </li>
      ))}
    </ul>
  );
}
