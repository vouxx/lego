/**
 * 랜딩 페이지 문구. 개발 경험이 적은 사람도 읽을 수 있는 말로 쓰고,
 * 숫자는 README·docs 에 기록한 실제 측정값만 쓴다.
 */

import type { Severity } from "@/shared/ui/severity";

/** 히어로의 점검 결과 예시(샘플 리포 기준 실제 형식). */
export const HERO_FINDINGS: {
  severity: Severity;
  id: string;
  title: string;
  where: string;
}[] = [
  {
    severity: "critical",
    id: "SEC-004",
    title: "브라우저 코드에서 쓰는 Supabase 관리자 키",
    where: "src/components/AdminPanel.tsx:6",
  },
  {
    severity: "high",
    id: "SEC-005",
    title: "RLS 를 켜지 않은 posts 테이블",
    where: "supabase/migrations/0003_posts.sql:1",
  },
  {
    severity: "medium",
    id: "SEC-013",
    title: "횟수 제한 없이 부를 수 있는 AI API",
    where: "src/app/api/chat/route.ts:4",
  },
];

export const SAMPLE_PROMPT = `[SEC-004] src/components/AdminPanel.tsx 에서 service_role 키를 브라우저 코드에서 사용함
누구나 개발자 도구로 키를 꺼내 모든 데이터를 읽고 지울 수 있음

할 일:
1. AdminPanel 의 Supabase 호출을 Server Action 으로 옮기고, 관리자 키는 서버 파일에서만 읽는다.
2. 해당 키를 Supabase 대시보드에서 폐기하고 새로 발급한다.
확인: 빌드 결과(.next/static)에서 SUPABASE_SERVICE_ROLE_KEY 값이 검색되지 않는다.`;

/** 작업대 위의 도구 5개. 사용자 흐름 순서(기획 → 회고). */
export const TOOLS = [
  {
    stage: "기획",
    command: "spec",
    title: "스펙 변환기",
    text: "한 줄 아이디어를 PRD, 데이터 모델, 화면 목록, 순서가 있는 작업과 작업별 프롬프트로 나눕니다.",
    output: ["PRD · 테이블 4개 · 화면 7개", "작업 13개 (T-1 → T-13)"],
    href: "/specs/new",
  },
  {
    stage: "준비",
    command: "context",
    title: "규칙 파일 생성기",
    text: "리포의 스택과 폴더 구조를 읽고 CLAUDE.md · .cursorrules · AGENTS.md 를 만들어 PR 로 넣어 줍니다.",
    output: ["Next.js 16 · Supabase · Tailwind 4", "규칙 30개 중 24개 적용"],
    href: "/projects",
  },
  {
    stage: "점검",
    command: "scan",
    title: "보안 점검기",
    text: "AI 로 만든 앱에서 자주 생기는 실수 14가지를 찾고, AI 코딩 도구에 붙여넣을 수정 프롬프트를 드립니다.",
    output: ["치명적 1 · 높음 2 · 보통 1", "수정 프롬프트 4개"],
    href: "/projects",
  },
  {
    stage: "이해",
    command: "learn",
    title: "학습 도우미",
    text: "AI 가 쓴 코드를 내 수준에 맞춰 설명하고, 흐름도와 퀴즈로 정말 이해했는지 확인합니다.",
    output: ["흐름 5단계 · 개념 3개", "퀴즈 3/3"],
    href: "/learn",
  },
  {
    stage: "회고",
    command: "retro",
    title: "세션 회고",
    text: "Claude Code·Cursor 대화를 올리면 잘 먹힌 프롬프트와 막힌 지점을 정리합니다. 원본은 서버로 보내지 않습니다.",
    output: ["가린 값 447개 · 1,475턴", "잘 먹힌 프롬프트 3개"],
    href: "/sessions/new",
  },
] as const;

/** 측정값. 출처: README, packages/scanner/benchmark/RESULTS.md, docs/stack-bench.md */
export const PROOF = [
  {
    value: "87%",
    label: "보안 규칙 탐지율",
    note: "취약점을 심은 샘플 앱 10개, 문제 52개",
  },
  {
    value: "18/20",
    label: "스택 감지 완전 일치",
    note: "공개 리포 20개, 모노레포 포함",
  },
  {
    value: "0건",
    label: "세션 마스킹 누출",
    note: "비밀값 14종을 심은 테스트 로그",
  },
  {
    value: "82초",
    label: "아이디어 → 작업 13개",
    note: "스펙 하나에 AI 비용 약 $0.22",
  },
] as const;

/** 랜딩 페이지에 보여 줄 점검 항목. */
export const RULES: { id: string; severity: Severity; text: string }[] = [
  {
    id: "SEC-001",
    severity: "critical",
    text: "코드에 그대로 적힌 API 키·토큰",
  },
  { id: "SEC-002", severity: "critical", text: "리포에 올라간 .env 파일" },
  {
    id: "SEC-003",
    severity: "critical",
    text: "NEXT_PUBLIC_ 처럼 브라우저로 나가는 이름의 비밀 키",
  },
  {
    id: "SEC-004",
    severity: "critical",
    text: "브라우저 코드에서 쓰는 Supabase 관리자 키",
  },
  {
    id: "SEC-005",
    severity: "high",
    text: "행 단위 보안(RLS)을 켜지 않은 테이블",
  },
  {
    id: "SEC-006",
    severity: "high",
    text: "누구에게나 열어 둔 RLS 정책 using (true)",
  },
  {
    id: "SEC-007",
    severity: "high",
    text: "로그인 확인 없이 데이터를 바꾸는 API",
  },
  { id: "SEC-008", severity: "high", text: "입력값을 이어 붙여 만든 SQL" },
  {
    id: "SEC-009",
    severity: "high",
    text: "남의 id 만 넣으면 남의 데이터가 보이는 API",
  },
  {
    id: "SEC-010",
    severity: "medium",
    text: "살균하지 않은 HTML 을 그대로 그리는 화면",
  },
  {
    id: "SEC-011",
    severity: "medium",
    text: "모든 사이트에 쿠키 요청을 허용한 CORS",
  },
  {
    id: "SEC-012",
    severity: "medium",
    text: "서명을 확인하지 않는 결제·GitHub 웹훅",
  },
  {
    id: "SEC-013",
    severity: "medium",
    text: "횟수 제한 없이 부를 수 있는 AI API (요금 폭탄)",
  },
  {
    id: "SEC-014",
    severity: "low",
    text: "알려진 취약점이 있는 패키지 버전 (등급에 따라 높음까지)",
  },
];

export const PROMISES = [
  "코드는 GitHub App 읽기 권한으로만 가져오고, 결과에는 문제가 된 몇 줄만 남깁니다.",
  ".env 파일은 이름만 확인하고 내용은 열지 않습니다.",
  "AI 에 보내거나 저장하기 전에 비밀 키를 sk-ant-****abcd 처럼 가립니다.",
  "세션 로그는 브라우저에서 가린 뒤, 확인한 내용만 올라갑니다.",
] as const;
