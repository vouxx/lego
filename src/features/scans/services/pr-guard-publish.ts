import "server-only";
import type { CheckAnnotation } from "@/lib/github/pulls";
import {
  SEVERITIES,
  STRICTNESS_RULES,
  type PrFindingRef,
  type PrRiskArea,
  type PrScope,
  type Severity,
  type Strictness,
} from "../schemas";

/** GitHub 에 올리는 문구. 리뷰 본문·줄 코멘트·상태 체크가 같은 모양을 쓴다. */

export const CHECK_NAME = "레고 PR 가드";

export type PublishedFinding = {
  rule_id: string;
  rule_title: string;
  severity: Severity;
  file_path: string;
  line: number;
  reason: string;
  explanation: string | null;
  fix_prompt: string | null;
  state: "open" | "ignored";
  ignore_reason: string | null;
  ignored_by: string | null;
};

const LEVEL: Record<Severity, CheckAnnotation["annotation_level"]> = {
  critical: "failure",
  high: "failure",
  medium: "warning",
  low: "notice",
};

const order = (s: Severity) => SEVERITIES.indexOf(s);
const bySeverity = <T extends { severity: Severity }>(rows: T[]) =>
  [...rows].sort((a, b) => order(a.severity) - order(b.severity));

export function countBySeverity(rows: { severity: Severity }[]) {
  const counts: Partial<Record<Severity, number>> = {};
  for (const r of rows) counts[r.severity] = (counts[r.severity] ?? 0) + 1;
  return counts;
}

const atLeast = (s: Severity, min: Severity) => order(s) <= order(min);

/** 줄 코멘트를 달 문제인지 */
export const shouldComment = (s: Severity, strictness: Strictness) =>
  atLeast(s, STRICTNESS_RULES[strictness].commentAt);

/** 남은 문제로 정한다. 무시한 항목은 세지 않는다. */
export function conclusionOf(
  counts: Partial<Record<Severity, number>>,
  strictness: Strictness = "normal",
) {
  const present = SEVERITIES.filter((s) => (counts[s] ?? 0) > 0);
  if (present.some((s) => atLeast(s, STRICTNESS_RULES[strictness].failAt)))
    return "failure" as const;
  if (present.length > 0) return "neutral" as const;
  return "success" as const;
}

const line = (r: PublishedFinding) =>
  `- **${r.severity}** \`${r.rule_id}\` ${r.rule_title} — \`${r.file_path}:${r.line}\``;

export function riskMarkdown(risk: PrRiskArea[], scope: PrScope | null) {
  const parts: string[] = [];
  if (risk.length > 0) {
    parts.push(
      "#### 이 PR 이 건드린 위험 영역",
      risk
        .map((a) => {
          const files =
            a.files.length > 0
              ? ` — ${a.files
                  .slice(0, 4)
                  .map((f) => `\`${f}\``)
                  .join(
                    ", ",
                  )}${a.files.length > 4 ? ` 외 ${a.files.length - 4}개` : ""}`
              : "";
          return `- **${a.label}**${files}${a.note ? `\n  ${a.note}` : ""}`;
        })
        .join("\n"),
    );
  }
  if (scope && scope.tasks.length > 0) {
    const tasks = scope.tasks.map((t) => `${t.key} ${t.title}`).join(", ");
    parts.push(
      `#### 스펙 작업 범위 (${tasks})`,
      scope.outside.length === 0
        ? "바뀐 파일이 모두 작업 범위 안으로 보입니다."
        : `작업과 관계없어 보이는 파일 ${scope.outside.length}개:\n` +
            scope.outside
              .map((o) => `- \`${o.path}\` — ${o.reason}`)
              .join("\n"),
    );
  }
  return parts.join("\n\n");
}

/** 리뷰 본문: 위험 영역 + 이번 커밋에서 새로 찾은 문제 + 해결된 문제 */
export function reviewBody(params: {
  isFirst: boolean;
  added: PublishedFinding[];
  inlineCount: number;
  resolved: PrFindingRef[];
  risk: PrRiskArea[];
  scope: PrScope | null;
}) {
  const parts = [`### ${CHECK_NAME}`];
  if (params.isFirst) {
    const risk = riskMarkdown(params.risk, params.scope);
    if (risk) parts.push(risk);
  }
  if (params.added.length > 0) {
    parts.push(
      `#### ${params.isFirst ? "찾은 문제" : "이번 커밋에서 새로 생긴 문제"}`,
      bySeverity(params.added).map(line).join("\n"),
    );
    if (params.added.length > params.inlineCount)
      parts.push(
        `줄 코멘트로 달지 않은 항목 ${params.added.length - params.inlineCount}개(지운 파일, 바뀌지 않은 줄, 엄격도 기준 밖)는 위 목록과 레고 화면에서 볼 수 있습니다.`,
      );
  }
  if (params.resolved.length > 0)
    parts.push(
      `#### 해결됨 ${params.resolved.length}개`,
      params.resolved
        .map(
          (r) =>
            `- ~~\`${r.ruleId}\` ${r.ruleTitle} — \`${r.filePath}:${r.line}\`~~`,
        )
        .join("\n"),
    );
  parts.push(
    "<sub>오탐이거나 의도한 코드라면 줄 코멘트에 `/lego ignore 이유` 로 답글을 달면 체크에서 뺍니다.</sub>",
  );
  return parts.join("\n\n");
}

export function commentBody(r: PublishedFinding) {
  return [
    `**${r.severity}** \`${r.rule_id}\` ${r.rule_title}`,
    r.explanation ?? r.reason,
    r.fix_prompt
      ? `<details><summary>AI 코딩 도구에 붙여넣을 수정 프롬프트</summary>\n\n\`\`\`\n${r.fix_prompt}\n\`\`\`\n</details>`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** 상태 체크 결과: 남은 문제로 결론, 해결·무시는 요약에만 */
export function checkOutput(params: {
  findings: PublishedFinding[];
  resolved: PrFindingRef[];
  risk: PrRiskArea[];
  scope: PrScope | null;
  strictness: Strictness;
}) {
  const open = bySeverity(params.findings.filter((f) => f.state === "open"));
  const ignored = params.findings.filter((f) => f.state === "ignored");
  const conclusion = conclusionOf(countBySeverity(open), params.strictness);
  const rule = STRICTNESS_RULES[params.strictness];
  const title = [
    open.length === 0 ? "남은 문제 없음" : `남은 문제 ${open.length}개`,
    params.resolved.length > 0 ? `해결 ${params.resolved.length}개` : "",
    ignored.length > 0 ? `무시 ${ignored.length}개` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const summary = [
    open.length > 0
      ? `#### 남은 문제\n${open.map(line).join("\n")}`
      : "바뀐 줄에서 남은 보안 문제나 위험한 변경이 없습니다.",
    ignored.length > 0
      ? `#### 무시함\n${ignored
          .map(
            (r) =>
              `${line(r)} — ${r.ignore_reason ?? ""} (@${r.ignored_by ?? "?"})`,
          )
          .join("\n")}`
      : "",
    params.resolved.length > 0
      ? `#### 해결됨\n${params.resolved.map((r) => `- \`${r.ruleId}\` ${r.ruleTitle} — \`${r.filePath}:${r.line}\``).join("\n")}`
      : "",
    riskMarkdown(params.risk, params.scope),
    `<sub>엄격도 ${rule.label}: ${rule.description}</sub>`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const annotations: CheckAnnotation[] = open.map((r) => ({
    path: r.file_path,
    start_line: r.line,
    end_line: r.line,
    annotation_level: LEVEL[r.severity],
    title: `${r.rule_id} ${r.rule_title}`,
    message: r.explanation ?? r.reason,
  }));
  return { conclusion, title, summary, annotations };
}

export function githubErrorNote(error: unknown, what: string) {
  const status = (error as { status?: number }).status;
  if (status === 403 || status === 404)
    return `${what}: GitHub App 에 권한이 없습니다(Pull requests·Checks 쓰기 권한 필요).`;
  return `${what}: GitHub 요청이 실패했습니다.`;
}

export const detailsUrl = (projectId: string, reviewId: string) =>
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/projects/${projectId}/reviews/${reviewId}`
    : undefined;
