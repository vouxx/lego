export type Severity = "critical" | "high" | "medium" | "low";

export type DetectorKind = "regex" | "ast" | "sql" | "file-tree" | "llm";

/** 스캔 대상 파일 하나. GitHub 에서 읽은 내용을 그대로 담는다. */
export type SourceFile = {
  path: string;
  content: string;
};

/** 정적 탐지가 찾은 후보. LLM 판별 전 단계라 오탐이 섞여 있다. */
export type Candidate = {
  ruleId: string;
  severity: Severity;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  snippet: string;
};

export type Rule = {
  id: string;
  title: string;
  severity: Severity;
  detector: DetectorKind;
  detect: (files: SourceFile[]) => Candidate[];
};
