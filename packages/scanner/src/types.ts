export type Severity = "critical" | "high" | "medium" | "low";

export type DetectorKind = "regex" | "ast" | "sql" | "file-tree" | "llm";

/** 스캔 대상 파일 하나. GitHub 에서 읽은 내용을 그대로 담는다. */
export type SourceFile = {
  path: string;
  content: string;
};

/** 규칙이 보는 리포 전체. files 는 내용을 읽은 파일, paths 는 리포의 모든 파일 경로. */
export type ScanInput = {
  files: SourceFile[];
  paths: string[];
};

/** 정적 탐지가 찾은 후보. LLM 판별 전 단계라 오탐이 섞여 있다. */
export type Candidate = {
  ruleId: string;
  severity: Severity;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  snippet: string;
  /** LLM 에 넘길 짧은 탐지 이유 (예: "Anthropic API 키 형식") */
  reason: string;
};

export type Rule = {
  id: string;
  title: string;
  severity: Severity;
  detector: DetectorKind;
  detect: (input: ScanInput) => Candidate[];
};
