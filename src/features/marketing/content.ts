/** 랜딩 페이지에 보여 줄 점검 항목. 개발 경험이 적은 사람도 읽을 수 있는 말로 쓴다. */
export const RULE_GROUPS = [
  {
    title: "비밀 키 노출",
    rules: [
      { id: "SEC-001", text: "코드에 그대로 적힌 API 키·토큰" },
      { id: "SEC-002", text: "리포에 올라간 .env 파일" },
      {
        id: "SEC-003",
        text: "NEXT_PUBLIC_ 처럼 브라우저로 나가는 이름의 비밀 키",
      },
      { id: "SEC-004", text: "브라우저 코드에서 쓰는 Supabase 관리자 키" },
    ],
  },
  {
    title: "데이터베이스",
    rules: [
      { id: "SEC-005", text: "행 단위 보안(RLS)을 켜지 않은 테이블" },
      { id: "SEC-006", text: "누구에게나 열어 둔 RLS 정책 using (true)" },
      { id: "SEC-008", text: "입력값을 이어 붙여 만든 SQL" },
    ],
  },
  {
    title: "로그인과 권한",
    rules: [
      { id: "SEC-007", text: "로그인 확인 없이 데이터를 바꾸는 API" },
      { id: "SEC-009", text: "남의 id 만 넣으면 남의 데이터가 보이는 API" },
      { id: "SEC-012", text: "서명을 확인하지 않는 결제·GitHub 웹훅" },
    ],
  },
  {
    title: "그 밖의 실수",
    rules: [
      { id: "SEC-010", text: "살균하지 않은 HTML 을 그대로 그리는 화면" },
      { id: "SEC-011", text: "모든 사이트에 쿠키 요청을 허용한 CORS" },
      { id: "SEC-013", text: "횟수 제한 없이 부를 수 있는 AI API (요금 폭탄)" },
      { id: "SEC-014", text: "알려진 취약점이 있는 패키지 버전" },
    ],
  },
] as const;

export const STEPS = [
  {
    title: "GitHub 리포 연결",
    text: "GitHub 로 로그인하고 점검할 리포를 고릅니다. 코드는 읽기 권한으로만 가져옵니다.",
  },
  {
    title: "1분 안에 보안 점검",
    text: "14가지 규칙으로 실수를 찾고, AI 가 실제 문제인지 한 번 더 걸러 냅니다.",
  },
  {
    title: "수정 프롬프트 붙여넣기",
    text: "문제마다 Claude Code·Cursor 에 그대로 붙여넣을 수정 요청을 드립니다.",
  },
] as const;

export const PROMISES = [
  "코드는 GitHub App 읽기 권한으로만 가져오고 저장하지 않습니다. 결과에는 문제가 된 몇 줄만 남깁니다.",
  ".env 파일은 이름만 확인하고 내용은 열지 않습니다.",
  "AI 에 보내거나 저장하기 전에 비밀 키를 sk-ant-****abcd 처럼 가립니다.",
] as const;

export const SAMPLE_PROMPT = `[SEC-004] src/components/AdminPanel.tsx 에서 service_role 키를 브라우저 코드에서 사용함
누구나 개발자 도구로 키를 꺼내 모든 데이터를 읽고 지울 수 있음

할 일:
1. AdminPanel 의 Supabase 호출을 Server Action 으로 옮기고, 관리자 키는 서버 파일에서만 읽는다.
2. 해당 키를 Supabase 대시보드에서 폐기하고 새로 발급한다.
확인: 빌드 결과(.next/static)에서 SUPABASE_SERVICE_ROLE_KEY 값이 검색되지 않는다.`;
