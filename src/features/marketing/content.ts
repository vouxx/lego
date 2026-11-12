/**
 * 랜딩 페이지 문구와 예시 데이터. 개발 경험이 적은 사람도 읽을 수 있는 말로 쓰고,
 * 숫자는 실제 측정값(benchmark.ts)이나 '예시'로 밝힌 화면에만 쓴다.
 */

import type { Severity } from "@/shared/ui/severity";

/** 히어로의 점검 결과 화면 모형(my-shop 예시 리포). */
export const SCAN_PREVIEW = {
  project: "my-shop",
  quota: "이번 달 점검 14 / 30",
  title: "보안 점검 #14",
  meta: "main @ 4f2a91c · 2026-11-12 09:14 KST · 파일 128개 · 2분 13초",
  open: 4,
  delta: "#13 대비 −2",
  counts: [
    { severity: "critical", count: 1 },
    { severity: "high", count: 2 },
    { severity: "medium", count: 1 },
  ] satisfies { severity: Severity; count: number }[],
  /** 최근 8회 점검의 남은 문제 수(오래된 것부터) */
  trend: [9, 9, 8, 7, 7, 6, 6, 4],
  medianFix: "해결 중앙값 1.8일",
  tabs: ["열림 4", "무시 1", "오탐 2", "해결 3"],
  dependencyNote: "SEC-014 의존성 조회: OSV 응답 정상, 알려진 취약점 없음.",
} as const;

export const PREVIEW_MENU = [
  "개요",
  "보안 점검",
  "PR 가드",
  "운영 점검",
  "규칙 파일",
  "스펙",
] as const;

export type PreviewFinding = {
  severity: Severity;
  id: string;
  title: string;
  where: string;
  verdict: string;
  since: string;
};

export const PREVIEW_FINDINGS: PreviewFinding[] = [
  {
    severity: "critical",
    id: "SEC-004",
    title: "브라우저 코드에서 쓰는 Supabase 관리자 키",
    where: "src/components/AdminPanel.tsx:6",
    verdict: "확정",
    since: "#12",
  },
  {
    severity: "high",
    id: "SEC-005",
    title: "RLS 를 켜지 않은 posts 테이블",
    where: "supabase/migrations/0003_posts.sql:1",
    verdict: "AI 확인",
    since: "#09",
  },
  {
    severity: "high",
    id: "SEC-009",
    title: "id 만 바꾸면 남의 주문이 보이는 API",
    where: "src/app/api/orders/[id]/route.ts:9",
    verdict: "AI 확인",
    since: "#14",
  },
  {
    severity: "medium",
    id: "SEC-013",
    title: "횟수 제한 없이 부를 수 있는 AI API",
    where: "src/app/api/chat/route.ts:4",
    verdict: "AI 확인",
    since: "#11",
  },
];

/** 상세 칸: 첫 번째 항목(SEC-004) */
export const PREVIEW_DETAIL = {
  basis: "값으로 확정",
  code: [
    { line: 5, text: 'import { createClient } from "@supabase/…";' },
    {
      line: 6,
      text: 'const db = createClient(URL, "eyJh****Q3xk");',
      hit: true,
    },
  ],
  why: '"use client" 파일이라 키가 브라우저로 내려갑니다. 누구나 개발자 도구로 키를 꺼내 RLS 를 무시하고 모든 테이블을 읽고 지울 수 있습니다.',
  concept: "개념 사전: service_role 키",
  fix: `1. AdminPanel 의 Supabase 호출을 Server Action 으로 옮기고, 관리자 키는 서버 파일에서만 읽는다.
2. 키를 Supabase 대시보드에서 폐기하고 새로 발급한다.
확인: .next/static 에서 키 값이 검색되지 않는다.`,
} as const;

/** 데이터 처리 표. 대상 / 하는 일 / 하지 않는 일 */
export const POLICIES = [
  {
    what: "리포 접근",
    does: "GitHub App 설치 토큰으로 읽습니다. 쓰는 것은 규칙 파일 PR 과 PR 가드의 코멘트·상태 체크뿐입니다.",
    never: "커밋 푸시, 브랜치·설정 변경",
  },
  {
    what: ".env 파일",
    does: "리포에 올라갔는지 파일 이름만 확인합니다.",
    never: "내용 열기·저장",
  },
  {
    what: "비밀 키",
    does: "AI 에 보내거나 저장하기 전에 sk-ant-****abcd 처럼 가립니다. 결과에는 문제가 된 몇 줄만 남깁니다.",
    never: "키 원문 저장, 코드 전체 보관",
  },
  {
    what: "운영 점검",
    does: "/.well-known 토큰으로 소유를 확인한 사이트에만, 하루 한 번 읽기 요청을 보냅니다.",
    never: "쓰기 요청, 응답 내용 저장",
  },
  {
    what: "의존성 조회",
    does: "패키지 이름과 버전만 OSV(api.osv.dev)에 조회합니다.",
    never: "소스 코드 전송",
  },
  {
    what: "PR 가드 무시",
    does: "/lego ignore 는 리포에 쓰기 권한이 있는 사람만 할 수 있고, 누가 왜 무시했는지 남깁니다.",
    never: "권한 확인 없는 무시",
  },
  {
    what: "외부 기여자 PR",
    does: "정적 규칙으로만 점검합니다.",
    never: "AI 판별, 스펙 내용 공개",
  },
  {
    what: "Slack",
    does: "고른 채널 하나에 글을 쓰는 권한만 받습니다. 연결은 언제든 끊을 수 있습니다.",
    never: "대화 읽기, 봇 토큰 보관",
  },
  {
    what: "팀 멤버",
    does: "초대된 사람은 결과를 보기만 합니다.",
    never: "점검 실행, 설정 변경",
  },
] as const;
