import { parsePatch } from "./patch";
import type { ChangedFile } from "./rules";

/**
 * PR 이 건드린 위험 영역. 문제를 찾는 규칙이 아니라, 사람이 리뷰할 때 어디를 먼저 볼지 알려 주는 요약이다.
 * 파일 경로와 바뀐 줄의 내용만 보고 정한다.
 */
export type RiskArea = {
  id:
    | "auth"
    | "database"
    | "payment"
    | "config"
    | "dependencies"
    | "ci"
    | "large";
  label: string;
  files: string[];
  note?: string;
};

const AREAS: {
  id: RiskArea["id"];
  label: string;
  path?: RegExp;
  content?: RegExp;
}[] = [
  {
    id: "auth",
    label: "로그인·권한",
    path: /(^|\/)(auth|login|signin|signup|session|middleware|proxy|permissions?|rbac|acl)([./-]|\/|$)/i,
    content:
      /\b(getUser|getSession|getClaims|signIn|signOut|requireUser|jwt|bcrypt|auth\.uid\(\)|role)\b/,
  },
  {
    id: "database",
    label: "DB 스키마·정책",
    path: /(^|\/)(migrations?|schema\.prisma|drizzle)\b|\.sql$/i,
  },
  {
    id: "payment",
    label: "결제",
    path: /(stripe|payment|billing|checkout|invoice|subscription|toss|portone|iamport)/i,
    content:
      /\b(stripe|paymentIntent|checkout\.sessions|webhooks\.constructEvent)\b/i,
  },
  {
    id: "config",
    label: "배포·보안 설정",
    path: /(^|\/)(\.env[^/]*|next\.config\.[cm]?[jt]s|vercel\.json|netlify\.toml|supabase\/config\.toml|Dockerfile|nginx\.conf|wrangler\.toml)$/,
  },
  {
    id: "ci",
    label: "CI·자동화",
    path: /(^|\/)\.github\/(workflows|actions)\//,
  },
];

const LOCKFILE =
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/;
const DEP_LINE = /^\s*"(@?[\w./-]+)"\s*:\s*"[~^]?\d/;

export function riskAreas(files: ChangedFile[]): RiskArea[] {
  const out: RiskArea[] = [];
  for (const area of AREAS) {
    const hits = files.filter((f) => {
      if (area.path?.test(f.path)) return true;
      if (!area.content || f.status === "removed") return false;
      return parsePatch(f.patch).added.some((a) => area.content!.test(a.text));
    });
    if (hits.length > 0)
      out.push({
        id: area.id,
        label: area.label,
        files: hits.map((f) => f.path),
      });
  }

  const added: string[] = [];
  for (const f of files) {
    if (!/(^|\/)package\.json$/.test(f.path)) continue;
    for (const a of parsePatch(f.patch).added) {
      const m = a.text.match(DEP_LINE);
      if (m && !/^(version|node|npm|pnpm)$/.test(m[1]!)) added.push(m[1]!);
    }
  }
  const lockOnly =
    files.some((f) => LOCKFILE.test(f.path)) && added.length === 0;
  if (added.length > 0 || lockOnly)
    out.push({
      id: "dependencies",
      label: "의존성",
      files: files
        .filter(
          (f) => /(^|\/)package\.json$/.test(f.path) || LOCKFILE.test(f.path),
        )
        .map((f) => f.path),
      note:
        added.length > 0
          ? `새로 추가하거나 버전을 바꾼 패키지: ${added.slice(0, 8).join(", ")}`
          : "lockfile 만 바뀜",
    });

  const lines = files.reduce((n, f) => n + parsePatch(f.patch).added.length, 0);
  if (files.length >= 20 || lines >= 800)
    out.push({
      id: "large",
      label: "큰 변경",
      files: [],
      note: `파일 ${files.length}개, 추가된 줄 ${lines}개. 나눠서 리뷰하거나 PR 을 쪼개는 게 안전합니다.`,
    });
  return out;
}

/** PR 제목·본문·브랜치·커밋 메시지에서 스펙 작업 키(T-3)를 찾는다. */
export function taskKeysIn(texts: string[]) {
  const keys = new Set<string>();
  for (const t of texts)
    for (const m of t.matchAll(/\[(T-\d+)\]|(?:^|[\s/(_-])(T-\d+)\b/gi))
      keys.add((m[1] ?? m[2]!).toUpperCase());
  return [...keys];
}
