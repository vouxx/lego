import { z } from "zod";
import type { DetectedStack } from "@/shared/stack/schema";
import type { ContextAnalysis } from "../schemas";

const scriptsSchema = z.object({
  scripts: z.record(z.string(), z.string()).optional(),
});

// 알려진 스크립트는 한국어 이름을 붙이고 이 순서로 보여준다.
const KNOWN_SCRIPTS: [string, string][] = [
  ["dev", "개발"],
  ["build", "빌드"],
  ["start", "실행"],
  ["typecheck", "타입 체크"],
  ["type-check", "타입 체크"],
  ["lint", "린트"],
  ["format", "포맷"],
  ["test", "테스트"],
  ["test:e2e", "E2E"],
  ["e2e", "E2E"],
];
const MAX_COMMANDS = 12;

function runCommand(pm: DetectedStack["packageManager"], script: string) {
  if (pm === "pnpm" || pm === "yarn") return `${pm} ${script}`;
  if (pm === "bun") return `bun run ${script}`;
  return `npm run ${script}`;
}

/** package.json scripts 를 '이름: 명령' 목록으로 만든다. 설치·배포 훅 같은 내부 스크립트는 뺀다. */
export function extractCommands(
  packageJson: unknown,
  packageManager: DetectedStack["packageManager"],
): ContextAnalysis["commands"] {
  const parsed = scriptsSchema.safeParse(packageJson);
  const scripts = parsed.success ? (parsed.data.scripts ?? {}) : {};
  const names = Object.keys(scripts).filter(
    (n) => !/^(pre|post)|^prepare$|^postinstall$/.test(n),
  );

  const known = KNOWN_SCRIPTS.filter(([name]) => names.includes(name));
  const knownNames = new Set(known.map(([name]) => name));
  // release:patch 처럼 기본 스크립트(release)의 변형은 기본 것만 남긴다.
  const rest = names
    .filter((n) => !knownNames.has(n))
    .filter((n) => !(n.includes(":") && names.includes(n.split(":")[0]!)))
    .map((n): [string, string] => [n, n]);

  return [...known, ...rest].slice(0, MAX_COMMANDS).map(([name, label]) => ({
    label,
    command: runCommand(packageManager, name),
  }));
}

const SKIP_FOLDERS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  "test-results",
  "playwright-report",
]);
const MAX_FOLDERS = 15;
const MAX_LISTED_FILES = 40;

export type FolderSample = { path: string; files: string[] };

/** 요약할 폴더: 최상위 폴더와 src/ 바로 아래 폴더. 숨김 폴더와 빌드 결과는 뺀다. */
export function pickFolders(paths: string[]): FolderSample[] {
  const folders = new Map<string, string[]>();
  const add = (folder: string, path: string) => {
    const list = folders.get(folder) ?? [];
    list.push(path);
    folders.set(folder, list);
  };

  for (const path of paths) {
    const parts = path.split("/");
    if (parts.length < 2) continue;
    const top = parts[0]!;
    if (top.startsWith(".") || SKIP_FOLDERS.has(top)) continue;
    if (top === "src" && parts.length >= 3) {
      add(`src/${parts[1]}`, path);
    } else if (top !== "src") {
      add(top, path);
    }
  }

  return [...folders.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, MAX_FOLDERS)
    .map(([path, files]) => ({
      path,
      files: files.slice(0, MAX_LISTED_FILES),
    }));
}

const PREFERRED = /(^|\/)(index|page|layout|route|main|app|mod)\.[cm]?[jt]sx?$/;

/** 폴더를 대표하는 파일 2개. 진입 파일을 먼저, 그다음 경로가 짧은 순. */
export function pickRepresentativeFiles<F extends { path: string }>(
  folder: string,
  files: F[],
): F[] {
  return files
    .filter((f) => f.path.startsWith(`${folder}/`))
    .sort(
      (a, b) =>
        Number(PREFERRED.test(b.path)) - Number(PREFERRED.test(a.path)) ||
        a.path.length - b.path.length,
    )
    .slice(0, 2);
}

/** 열려 있는 발견 항목을 규칙별로 묶어 '주의할 점'으로 만든다. */
export function buildCautions(
  findings: { ruleId: string; title: string; filePath: string }[],
): ContextAnalysis["cautions"] {
  const byRule = new Map<string, ContextAnalysis["cautions"][number]>();
  for (const f of findings) {
    const entry = byRule.get(f.ruleId) ?? {
      ruleId: f.ruleId,
      title: f.title,
      files: [],
      count: 0,
    };
    entry.count += 1;
    if (!entry.files.includes(f.filePath) && entry.files.length < 3) {
      entry.files.push(f.filePath);
    }
    byRule.set(f.ruleId, entry);
  }
  return [...byRule.values()].sort((a, b) => a.ruleId.localeCompare(b.ruleId));
}
