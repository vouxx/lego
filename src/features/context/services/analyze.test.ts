import { describe, expect, it } from "vitest";
import {
  buildCautions,
  extractCommands,
  pickFolders,
  pickRepresentativeFiles,
} from "./analyze";

describe("extractCommands", () => {
  it("알려진 스크립트를 앞에, 나머지를 뒤에 두고 패키지 매니저에 맞춰 명령을 만든다", () => {
    const commands = extractCommands(
      {
        scripts: {
          "db:types": "supabase gen types",
          release: "x",
          "release:patch": "x",
          test: "vitest run",
          dev: "next dev",
          postinstall: "x",
          prepare: "husky",
        },
      },
      "pnpm",
    );
    expect(commands).toEqual([
      { label: "개발", command: "pnpm dev" },
      { label: "테스트", command: "pnpm test" },
      { label: "db:types", command: "pnpm db:types" },
      { label: "release", command: "pnpm release" },
    ]);
  });

  it("npm 이나 알 수 없는 매니저는 npm run 을 쓴다", () => {
    expect(extractCommands({ scripts: { dev: "vite" } }, null)).toEqual([
      { label: "개발", command: "npm run dev" },
    ]);
  });

  it("package.json 이 없으면 빈 목록", () => {
    expect(extractCommands(null, "pnpm")).toEqual([]);
  });
});

describe("pickFolders", () => {
  it("최상위 폴더와 src 바로 아래 폴더를 고르고 숨김·빌드 폴더는 뺀다", () => {
    const folders = pickFolders([
      "package.json",
      "src/app/page.tsx",
      "src/app/layout.tsx",
      "src/lib/a.ts",
      "src/index.ts",
      "supabase/migrations/1.sql",
      ".github/workflows/ci.yml",
      "node_modules/x/index.js",
      "dist/out.js",
    ]);
    expect(folders.map((f) => f.path)).toEqual([
      "src/app",
      "src/lib",
      "supabase",
    ]);
    expect(folders[0]!.files).toEqual([
      "src/app/page.tsx",
      "src/app/layout.tsx",
    ]);
  });
});

describe("pickRepresentativeFiles", () => {
  it("진입 파일을 먼저 고른다", () => {
    const files = [
      { path: "src/lib/very/long/helper.ts" },
      { path: "src/lib/util.ts" },
      { path: "src/lib/index.ts" },
      { path: "src/other/index.ts" },
    ];
    expect(
      pickRepresentativeFiles("src/lib", files).map((f) => f.path),
    ).toEqual(["src/lib/index.ts", "src/lib/util.ts"]);
  });
});

describe("buildCautions", () => {
  it("규칙별로 묶고 파일은 3개까지만 남긴다", () => {
    const cautions = buildCautions([
      { ruleId: "SEC-005", title: "RLS", filePath: "a.sql" },
      { ruleId: "SEC-001", title: "키", filePath: "x.ts" },
      { ruleId: "SEC-005", title: "RLS", filePath: "b.sql" },
      { ruleId: "SEC-005", title: "RLS", filePath: "b.sql" },
      { ruleId: "SEC-005", title: "RLS", filePath: "c.sql" },
      { ruleId: "SEC-005", title: "RLS", filePath: "d.sql" },
    ]);
    expect(cautions).toEqual([
      { ruleId: "SEC-001", title: "키", files: ["x.ts"], count: 1 },
      {
        ruleId: "SEC-005",
        title: "RLS",
        files: ["a.sql", "b.sql", "c.sql"],
        count: 5,
      },
    ]);
  });
});
