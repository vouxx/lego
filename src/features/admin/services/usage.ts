import "server-only";
import {
  listLlmCallsSince,
  listFunnelRows,
  type LlmCallRow,
} from "../repository";

const WINDOW_DAYS = 30;

export type FunnelStep = { label: string; users: number };
export type CostRow = { login: string; calls: number; costUsd: number };

/** 비용을 사용자별·목적별로 모은다. 많이 쓴 순서. */
export function summarizeCosts(rows: LlmCallRow[]) {
  const byUser = new Map<string, CostRow>();
  const byPurpose = new Map<string, number>();
  let total = 0;
  for (const row of rows) {
    const cost = Number(row.cost_usd);
    total += cost;
    byPurpose.set(row.purpose, (byPurpose.get(row.purpose) ?? 0) + cost);
    const login = row.profiles?.github_login ?? "(알 수 없음)";
    const entry = byUser.get(login) ?? { login, calls: 0, costUsd: 0 };
    entry.calls += 1;
    entry.costUsd += cost;
    byUser.set(login, entry);
  }
  return {
    totalUsd: total,
    users: [...byUser.values()].sort((a, b) => b.costUsd - a.costUsd),
    purposes: [...byPurpose]
      .map(([purpose, costUsd]) => ({ purpose, costUsd }))
      .sort((a, b) => b.costUsd - a.costUsd),
  };
}

/** 가입부터 PR 가드까지 어디서 멈추는지와 최근 30일 AI 비용. 호출 전에 isAdmin 을 확인한다. */
export async function getUsageOverview() {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const [funnel, calls] = await Promise.all([
    listFunnelRows(),
    listLlmCallsSince(since),
  ]);
  const distinct = (rows: { user_id: string }[] | null) =>
    new Set((rows ?? []).map((r) => r.user_id)).size;
  const steps: FunnelStep[] = [
    { label: "가입", users: funnel.signups ?? 0 },
    { label: "GitHub 연결", users: distinct(funnel.installations) },
    { label: "프로젝트 등록", users: distinct(funnel.projects) },
    { label: "점검 완료", users: distinct(funnel.scans) },
    { label: "PR 가드 사용", users: distinct(funnel.guarded) },
  ];
  return {
    steps,
    windowDays: WINDOW_DAYS,
    costs: summarizeCosts(calls.data ?? []),
  };
}
