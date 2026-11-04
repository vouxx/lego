import "server-only";
import { getRuleFeedback, listRecentIgnores } from "../repository";
import type { IgnoreReasonRow, RuleFeedbackRow } from "../schemas";

/** 규칙별 오탐 피드백: 스캔과 PR 가드를 합쳐 시끄러운 규칙부터 보여 준다. */
export async function getFeedbackOverview(): Promise<{
  rules: RuleFeedbackRow[];
  reasons: IgnoreReasonRow[];
}> {
  const [{ data: stats, error }, { data: ignores }] = await Promise.all([
    getRuleFeedback(),
    listRecentIgnores(),
  ]);
  if (error) throw new Error(`오탐 통계를 읽지 못했습니다: ${error.message}`);

  const byRule = new Map<string, RuleFeedbackRow>();
  for (const s of stats ?? []) {
    const row = byRule.get(s.rule_id) ?? {
      ruleId: s.rule_id,
      ruleTitle: s.rule_title,
      total: 0,
      aiFalsePositive: 0,
      aiUncertain: 0,
      userIgnored: 0,
      noiseRate: 0,
      bySource: { scan: 0, pr: 0 },
    };
    row.total += Number(s.total);
    row.aiFalsePositive += Number(s.ai_false_positive);
    row.aiUncertain += Number(s.ai_uncertain);
    row.userIgnored += Number(s.user_ignored);
    row.bySource[s.source === "pr" ? "pr" : "scan"] += Number(s.total);
    byRule.set(s.rule_id, row);
  }
  const rules = [...byRule.values()]
    .map((r) => ({
      ...r,
      noiseRate:
        r.total > 0
          ? Math.min(1, (r.aiFalsePositive + r.userIgnored) / r.total)
          : 0,
    }))
    .sort((a, b) => b.noiseRate - a.noiseRate || b.total - a.total);

  // 같은 PR 의 같은 문제(fingerprint)는 커밋마다 반복되므로 가장 최근 것 하나만.
  const seen = new Set<string>();
  const reasons: IgnoreReasonRow[] = [];
  for (const r of ignores ?? []) {
    const repo = r.pr_reviews?.projects?.repo_full_name ?? "";
    const key = `${repo}#${r.pr_reviews?.pr_number}:${r.fingerprint}`;
    if (seen.has(key)) continue;
    seen.add(key);
    reasons.push({
      ruleId: r.rule_id,
      ruleTitle: r.rule_title,
      reason: r.ignore_reason ?? "",
      by: r.ignored_by,
      repo,
      prNumber: r.pr_reviews?.pr_number ?? null,
      filePath: r.file_path,
      createdAt: r.created_at,
    });
    if (reasons.length >= 30) break;
  }
  return { rules, reasons };
}
