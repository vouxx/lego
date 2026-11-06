import type { SlackMessage } from "@/lib/slack/client";
import type { WeeklySummary } from "./weekly-summary";

/** Slack 메시지 모양. 화면·네트워크 없이 문구만 만든다(단위 테스트 대상). */

type Severity = "critical" | "high" | "medium" | "low";
const MARK: Record<Severity, string> = {
  critical: ":red_circle: 치명적",
  high: ":large_orange_circle: 높음",
  medium: ":large_yellow_circle: 보통",
  low: ":white_circle: 낮음",
};
const MAX_ITEMS = 5;

/** Slack mrkdwn 에서 의미가 있는 문자를 바꾼다(사용자 코드·리포 이름이 섞인다). */
export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const section = (text: string) => ({
  type: "section",
  text: { type: "mrkdwn", text },
});
const linkButton = (url: string | null, label: string) =>
  url
    ? [
        {
          type: "actions",
          elements: [
            { type: "button", text: { type: "plain_text", text: label }, url },
          ],
        },
      ]
    : [];

const list = (items: { severity: Severity; title: string; where: string }[]) =>
  items
    .slice(0, MAX_ITEMS)
    .map((i) => `${MARK[i.severity]}  ${esc(i.title)} — \`${esc(i.where)}\``)
    .join("\n") +
  (items.length > MAX_ITEMS ? `\n…외 ${items.length - MAX_ITEMS}개` : "");

export function liveMessage(params: {
  repo: string;
  site: string;
  added: { severity: Severity; title: string; target: string }[];
  total: number;
  url: string | null;
}): SlackMessage {
  const head = `*운영 점검* · ${esc(params.repo)}\n${esc(params.site)} 에서 새로 생긴 문제 ${params.added.length}개 (전체 ${params.total}개)`;
  return {
    text: `[레고] ${params.repo} 운영 점검: 새 문제 ${params.added.length}개`,
    blocks: [
      section(head),
      section(
        list(
          params.added.map((a) => ({
            severity: a.severity,
            title: a.title,
            where: a.target,
          })),
        ),
      ),
      ...linkButton(params.url, "레고에서 보기"),
    ],
  };
}

export function guardMessage(params: {
  repo: string;
  prNumber: number;
  prTitle: string;
  prUrl: string | null;
  title: string;
  added: { severity: Severity; title: string; where: string }[];
  url: string | null;
}): SlackMessage {
  const pr = params.prUrl
    ? `<${params.prUrl}|#${params.prNumber} ${esc(params.prTitle)}>`
    : `#${params.prNumber} ${esc(params.prTitle)}`;
  return {
    text: `[레고] ${params.repo} PR #${params.prNumber}: ${params.title}`,
    blocks: [
      section(
        `*PR 가드 실패* · ${esc(params.repo)}\n${pr}\n${esc(params.title)}`,
      ),
      ...(params.added.length > 0
        ? [section(`이번 커밋에서 새로 생긴 문제\n${list(params.added)}`)]
        : []),
      ...linkButton(params.url, "레고에서 보기"),
    ],
  };
}

export function scanMessage(params: {
  repo: string;
  counts: Partial<Record<Severity, number>>;
  total: number;
  url: string | null;
}): SlackMessage {
  const parts = (["critical", "high", "medium", "low"] as const)
    .filter((s) => (params.counts[s] ?? 0) > 0)
    .map((s) => `${MARK[s]} ${params.counts[s]}`);
  return {
    text: `[레고] ${params.repo} 보안 점검: 문제 ${params.total}개`,
    blocks: [
      section(
        `*보안 점검 완료* · ${esc(params.repo)}\n${
          params.total === 0
            ? "찾은 문제가 없습니다."
            : `문제 ${params.total}개 · ${parts.join("  ")}`
        }`,
      ),
      ...linkButton(params.url, "결과와 수정 프롬프트 보기"),
    ],
  };
}

export function weeklyMessage(params: {
  repo: string;
  summary: WeeklySummary;
  url: string | null;
}): SlackMessage {
  const { scan, pr, live } = params.summary;
  const lines = [
    scan.total === 0
      ? "*보안 점검* 아직 끝난 점검이 없습니다."
      : `*보안 점검* 남은 문제 ${scan.open}개(치명·높음 ${scan.serious}개) · 지난주 새로 생김 ${scan.added}개 · 해결 ${scan.fixed}개`,
    pr.total === 0
      ? "*PR 가드* 지난주 점검한 PR 이 없습니다."
      : `*PR 가드* PR ${pr.total}개 중 ${pr.passed}개 통과`,
    ...(live.checks === 0
      ? []
      : [
          `*운영 점검* ${live.checks}번 점검 · 새 문제 ${live.added}개 · 남은 문제 ${live.open}개`,
        ]),
  ];
  return {
    text: `[레고] ${params.repo} 주간 요약: 남은 문제 ${scan.open}개`,
    blocks: [
      section(`*주간 요약* · ${esc(params.repo)}`),
      section(lines.join("\n")),
      ...linkButton(params.url, "레고에서 보기"),
    ],
  };
}

export function testMessage(repo: string): SlackMessage {
  return {
    text: `[레고] ${repo} 알림이 이 채널로 옵니다.`,
    blocks: [
      section(
        `:wave: *레고 알림 연결 확인*\n${esc(repo)} 의 운영 점검·PR 가드 알림이 이 채널로 옵니다.`,
      ),
    ],
  };
}
