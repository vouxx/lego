import { describe, expect, it } from "vitest";
import type { ContextAnalysis } from "../schemas";
import { majorVersion, renderContext } from "./render";

const analysis: ContextAnalysis = {
  stack: {
    tags: ["nextjs-app-router", "react", "typescript", "supabase"],
    packageManager: "pnpm",
    versions: { next: "^16.4.3", react: "19.3.0", typescript: "^5" },
  },
  rootEntries: ["package.json", "src"],
  commands: [{ label: "개발", command: "pnpm dev" }],
  folders: [
    { path: "src/app", summary: "라우트" },
    { path: "src/lib", summary: "" },
  ],
  cautions: [
    {
      ruleId: "SEC-005",
      title: "테이블 생성 후 RLS 미활성화",
      files: ["a.sql"],
      count: 2,
    },
  ],
};

describe("majorVersion", () => {
  it.each([
    ["^16.4.3", "16"],
    ["~5.1", "5"],
    ["19.3.0", "19"],
    ["latest", null],
    [undefined, null],
  ])("%s → %s", (input, expected) => {
    expect(majorVersion(input)).toBe(expected);
  });
});

describe("renderContext", () => {
  it("스택·명령어·폴더·켜진 규칙·주의할 점 순서로 만든다", () => {
    const doc = renderContext({
      target: "claude_md",
      analysis,
      rules: [
        { section: "컴포넌트", content: "작게 만든다.", enabled: true },
        { section: "컴포넌트", content: "꺼진 규칙", enabled: false },
        { section: "데이터", content: "RLS 필수", enabled: true },
      ],
    });
    expect(doc).toBe(`# 프로젝트 규칙

## 기술 스택

Next.js 16 (App Router), React 19, TypeScript 5, Supabase, 패키지 매니저 pnpm

## 명령어

- 개발: \`pnpm dev\`

## 폴더 구조

- \`src/app/\` — 라우트
- \`src/lib/\`

## 컴포넌트

- 작게 만든다.

## 데이터

- RLS 필수

## 주의할 점 (보안 점검 결과에서 자동 추가)

- [SEC-005] 테이블 생성 후 RLS 미활성화 — \`a.sql\` 외 1곳. 비슷한 코드를 만들 때 특히 확인한다.
`);
  });

  it("비어 있는 섹션은 넣지 않는다", () => {
    const doc = renderContext({
      target: "agents_md",
      analysis: {
        stack: { tags: [], packageManager: null, versions: {} },
        rootEntries: [],
        commands: [],
        folders: [],
        cautions: [],
      },
      rules: [],
    });
    expect(doc).toBe("# 프로젝트 규칙 (AGENTS.md)\n");
  });
});
