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

/** 작업대 위의 도구 5개. 사용자 흐름 순서(기획 → 운영). */
export const TOOLS = [
  {
    stage: "기획",
    command: "spec",
    title: "스펙 변환기",
    text: "한 줄 아이디어를 PRD, 데이터 모델, 화면 목록, 순서가 있는 작업과 작업별 프롬프트로 나눕니다. PR 제목에 [T-3] 을 넣으면 작업에 이어지고, 머지되면 완료됩니다.",
    output: ["PRD · 테이블 4개 · 화면 7개", "작업 13개 · T-3 → PR #32 머지됨"],
    href: "/specs/new",
  },
  {
    stage: "준비",
    command: "context",
    title: "규칙 파일 생성기",
    text: "리포의 스택과 폴더 구조를 읽고 CLAUDE.md · .cursorrules · AGENTS.md 를 만들어 PR 로 넣어 줍니다. 의존성이 바뀌면 다시 만들 때라고 알려 줍니다.",
    output: ["Next.js 16 · Supabase · Tailwind 4", "규칙 30개 중 24개 적용"],
    href: "/projects",
  },
  {
    stage: "점검",
    command: "scan",
    title: "보안 점검기",
    text: "AI 로 만든 앱에서 자주 생기는 실수 22가지를 찾고, AI 코딩 도구에 붙여넣을 수정 프롬프트를 드립니다. 점검할수록 남은 문제가 줄어드는지 추이로 보여 줍니다.",
    output: ["치명적 1 · 높음 2 · 보통 1", "지난 점검보다 2개 줄었음"],
    href: "/projects",
  },
  {
    stage: "리뷰",
    command: "guard",
    title: "PR 가드",
    text: "PR 마다 바뀐 줄만 점검해 GitHub 에 줄 코멘트와 상태 체크를 남깁니다. 고친 문제는 대화를 접고, 같은 코멘트는 다시 달지 않습니다. 엄격도는 엄격·보통·느슨 중에 고르고, 실패하면 Slack 으로 알립니다.",
    output: ["남은 문제 1개 · 해결 2개 · 무시 1개", "상태 체크: 실패(엄격)"],
    href: "/guard",
  },
  {
    stage: "운영",
    command: "live",
    title: "운영 점검",
    text: "배포된 사이트를 밖에서 공격자처럼 하루 한 번 확인합니다. 로그인 없이 읽히는 테이블을 찾으면 만든 마이그레이션 파일과 줄까지 알려 주고, 새로 생긴 문제는 Slack 채널로 보냅니다.",
    output: ["orders → 0003_orders.sql:1", "새 문제 1개 → Slack #alerts"],
    href: "/live",
  },
] as const;

/** 한 작업이 끝나기까지: 도구들이 [T-n] 과 같은 리포로 이어지는 흐름 */
export const FLOW = [
  { step: "스펙", text: "아이디어를 작업 T-1~T-13 으로 나눔", tool: "spec" },
  {
    step: "구현",
    text: "작업 프롬프트로 AI 가 코드를 씀",
    tool: "Claude Code·Cursor",
  },
  {
    step: "PR",
    text: "제목에 [T-3] 을 넣어 PR 을 엶 → 작업에 이어짐",
    tool: "spec",
  },
  {
    step: "리뷰",
    text: "바뀐 줄에 코멘트, 고치면 '해결됨' 답글",
    tool: "guard",
  },
  {
    step: "머지",
    text: "머지되면 T-3 완료, 보안 추이에 반영",
    tool: "spec · scan",
  },
  {
    step: "운영",
    text: "배포된 사이트를 하루 한 번 밖에서 확인, 새 문제는 Slack 으로",
    tool: "live",
  },
] as const;

/** 측정값. 출처: README, packages/scanner/benchmark/RESULTS.md, docs/stack-bench.md */
export const PROOF = [
  {
    value: "86%",
    label: "보안 규칙 탐지율",
    note: "취약점을 심은 샘플 앱 12개, 문제 64개",
  },
  {
    value: "18/20",
    label: "스택 감지 완전 일치",
    note: "공개 리포 20개, 모노레포 포함",
  },
  {
    value: "74초",
    label: "리포 등록 → 수정 프롬프트",
    note: "처음 쓰는 사람 흐름, 운영에서 측정",
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
  {
    id: "SEC-015",
    severity: "high",
    text: "서버에서 위조할 수 있는 getSession() 값을 그대로 믿는 로그인 확인",
  },
  {
    id: "SEC-016",
    severity: "medium",
    text: "미들웨어에만 맡기고 페이지·API 안에서는 확인하지 않는 로그인",
  },
  {
    id: "SEC-017",
    severity: "medium",
    text: "?next= 값으로 아무 사이트로나 보내는 로그인 후 이동",
  },
  {
    id: "SEC-018",
    severity: "high",
    text: "사용자가 준 주소로 서버가 대신 요청하는 기능 (SSRF)",
  },
  {
    id: "SEC-019",
    severity: "high",
    text: "../ 로 다른 폴더 파일까지 열리는 파일 경로",
  },
  {
    id: "SEC-020",
    severity: "critical",
    text: "입력값이 들어간 셸 명령·eval",
  },
  {
    id: "SEC-021",
    severity: "high",
    text: "받은 폼을 통째로 저장해 role·plan 까지 바뀌는 API",
  },
  {
    id: "SEC-022",
    severity: "high",
    text: "누구나 받는 공개 Storage 버킷과 소유자 확인 없는 업로드 정책",
  },
];

export const PROMISES = [
  "코드는 GitHub App 으로 읽고, 결과에는 문제가 된 몇 줄만 남깁니다. 리포에 쓰는 건 규칙 파일 PR 과 PR 가드의 코멘트·상태 체크뿐입니다.",
  ".env 파일은 이름만 확인하고 내용은 열지 않습니다.",
  "AI 에 보내거나 저장하기 전에 비밀 키를 sk-ant-****abcd 처럼 가립니다.",
  "운영 점검은 소유를 확인한 사이트만, 읽기 요청만 보내고 응답 내용은 저장하지 않습니다.",
  "PR 가드의 무시(/lego ignore)는 리포에 쓰기 권한이 있는 사람만 할 수 있고, 누가 왜 무시했는지 남깁니다.",
  "리포를 연결한 사람이 아니라 쓰기 권한이 있는 사람만 등록하고 점검할 수 있습니다. 외부 기여자의 PR 에는 AI 를 쓰지 않습니다.",
  "알려진 취약점을 찾기 위해 의존성 이름과 버전을 OSV(api.osv.dev)에 조회합니다. 코드는 보내지 않습니다.",
  "Slack 알림은 고른 채널 하나에 글을 쓰는 권한만 받습니다. 대화는 읽지 않고, 연결은 언제든 끊을 수 있습니다.",
  "초대한 팀 멤버는 결과를 보기만 합니다. 점검 실행과 설정 변경은 소유자만 할 수 있고, 내보내면 바로 볼 수 없습니다.",
  "계정마다 한 달에 점검 30회, AI 토큰 200만 개까지 쓸 수 있습니다.",
  "점검 결과의 '이게 뭐예요?'는 개념 사전으로 이어져, 왜 위험한지 쉬운 말로 읽을 수 있습니다.",
] as const;
