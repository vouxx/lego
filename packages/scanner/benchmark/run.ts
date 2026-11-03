/**
 * 샘플 취약 리포로 정적 탐지의 탐지율(recall)·정밀도(precision)를 잰다.
 *   pnpm --filter @lego/scanner bench          # 정적 규칙만
 *   pnpm --filter @lego/scanner bench --osv    # SEC-014(OSV 조회)까지
 * 결과는 benchmark/RESULTS.md 에 쓴다.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  auditDependencies,
  runRules,
  type Candidate,
  type SourceFile,
} from "../src";

type Expected = { rule: string; file: string; line: number; note?: string };
type Sample = {
  name: string;
  description: string;
  files: SourceFile[];
  paths: string[];
  expected: Expected[];
};

const ROOT = new URL("./samples/", import.meta.url).pathname;
const RESULTS = new URL("./RESULTS.md", import.meta.url).pathname;
const RULES = Array.from(
  { length: 22 },
  (_, i) => `SEC-${String(i + 1).padStart(3, "0")}`,
);

// 가짜 키는 실행할 때 조립한다. 소스에 그대로 두면 GitHub push protection 에 걸린다.
const jwt = (role: string) =>
  [
    "eyJhbGciOiJIUzI1NiJ9",
    Buffer.from(JSON.stringify({ role, iss: "supabase" })).toString(
      "base64url",
    ),
    "s".repeat(24),
  ].join(".");
const PLACEHOLDERS: Record<string, string> = {
  ANTHROPIC_KEY: "sk-ant-" + "api03-" + "Bx7".repeat(14),
  OPENAI_KEY: "sk-" + "proj-" + "Kq4".repeat(14),
  STRIPE_LIVE_KEY: "sk_" + "live_" + "Zr8".repeat(9),
  SERVICE_ROLE_JWT: jwt("service_role"),
  ANON_JWT: jwt("anon"),
  GITHUB_TOKEN: "ghp_" + "Mw2".repeat(12),
  AWS_ACCESS_KEY: "AKIA" + "QX7Z".repeat(4),
};
const fill = (text: string) =>
  text.replace(/\{\{(\w+)\}\}/g, (m, key: string) => PLACEHOLDERS[key] ?? m);

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

function loadSamples(): Sample[] {
  return readdirSync(ROOT)
    .filter((name) => statSync(join(ROOT, name)).isDirectory())
    .sort()
    .map((name) => {
      const repo = join(ROOT, name, "repo");
      const meta = JSON.parse(
        readFileSync(join(ROOT, name, "expected.json"), "utf8"),
      ) as {
        description: string;
        extraPaths?: string[];
        findings: Expected[];
      };
      const files = listFiles(repo).map((full) => ({
        path: relative(repo, full),
        content: fill(readFileSync(full, "utf8")),
      }));
      return {
        name,
        description: meta.description,
        files,
        paths: [...files.map((f) => f.path), ...(meta.extraPaths ?? [])],
        expected: meta.findings,
      };
    });
}

const matches = (c: Candidate, e: Expected) =>
  c.ruleId === e.rule &&
  c.filePath === e.file &&
  e.line >= c.lineStart - 2 &&
  e.line <= c.lineEnd + 2;

type Tally = { tp: number; fn: number; fp: number };
const tally = (): Tally => ({ tp: 0, fn: 0, fp: 0 });
const pct = (n: number, d: number) =>
  d === 0 ? "—" : `${Math.round((n / d) * 100)}%`;

async function main() {
  const withOsv = process.argv.includes("--osv");
  const samples = loadSamples();
  const byRule = new Map(RULES.map((r) => [r, tally()]));
  const bySample: { sample: Sample; t: Tally }[] = [];
  const misses: string[] = [];
  const falseAlarms: string[] = [];

  for (const sample of samples) {
    const input = { files: sample.files, paths: sample.paths };
    const { candidates, errors } = runRules(input);
    for (const e of errors)
      console.warn(`[${sample.name}] ${e.ruleId} 실패: ${e.message}`);
    if (withOsv) candidates.push(...(await auditDependencies(input)));

    const t = tally();
    const used = new Set<Candidate>();
    for (const e of sample.expected) {
      if (!withOsv && e.rule === "SEC-014") continue;
      const hit = candidates.find((c) => !used.has(c) && matches(c, e));
      const rule = byRule.get(e.rule)!;
      if (hit) {
        used.add(hit);
        t.tp++;
        rule.tp++;
      } else {
        t.fn++;
        rule.fn++;
        misses.push(
          `${sample.name} ${e.rule} ${e.file}:${e.line}${e.note ? ` — ${e.note}` : ""}`,
        );
      }
    }
    for (const c of candidates) {
      if (used.has(c)) continue;
      // 같은 문제를 여러 후보가 가리키면(예: 같은 함수) 오탐으로 세지 않는다.
      if (sample.expected.some((e) => matches(c, e))) continue;
      t.fp++;
      byRule.get(c.ruleId)!.fp++;
      falseAlarms.push(
        `${sample.name} ${c.ruleId} ${c.filePath}:${c.lineStart} — ${c.reason}`,
      );
    }
    bySample.push({ sample, t });
  }

  const total = [...byRule.values()].reduce(
    (a, t) => ({ tp: a.tp + t.tp, fn: a.fn + t.fn, fp: a.fp + t.fp }),
    tally(),
  );
  const lines = [
    "# 탐지율 측정 결과",
    "",
    `샘플 ${samples.length}개, 심어 둔 문제 ${total.tp + total.fn}개. 정적 탐지 단계만 잰 값이다(AI 판별 전).`,
    withOsv
      ? "SEC-014 는 OSV 조회를 포함했다."
      : "SEC-014 는 네트워크가 필요해 제외했다(`--osv` 로 포함).",
    "",
    `- **탐지율(recall)**: ${pct(total.tp, total.tp + total.fn)} (${total.tp}/${total.tp + total.fn})`,
    `- **정밀도(precision)**: ${pct(total.tp, total.tp + total.fp)} — 오탐 ${total.fp}개`,
    "",
    "## 규칙별",
    "",
    "| 규칙 | 탐지 | 놓침 | 오탐 | 탐지율 |",
    "|---|---|---|---|---|",
    ...[...byRule].map(
      ([r, t]) =>
        `| ${r} | ${t.tp} | ${t.fn} | ${t.fp} | ${pct(t.tp, t.tp + t.fn)} |`,
    ),
    "",
    "## 샘플별",
    "",
    "| 샘플 | 설명 | 탐지 | 놓침 | 오탐 |",
    "|---|---|---|---|---|",
    ...bySample.map(
      ({ sample, t }) =>
        `| ${sample.name} | ${sample.description} | ${t.tp} | ${t.fn} | ${t.fp} |`,
    ),
    "",
    "## 놓친 항목",
    "",
    ...(misses.length ? misses.map((m) => `- ${m}`) : ["- 없음"]),
    "",
    "## 오탐",
    "",
    ...(falseAlarms.length ? falseAlarms.map((m) => `- ${m}`) : ["- 없음"]),
    "",
  ];
  writeFileSync(RESULTS, lines.join("\n"));
  console.log(lines.slice(0, 8).join("\n"));
  console.log(`\n자세한 결과: ${relative(process.cwd(), RESULTS)}`);
}

await main();
