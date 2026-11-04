import { isJsFile, isSqlFile } from "../files";
import type { Candidate, Severity } from "../types";
import { parsePatch, type AddedLine } from "./patch";
import { lookalikeOf } from "./typosquat";

/** PR 의 바뀐 파일 하나. content 는 PR 의 최신 커밋(head) 기준 내용(지운 파일·큰 파일은 없음). */
export type ChangedFile = {
  path: string;
  status:
    | "added"
    | "modified"
    | "removed"
    | "renamed"
    | "copied"
    | "changed"
    | "unchanged";
  patch?: string;
  content?: string;
};

export type PrRule = {
  id: string;
  title: string;
  severity: Severity;
  detect: (input: PrInput) => Candidate[];
};

export type PrInput = {
  files: ChangedFile[];
  /** 리포의 .env.example 등에 적힌 환경 변수 이름. 템플릿 파일이 없으면 null */
  documentedEnv: Set<string> | null;
};

const TEST_FILE =
  /(^|\/)(__tests__|tests?|e2e|spec)\/|\.(test|spec)\.[cm]?[jt]sx?$/;

const each = (
  input: PrInput,
  filter: (f: ChangedFile) => boolean,
  visit: (file: ChangedFile, added: AddedLine[], removed: string[]) => void,
) => {
  for (const file of input.files) {
    if (file.status === "removed" || !filter(file)) continue;
    const { added, removed } = parsePatch(file.patch);
    visit(file, added, removed);
  }
};

const candidate = (
  ruleId: string,
  severity: Severity,
  file: string,
  line: number,
  snippet: string,
  reason: string,
): Candidate => ({
  ruleId,
  severity,
  filePath: file,
  lineStart: line,
  lineEnd: line,
  snippet: snippet.trim(),
  reason,
});

const SKIP_TEST =
  /\b(?:it|test|describe)\.(?:skip|todo)\s*\(|\bx(?:it|describe|test)\s*\(|\b(?:it|test|describe)\.only\s*\(|\btest\.fixme\s*\(/;

/** PR-001 테스트를 지우거나 건너뜀 */
export const pr001: PrRule = {
  id: "PR-001",
  title: "테스트를 지우거나 건너뜀",
  severity: "high",
  detect: (input) => {
    const out: Candidate[] = [];
    for (const file of input.files) {
      if (file.status === "removed" && TEST_FILE.test(file.path))
        out.push(
          candidate(
            "PR-001",
            "high",
            file.path,
            1,
            file.path,
            "테스트 파일을 통째로 지움. 실패하던 테스트를 지워서 통과시킨 것일 수 있음",
          ),
        );
    }
    each(
      input,
      (f) => TEST_FILE.test(f.path),
      (file, added, removed) => {
        for (const a of added) {
          if (SKIP_TEST.test(a.text))
            out.push(
              candidate(
                "PR-001",
                "high",
                file.path,
                a.line,
                a.text,
                /\.only\s*\(/.test(a.text)
                  ? ".only 를 넣어 나머지 테스트가 돌지 않음"
                  : "테스트를 skip/todo 로 바꿔 건너뜀",
              ),
            );
        }
        const lost =
          removed.filter((r) => /\bexpect\(|\bassert\b/.test(r)).length -
          added.filter((a) => /\bexpect\(|\bassert\b/.test(a.text)).length;
        if (lost >= 3)
          out.push(
            candidate(
              "PR-001",
              "medium",
              file.path,
              added[0]?.line ?? 1,
              `expect ${lost}개 줄어듦`,
              `검증(expect) 이 ${lost}개 줄었음. 테스트를 약하게 만들어 통과시킨 것일 수 있음`,
            ),
          );
      },
    );
    return out;
  },
};

const DISABLE_CHECK =
  /eslint-disable|@ts-ignore|@ts-nocheck|@ts-expect-error|:\s*any\b|\bas\s+any\b|<any>/;

/** PR-002 타입·린트 검사를 끔 */
export const pr002: PrRule = {
  id: "PR-002",
  title: "타입·린트 검사를 끔",
  severity: "medium",
  detect: (input) => {
    const out: Candidate[] = [];
    each(
      input,
      (f) => isJsFile(f.path),
      (file, added) => {
        for (const a of added) {
          const m = a.text.match(DISABLE_CHECK);
          // 주석 속 "any" 같은 낱말은 빼고, eslint-disable·@ts-ignore 는 주석이어도 센다.
          const inComment = /^\s*(?:\/\/|\/?\*)/.test(a.text);
          if (m && !(inComment && /any/.test(m[0])))
            out.push(
              candidate(
                "PR-002",
                "medium",
                file.path,
                a.line,
                a.text,
                `${m[0].trim()} 로 타입·린트 검사를 껐음. 오류를 고치지 않고 숨긴 것일 수 있음`,
              ),
            );
        }
      },
    );
    return out;
  },
};

const WEAKEN_DB =
  /\bdisable\s+row\s+level\s+security\b|\bdrop\s+policy\b|\bno\s+force\s+row\s+level\s+security\b|\bgrant\s+[\w\s,]*\bon\s+(?:all\s+tables|table\s+)?[\w."]*\s+to\s+(?:anon|public)\b/i;

/** PR-003 데이터베이스 보안을 약하게 바꿈 */
export const pr003: PrRule = {
  id: "PR-003",
  title: "데이터베이스 보안을 약하게 바꿈",
  severity: "high",
  detect: (input) => {
    const out: Candidate[] = [];
    each(
      input,
      (f) => isSqlFile(f.path),
      (file, added) => {
        for (const a of added) {
          const m = a.text.match(WEAKEN_DB);
          if (m)
            out.push(
              candidate(
                "PR-003",
                "high",
                file.path,
                a.line,
                a.text,
                `${m[0].replace(/\s+/g, " ").toLowerCase()} — 기존 보안 설정을 끄거나 정책을 지움`,
              ),
            );
        }
      },
    );
    return out;
  },
};

const ENV_USE =
  /\bprocess\.env\.([A-Z][A-Z0-9_]+)|\bprocess\.env\[\s*["']([A-Z][A-Z0-9_]+)["']\s*\]|\bimport\.meta\.env\.([A-Z][A-Z0-9_]+)|\bDeno\.env\.get\(\s*["']([A-Z][A-Z0-9_]+)["']/g;
const BUILTIN_ENV =
  /^(?:NODE_ENV|CI|VERCEL\w*|NEXT_RUNTIME|NEXT_PHASE|PORT|HOSTNAME|TZ|MODE|DEV|PROD|SSR|BASE_URL|PWD|HOME)$/;

/** PR-004 문서에 없는 새 환경 변수 */
export const pr004: PrRule = {
  id: "PR-004",
  title: "문서에 없는 새 환경 변수",
  severity: "low",
  detect: (input) => {
    const documented = input.documentedEnv;
    if (!documented) return [];
    const out: Candidate[] = [];
    const seen = new Set<string>();
    each(
      input,
      (f) => isJsFile(f.path) && !TEST_FILE.test(f.path),
      (file, added) => {
        for (const a of added) {
          for (const m of a.text.matchAll(ENV_USE)) {
            const name = m[1] ?? m[2] ?? m[3] ?? m[4]!;
            if (
              BUILTIN_ENV.test(name) ||
              documented.has(name) ||
              seen.has(name)
            )
              continue;
            seen.add(name);
            out.push(
              candidate(
                "PR-004",
                "low",
                file.path,
                a.line,
                a.text,
                `${name} 를 새로 쓰는데 .env.example 에 없음. 배포 환경에 넣는 걸 잊기 쉽고, 다른 사람이 실행할 수 없음`,
              ),
            );
          }
        }
      },
    );
    return out;
  },
};

const DEP_LINE = /^\s*"(@?[\w./-]+)"\s*:\s*"[^"]*"\s*,?\s*$/;
const INSTALL_SCRIPT =
  /^\s*"(preinstall|install|postinstall|prepare)"\s*:\s*"([^"]*)"/;

/** PR-005 의심스러운 패키지 추가 (이름이 비슷한 가짜 패키지, 설치 스크립트) */
export const pr005: PrRule = {
  id: "PR-005",
  title: "의심스러운 패키지 추가",
  severity: "high",
  detect: (input) => {
    const out: Candidate[] = [];
    each(
      input,
      (f) => /(^|\/)package\.json$/.test(f.path),
      (file, added) => {
        for (const a of added) {
          const script = a.text.match(INSTALL_SCRIPT);
          if (script) {
            if (
              !/^(husky|husky install|simple-git-hooks|lefthook install|prisma generate|panda codegen|svelte-kit sync|nuxt prepare)$/.test(
                script[2]!.trim(),
              )
            )
              out.push(
                candidate(
                  "PR-005",
                  "medium",
                  file.path,
                  a.line,
                  a.text,
                  `${script[1]} 스크립트를 추가함. 설치할 때 자동으로 실행되는 명령이라 내용을 확인해야 함`,
                ),
              );
            continue;
          }
          const dep = a.text.match(DEP_LINE);
          if (!dep) continue;
          const like = lookalikeOf(dep[1]!);
          if (like)
            out.push(
              candidate(
                "PR-005",
                "high",
                file.path,
                a.line,
                a.text,
                `${dep[1]} 는 인기 패키지 ${like} 와 이름이 거의 같음. 이름을 흉내 낸 악성 패키지일 수 있음`,
              ),
            );
        }
      },
    );
    return out;
  },
};

export const PR_RULES: PrRule[] = [pr001, pr002, pr003, pr004, pr005];
