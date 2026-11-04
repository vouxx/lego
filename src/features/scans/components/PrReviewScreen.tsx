import { PageHeader } from "@/shared/ui/page-header";
import type { PrFindingView, PrReviewRow } from "../schemas";
import { PrFindingCard } from "./PrFindingCard";
import { PrRiskSummary } from "./PrRiskSummary";

type Props = {
  review: PrReviewRow & {
    projectId: string;
    repoFullName: string;
    headSha: string;
    error: string | null;
    findings: PrFindingView[];
  };
};

const CONCLUSION: Record<string, string> = {
  failure: "심각한 문제가 있어 상태 체크를 실패로 표시했습니다.",
  neutral: "확인할 항목이 있습니다(합치기는 막지 않음).",
  success: "바뀐 줄에서 문제를 찾지 못했습니다.",
};

export function PrReviewScreen({ review }: Props) {
  const visible = review.findings.filter(
    (f) => f.aiVerdict !== "false_positive",
  );
  // 남은 문제 먼저, 무시한 문제는 뒤로
  const shown = [
    ...visible.filter((f) => f.state === "open"),
    ...visible.filter((f) => f.state === "ignored"),
  ];
  const hidden = review.findings.length - shown.length;
  const { summary } = review;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        trail={[
          { href: "/projects", label: "프로젝트" },
          { href: `/projects/${review.projectId}`, label: review.repoFullName },
          { label: `PR #${review.prNumber}` },
        ]}
        title={review.prTitle || `PR #${review.prNumber}`}
        description={
          <span className="font-mono text-xs">
            커밋 {review.headSha.slice(0, 7)} · 바뀐 파일 {summary.files}개
          </span>
        }
        actions={
          review.prUrl ? (
            <a
              href={review.prUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm hover:underline"
            >
              GitHub 에서 보기 →
            </a>
          ) : null
        }
      />
      {review.status === "queued" || review.status === "running" ? (
        <p className="text-sm">점검하는 중입니다. 잠시 뒤 새로고침해 주세요.</p>
      ) : null}
      {review.status === "failed" ? (
        <p role="alert" className="text-destructive text-sm">
          점검하지 못했습니다. {review.error}
        </p>
      ) : null}
      {review.status === "done" && summary.conclusion ? (
        <p className="text-sm">{CONCLUSION[summary.conclusion]}</p>
      ) : null}
      {review.status === "done" ? (
        <p className="text-muted-foreground text-sm">
          남은 문제 {visible.length - summary.ignored}개
          {summary.newCount > 0
            ? ` · 이번 커밋에서 새로 ${summary.newCount}개`
            : ""}
          {summary.resolved.length > 0
            ? ` · 해결 ${summary.resolved.length}개`
            : ""}
          {summary.ignored > 0 ? ` · 무시 ${summary.ignored}개` : ""}
        </p>
      ) : null}
      <PrRiskSummary
        risk={summary.risk}
        scope={summary.scope}
        resolved={summary.resolved}
      />
      {summary.note ? (
        <p className="text-muted-foreground text-sm">{summary.note}</p>
      ) : null}
      {summary.llm === "skipped" ? (
        <p className="text-muted-foreground text-sm">
          AI 키가 없어 보안 항목의 AI 판별과 수정 프롬프트를 건너뛰었습니다.
        </p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {shown.map((f) => (
          <li key={f.id}>
            <PrFindingCard finding={f} />
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <p className="text-muted-foreground text-sm">
          AI 가 오탐으로 판단해 GitHub 에 올리지 않은 항목 {hidden}개가
          있습니다.
        </p>
      ) : null}
    </div>
  );
}
