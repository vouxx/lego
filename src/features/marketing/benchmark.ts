/**
 * 랜딩 '탐지율' 표의 수치.
 * 출처: packages/scanner/benchmark/RESULTS.md (샘플 12개, 심어 둔 문제 64개, 정적 탐지 단계만).
 * 벤치마크를 다시 재면(`pnpm --filter @lego/scanner bench --osv`) 이 파일도 함께 고친다.
 */

import type { Severity } from "@/shared/ui/severity";

export const BENCHMARK_SUMMARY = {
  samples: 12,
  planted: 64,
  found: 55,
  missed: 9,
  precision: "89%",
  falsePositives: 7,
} as const;

export type BenchmarkRule = {
  id: string;
  severity: Severity;
  text: string;
  /** 찾은 수 */
  hit: number;
  /** 놓친 수 */
  miss: number;
};

/** 등급순. 같은 등급 안에서는 규칙 번호순. */
export const BENCHMARK_RULES: BenchmarkRule[] = [
  {
    id: "SEC-001",
    severity: "critical",
    text: "코드에 그대로 적힌 API 키·토큰",
    hit: 5,
    miss: 0,
  },
  {
    id: "SEC-002",
    severity: "critical",
    text: "리포에 올라간 .env 파일",
    hit: 3,
    miss: 0,
  },
  {
    id: "SEC-003",
    severity: "critical",
    text: "NEXT_PUBLIC_ 이름으로 브라우저에 나가는 비밀 키",
    hit: 5,
    miss: 1,
  },
  {
    id: "SEC-004",
    severity: "critical",
    text: "브라우저 코드에서 쓰는 Supabase 관리자 키",
    hit: 2,
    miss: 1,
  },
  {
    id: "SEC-020",
    severity: "critical",
    text: "입력값이 들어간 셸 명령·eval",
    hit: 1,
    miss: 1,
  },
  {
    id: "SEC-005",
    severity: "high",
    text: "행 단위 보안(RLS)을 켜지 않은 테이블",
    hit: 3,
    miss: 0,
  },
  {
    id: "SEC-006",
    severity: "high",
    text: "누구에게나 열린 RLS 정책 using (true)",
    hit: 2,
    miss: 0,
  },
  {
    id: "SEC-007",
    severity: "high",
    text: "로그인 확인 없이 데이터를 바꾸는 API",
    hit: 5,
    miss: 1,
  },
  {
    id: "SEC-008",
    severity: "high",
    text: "입력값을 이어 붙여 만든 SQL",
    hit: 2,
    miss: 0,
  },
  {
    id: "SEC-009",
    severity: "high",
    text: "id 만 바꾸면 남의 데이터가 보이는 API",
    hit: 5,
    miss: 1,
  },
  {
    id: "SEC-015",
    severity: "high",
    text: "위조 가능한 getSession() 값을 믿는 로그인 확인",
    hit: 1,
    miss: 0,
  },
  {
    id: "SEC-018",
    severity: "high",
    text: "사용자가 준 주소로 서버가 요청 (SSRF)",
    hit: 1,
    miss: 0,
  },
  {
    id: "SEC-019",
    severity: "high",
    text: "../ 로 다른 폴더까지 열리는 파일 경로",
    hit: 1,
    miss: 1,
  },
  {
    id: "SEC-021",
    severity: "high",
    text: "폼을 통째로 저장해 role·plan 이 바뀌는 API",
    hit: 1,
    miss: 0,
  },
  {
    id: "SEC-022",
    severity: "high",
    text: "공개 Storage 버킷, 소유자 확인 없는 업로드",
    hit: 2,
    miss: 0,
  },
  {
    id: "SEC-010",
    severity: "medium",
    text: "살균하지 않은 HTML 을 그리는 화면",
    hit: 2,
    miss: 1,
  },
  {
    id: "SEC-011",
    severity: "medium",
    text: "모든 출처에 쿠키 요청을 허용한 CORS",
    hit: 2,
    miss: 0,
  },
  {
    id: "SEC-012",
    severity: "medium",
    text: "서명을 확인하지 않는 결제·GitHub 웹훅",
    hit: 2,
    miss: 1,
  },
  {
    id: "SEC-013",
    severity: "medium",
    text: "횟수 제한 없는 AI API",
    hit: 2,
    miss: 1,
  },
  {
    id: "SEC-016",
    severity: "medium",
    text: "미들웨어에만 맡긴 로그인 확인",
    hit: 2,
    miss: 0,
  },
  {
    id: "SEC-017",
    severity: "medium",
    text: "?next= 값으로 외부 사이트로 보내는 이동",
    hit: 1,
    miss: 0,
  },
  {
    id: "SEC-014",
    severity: "low",
    text: "알려진 취약점이 있는 패키지 버전",
    hit: 5,
    miss: 0,
  },
];

export const BENCHMARK_RESULTS_URL =
  "https://github.com/vouxx/lego/blob/main/packages/scanner/benchmark/RESULTS.md";
