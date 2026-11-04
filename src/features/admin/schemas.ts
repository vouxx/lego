export type RuleFeedbackRow = {
  ruleId: string;
  ruleTitle: string;
  /** 같은 문제를 한 건으로 센 발견 수(스캔 + PR) */
  total: number;
  aiFalsePositive: number;
  aiUncertain: number;
  userIgnored: number;
  /** (AI 오탐 + 사용자 무시) / 전체. 규칙을 손볼 우선순위로 쓴다. */
  noiseRate: number;
  bySource: { scan: number; pr: number };
};

export type IgnoreReasonRow = {
  ruleId: string;
  ruleTitle: string;
  reason: string;
  by: string | null;
  repo: string;
  prNumber: number | null;
  filePath: string;
  createdAt: string;
};
