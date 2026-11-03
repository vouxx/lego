/**
 * 스택 감지 정확도 측정(2단계 완료 기준: 공개 리포 20개).
 *   npx tsx scripts/stack-bench.mts            # 결과를 docs/stack-bench.md 에 쓴다
 *
 * 정답은 사람이 근거(`--evidence`: 패키지별 관련 의존성과 app/pages 폴더)를 보고 매겨 TRUTH 에 적는다.
 * 루트 package.json 만 보는 방식과 워크스페이스 전체를 보는 방식을 같은 정답으로 비교한다.
 */
import { writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { parseGitRefs, readTar } from "../src/lib/github/archive";
import {
  detectRepoStack,
  detectStack,
  topLevelEntries,
} from "../src/shared/stack/detect";
import type { StackTag } from "../src/shared/stack/schema";

const REPOS = [
  "vouxx/lego",
  "vouxx/ZEEK",
  "vercel/commerce",
  "vercel/ai-chatbot",
  "nextjs/saas-starter",
  "vercel/nextjs-subscription-payments",
  "shadcn-ui/taxonomy",
  "mckaywrigley/chatbot-ui",
  "umami-software/umami",
  "excalidraw/excalidraw",
  "calcom/cal.com",
  "documenso/documenso",
  "formbricks/formbricks",
  "dubinc/dub",
  "supabase/supabase",
  "t3-oss/create-t3-app",
  "outline/outline",
  "vercel/platforms",
  "steven-tey/novel",
  "pmndrs/zustand",
  "vitejs/vite",
  "tldraw/tldraw",
];
const TARGET = 20;
const UA = { "user-agent": "lego-stack-bench" };

async function load(repo: string) {
  const refs = await fetch(
    `https://github.com/${repo}.git/info/refs?service=git-upload-pack`,
    { headers: UA },
  );
  if (!refs.ok) return null;
  const head = parseGitRefs(await refs.text()).head;
  if (!head) return null;
  const tar = await fetch(
    `https://codeload.github.com/${repo}/tar.gz/${head.sha}`,
    { headers: UA },
  );
  if (!tar.ok) return null;
  const entries = [
    ...readTar(
      gunzipSync(Buffer.from(await tar.arrayBuffer()), {
        maxOutputLength: 1_500_000_000,
      }),
    ),
  ]
    .map((f) => ({ ...f, path: f.path.slice(f.path.indexOf("/") + 1) }))
    .filter((f) => f.path);
  const paths = entries.map((e) => e.path);
  const packageJsons = entries
    .filter(
      (e) => e.path === "package.json" || e.path.endsWith("/package.json"),
    )
    .map((e) => ({ path: e.path, content: e.content.toString("utf8") }));
  return { sha: head.sha, paths, packageJsons };
}

const parse = (s: string | undefined) => {
  try {
    return s ? (JSON.parse(s) as unknown) : null;
  } catch {
    return null;
  }
};

// 사람이 근거(docs/stack-bench.md 의 근거 열, --evidence 출력)를 보고 매긴 정답.
// 리포에서 실제로 앱을 만드는 데 쓰는 스택이다(예시·문서 사이트 제외).
const TRUTH: Record<string, StackTag[]> = {
  "vouxx/lego": [
    "nextjs-app-router",
    "react",
    "typescript",
    "supabase",
    "tailwind",
    "vitest",
    "playwright",
  ],
  "vouxx/ZEEK": [
    "nextjs-app-router",
    "react",
    "typescript",
    "supabase",
    "tailwind",
  ],
  "vercel/commerce": ["nextjs-app-router", "react", "typescript", "tailwind"],
  "vercel/ai-chatbot": [
    "nextjs-app-router",
    "react",
    "typescript",
    "tailwind",
    "playwright",
  ],
  "nextjs/saas-starter": [
    "nextjs-app-router",
    "react",
    "typescript",
    "tailwind",
  ],
  "vercel/nextjs-subscription-payments": [
    "nextjs-app-router",
    "react",
    "typescript",
    "supabase",
    "tailwind",
  ],
  "shadcn-ui/taxonomy": [
    "nextjs-app-router",
    "nextjs-pages-router",
    "react",
    "typescript",
    "tailwind",
  ],
  "mckaywrigley/chatbot-ui": [
    "nextjs-app-router",
    "react",
    "typescript",
    "supabase",
    "tailwind",
    "jest",
  ],
  "umami-software/umami": [
    "nextjs-app-router",
    "react",
    "typescript",
    "vitest",
    "playwright",
  ],
  "excalidraw/excalidraw": ["react", "vite", "typescript", "vitest"],
  "calcom/cal.com": [
    "nextjs-app-router",
    "nextjs-pages-router",
    "react",
    "typescript",
    "tailwind",
    "vite",
    "vitest",
    "jest",
    "playwright",
  ],
  "documenso/documenso": [
    "nextjs-app-router",
    "react",
    "vite",
    "typescript",
    "tailwind",
    "vitest",
    "playwright",
  ],
  "formbricks/formbricks": [
    "nextjs-app-router",
    "react",
    "vite",
    "typescript",
    "tailwind",
    "vitest",
    "playwright",
  ],
  "dubinc/dub": [
    "nextjs-app-router",
    "react",
    "vite",
    "typescript",
    "tailwind",
    "vitest",
    "playwright",
  ],
  "supabase/supabase": [
    "nextjs-app-router",
    "nextjs-pages-router",
    "react",
    "vite",
    "typescript",
    "supabase",
    "tailwind",
    "vitest",
  ],
  // TypeScript CLI. cli/package.json 의 next·react·tailwind 는 생성할 템플릿의 버전이고 www 는 문서 사이트다.
  "t3-oss/create-t3-app": ["typescript"],
  "outline/outline": ["react", "vite", "typescript", "vitest"],
  "vercel/platforms": ["nextjs-app-router", "react", "typescript", "tailwind"],
  "steven-tey/novel": ["nextjs-app-router", "react", "typescript", "tailwind"],
  "pmndrs/zustand": ["react", "typescript", "vitest"],
};

const WATCH = [
  "next",
  "react",
  "vite",
  "typescript",
  "tailwindcss",
  "vitest",
  "jest",
  "@playwright/test",
];
const IGNORED =
  /(^|\/)(node_modules|[^/]*examples?[^/]*|fixtures?|samples?|benchmarks?|__tests__|tests?|e2e|playground|templates?|[^/]*docs?|\.[^/]+)\//;

/** 정답을 매길 근거: 패키지마다 관련 의존성과 app/pages 폴더. */
function evidence(
  paths: string[],
  packageJsons: { path: string; content: string }[],
) {
  return packageJsons
    .filter((p) => !IGNORED.test(p.path))
    .map((pkg) => {
      const dir =
        pkg.path === "package.json"
          ? ""
          : pkg.path.slice(0, -"package.json".length);
      const json = parse(pkg.content) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      } | null;
      const deps = { ...json?.devDependencies, ...json?.dependencies };
      const found = Object.keys(deps).filter(
        (d) => WATCH.includes(d) || d.startsWith("@supabase/"),
      );
      const dirs = ["app/", "pages/", "src/app/", "src/pages/"].filter((d) =>
        paths.some((p) => p.startsWith(dir + d)),
      );
      return `${pkg.path}: ${found.join(" ") || "-"}${dirs.length ? ` [${dirs.join(" ")}]` : ""}`;
    })
    .filter((line) => !line.endsWith(": -"));
}

type Row = {
  repo: string;
  truth: Set<StackTag>;
  root: Set<StackTag>;
  repoWide: Set<StackTag>;
  packages: number;
  evidence: string[];
};
const rows: Row[] = [];
for (const repo of REPOS) {
  if (rows.length >= TARGET) break;
  const data = await load(repo).catch(() => null);
  if (!data) {
    console.error(`건너뜀: ${repo}`);
    continue;
  }
  const rootPkg = data.packageJsons.find((p) => p.path === "package.json");
  const root = new Set(
    detectStack({
      ...topLevelEntries(data.paths),
      packageJson: parse(rootPkg?.content),
    }).tags,
  );
  const repoWide = new Set(
    detectRepoStack(
      data.paths,
      data.packageJsons.map((p) => ({ path: p.path, content: p.content })),
    ).tags,
  );
  rows.push({
    repo,
    truth: new Set(TRUTH[repo] ?? []),
    root,
    repoWide,
    packages: data.packageJsons.length,
    evidence: evidence(data.paths, data.packageJsons),
  });
  console.error(`측정: ${repo}`);
}

function score(pick: (r: Row) => Set<StackTag>) {
  let tp = 0,
    fp = 0,
    fn = 0,
    exact = 0;
  for (const r of rows) {
    const got = pick(r);
    const t = [...got].filter((x) => r.truth.has(x)).length;
    tp += t;
    fp += got.size - t;
    fn += r.truth.size - t;
    if (got.size === r.truth.size && t === got.size) exact += 1;
  }
  const pct = (a: number, b: number) =>
    b === 0 ? "-" : `${Math.round((a / b) * 100)}%`;
  return {
    exact: `${exact}/${rows.length}`,
    precision: pct(tp, tp + fp),
    recall: pct(tp, tp + fn),
  };
}

if (process.argv.includes("--evidence")) {
  for (const r of rows)
    console.log(`\n## ${r.repo}\n${r.evidence.slice(0, 25).join("\n")}`);
  process.exit(0);
}

const fmt = (s: Set<string>) => [...s].sort().join(", ") || "(없음)";
const rootScore = score((r) => r.root);
const wideScore = score((r) => r.repoWide);
const lines = [
  "# 스택 감지 정확도",
  "",
  `측정일 2026-11-03, 공개 리포 ${rows.length}개. \`npx tsx scripts/stack-bench.mts\` 로 다시 잰다.`,
  "",
  "정답은 리포마다 패키지별 의존성과 app/pages 폴더(`--evidence`)를 사람이 보고 매겼다. 예시·문서 사이트는 뺐다.",
  "",
  "| 방식 | 리포 단위 완전 일치 | 태그 정밀도 | 태그 재현율 |",
  "|---|---|---|---|",
  `| 루트 package.json 만 (이전) | ${rootScore.exact} | ${rootScore.precision} | ${rootScore.recall} |`,
  `| 워크스페이스 전체 (현재) | ${wideScore.exact} | ${wideScore.precision} | ${wideScore.recall} |`,
  "",
  "| 리포 | package.json 수 | 정답 | 루트만 | 현재 |",
  "|---|---|---|---|---|",
  ...rows.map(
    (r) =>
      `| ${r.repo} | ${r.packages} | ${fmt(r.truth)} | ${fmt(r.root)} | ${fmt(r.repoWide)} |`,
  ),
  "",
];
writeFileSync("docs/stack-bench.md", lines.join("\n"));
console.log(lines.slice(0, 12).join("\n"));
