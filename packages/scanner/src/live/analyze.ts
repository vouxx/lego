import {
  normalizeTableName,
  splitSqlStatements,
  TABLE_NAME,
} from "../detectors/sql";
import { isSqlFile } from "../files";
import { findSecrets, maskSecrets } from "../secrets";
import type { Severity, SourceFile } from "../types";

/**
 * 운영 상태 점검(LIVE-001~007). 네트워크 요청은 앱이 하고, 여기서는 받은 응답만 판정한다.
 * 실제로 밖에서 보이는 것만 다루므로 판정은 확정적이고 AI 를 쓰지 않는다.
 */
export type LiveFinding = {
  id: string;
  severity: Severity;
  title: string;
  /** 무엇이 열려 있는지: 테이블 이름, 주소, 헤더 이름 */
  target: string;
  detail: string;
  fix: string;
  /** 리포에서 이 테이블·버킷을 만든 곳(마이그레이션) */
  code?: CodeLocation;
};

export type CodeLocation = { path: string; line: number; what: string };

export const LIVE_TITLES: Record<string, string> = {
  "LIVE-001": "로그인 없이 읽히는 테이블",
  "LIVE-002": "파일 목록이 보이는 Storage 버킷",
  "LIVE-003": "배포된 JS 에 들어 있는 비밀 키",
  "LIVE-004": "보안 헤더 누락",
  "LIVE-005": "공개된 민감 파일",
  "LIVE-006": "코드와 다른 운영 RLS 상태",
  "LIVE-007": "이메일 확인 없이 가입 허용",
};

const finding = (
  id: string,
  severity: Severity,
  target: string,
  detail: string,
  fix: string,
): LiveFinding => ({
  id,
  severity,
  title: LIVE_TITLES[id]!,
  target,
  detail,
  fix,
});

const SENSITIVE_TABLE =
  /user|profile|account|member|customer|order|payment|invoice|billing|subscription|message|chat|address|phone|email|token|secret|key|session|admin|employee|patient|health/i;

/** LIVE-001 / LIVE-006: anon 키로 행이 읽히는 테이블 */
export function checkTableExposure(
  table: string,
  rowCount: number,
  codeRls: Map<string, boolean>,
): LiveFinding[] {
  if (rowCount <= 0) return [];
  const sensitive = SENSITIVE_TABLE.test(table);
  const out = [
    finding(
      "LIVE-001",
      sensitive ? "critical" : "high",
      table,
      `로그인하지 않은 사람이 공개 anon 키만으로 ${table} 테이블의 행 ${rowCount}개를 읽을 수 있습니다.`,
      `[LIVE-001] 운영 DB 의 ${table} 테이블이 로그인 없이 읽힘
할 일:
1. 새 마이그레이션에서 alter table ${table} enable row level security; 를 실행한다.
2. 읽기 정책을 소유자 조건으로 만든다: create policy "own rows" on ${table} for select using (auth.uid() = user_id);
3. 정말 공개 데이터라면 공개할 열만 뷰로 만들어 그 뷰만 노출한다.
확인: 로그인하지 않은 상태로 /rest/v1/${table} 를 조회해 빈 배열이 나오는지 본다.`,
    ),
  ];
  const name = normalizeTableName(table);
  if (codeRls.get(name) === true)
    out.push(
      finding(
        "LIVE-006",
        "high",
        table,
        `마이그레이션에서는 ${table} 의 RLS 를 켜고 정책을 만들었는데, 운영 DB 에서는 로그인 없이 읽힙니다. 대시보드에서 직접 바꿨거나 정책이 using (true) 일 수 있습니다.`,
        `[LIVE-006] ${table} 의 운영 RLS 상태가 코드(마이그레이션)와 다름
할 일:
1. Supabase 대시보드 Database → Policies 에서 ${table} 의 RLS 와 정책을 확인한다.
2. 대시보드에서 바꾼 설정은 마이그레이션 파일로 옮겨 코드와 운영을 맞춘다.
3. 운영에 직접 손대지 않도록, 앞으로는 마이그레이션으로만 바꾼다.
확인: 다시 운영 점검을 돌려 이 항목이 사라지는지 본다.`,
      ),
    );
  return out;
}

/** LIVE-002: 로그인 없이 파일 목록이 보이는 버킷 */
export function checkBucketListing(
  bucket: string,
  objectCount: number,
): LiveFinding[] {
  if (objectCount <= 0) return [];
  return [
    finding(
      "LIVE-002",
      "high",
      bucket,
      `로그인하지 않은 사람이 ${bucket} 버킷의 파일 목록(${objectCount}개 이상)을 볼 수 있습니다. 공개 버킷이면 이름만 알면 내려받을 수도 있습니다.`,
      `[LIVE-002] Storage 버킷 ${bucket} 의 파일 목록이 로그인 없이 보임
할 일:
1. 개인 파일이 들어가는 버킷이면 비공개로 바꾸고, 내려받을 때 createSignedUrl 로 짧은 서명 URL 을 만든다.
2. storage.objects 정책에 소유자 조건을 넣는다: (storage.foldername(name))[1] = auth.uid()::text
3. 목록(select) 정책을 anon 에 주지 않는다.
확인: 로그인하지 않은 상태로 버킷 목록을 조회해 빈 배열이 나오는지 본다.`,
    ),
  ];
}

/** LIVE-003: 브라우저로 내려가는 JS 에 든 비밀 키 */
export function checkBundle(scriptUrl: string, content: string): LiveFinding[] {
  const seen = new Set<string>();
  const out: LiveFinding[] = [];
  for (const line of content.split("\n")) {
    for (const secret of findSecrets(line)) {
      if (seen.has(secret.value)) continue;
      seen.add(secret.value);
      out.push(
        finding(
          "LIVE-003",
          "critical",
          scriptUrl,
          `배포된 사이트의 JS 파일에 ${secret.name}(${maskSecrets(secret.value)})이 들어 있어 방문자 누구나 꺼낼 수 있습니다.`,
          `[LIVE-003] 배포된 JS(${scriptUrl})에 ${secret.name} 노출
할 일:
1. 이 키를 발급처에서 지금 폐기하고 새로 발급한다(이미 공개됐으므로 코드만 고쳐서는 안 됨).
2. 키를 쓰는 코드를 서버(Route Handler, Server Action)로 옮기고, NEXT_PUBLIC_/VITE_ 접두사를 뗀다.
3. "use client" 파일이나 거기서 import 하는 파일에서 비밀 키를 읽지 않는다.
확인: 다시 배포한 뒤 운영 점검을 돌려 이 항목이 사라지는지 본다.`,
        ),
      );
    }
  }
  return out;
}

const HEADER_RULES: {
  header: string;
  test: (value: string | undefined, all: Record<string, string>) => boolean;
  severity: Severity;
  detail: string;
  fix: string;
}[] = [
  {
    header: "strict-transport-security",
    test: (v) => !!v && /max-age=\d{6,}/.test(v),
    severity: "medium",
    detail:
      "HSTS 가 없으면 공용 와이파이 같은 곳에서 http 로 바꿔치기한 접속에 당할 수 있습니다.",
    fix: "next.config 의 headers() 에 Strict-Transport-Security: max-age=63072000; includeSubDomains; preload 를 넣는다.",
  },
  {
    header: "content-security-policy",
    test: (v) => !!v,
    severity: "medium",
    detail:
      "CSP 가 없으면 XSS 가 생겼을 때 다른 사이트의 스크립트까지 그대로 실행됩니다.",
    fix: "Content-Security-Policy 헤더를 넣는다. 처음에는 Content-Security-Policy-Report-Only 로 시작해 깨지는 곳을 확인한다.",
  },
  {
    header: "x-frame-options",
    test: (v, all) =>
      !!v || /frame-ancestors/.test(all["content-security-policy"] ?? ""),
    severity: "low",
    detail:
      "다른 사이트가 이 페이지를 iframe 으로 감싸 버튼을 누르게 속일 수 있습니다(클릭재킹).",
    fix: "X-Frame-Options: DENY 또는 CSP 의 frame-ancestors 'none' 을 넣는다.",
  },
  {
    header: "x-content-type-options",
    test: (v) => v?.toLowerCase() === "nosniff",
    severity: "low",
    detail:
      "브라우저가 파일 종류를 추측해 업로드 파일을 스크립트로 실행할 수 있습니다.",
    fix: "X-Content-Type-Options: nosniff 를 넣는다.",
  },
];

/** LIVE-004: 첫 페이지 응답의 보안 헤더 */
export function checkHeaders(headers: Record<string, string>): LiveFinding[] {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return HEADER_RULES.filter((r) => !r.test(lower[r.header], lower)).map((r) =>
    finding(
      "LIVE-004",
      r.severity,
      r.header,
      r.detail,
      `[LIVE-004] 응답에 ${r.header} 헤더가 없음\n할 일: ${r.fix}\n확인: 배포 후 브라우저 개발자 도구 Network 탭에서 응답 헤더를 본다.`,
    ),
  );
}

/** 밖에서 열리면 안 되는 경로와, 진짜 그 파일인지 확인하는 내용 */
export const SENSITIVE_PATHS: {
  path: string;
  looksReal: (body: string) => boolean;
  severity: Severity;
}[] = [
  {
    path: "/.env",
    looksReal: (b) => /^\s*[A-Z][A-Z0-9_]*\s*=/m.test(b) && !/<html/i.test(b),
    severity: "critical",
  },
  {
    path: "/.env.local",
    looksReal: (b) => /^\s*[A-Z][A-Z0-9_]*\s*=/m.test(b) && !/<html/i.test(b),
    severity: "critical",
  },
  {
    path: "/.git/config",
    looksReal: (b) => /\[core\]/.test(b),
    severity: "high",
  },
  {
    path: "/.git/HEAD",
    looksReal: (b) => /^ref: refs\//.test(b.trim()),
    severity: "high",
  },
];

/** LIVE-005: 열려 있는 민감 파일 */
export function checkExposedFile(
  path: string,
  status: number,
  body: string,
): LiveFinding[] {
  const rule = SENSITIVE_PATHS.find((p) => p.path === path);
  if (!rule || status !== 200 || !rule.looksReal(body)) return [];
  return [
    finding(
      "LIVE-005",
      rule.severity,
      path,
      `${path} 가 누구나 내려받을 수 있게 열려 있습니다. ${path.startsWith("/.env") ? "환경 변수 파일에는 비밀 키가 들어 있습니다." : "Git 기록으로 소스 코드 전체를 복원할 수 있습니다."}`,
      `[LIVE-005] ${path} 가 공개돼 있음
할 일:
1. 배포 폴더(public, dist, out)에서 ${path} 를 지우고, 빌드에 포함되지 않게 한다.
2. ${path.startsWith("/.env") ? "그 파일에 있던 키를 모두 폐기하고 새로 발급한다." : "리포가 비공개였다면 코드에 있던 키를 모두 새로 발급한다."}
3. 웹 서버 설정에서 점(.)으로 시작하는 경로를 막는다.
확인: 브라우저로 ${path} 를 열어 404 가 나오는지 본다.`,
    ),
  ];
}

/** 소스맵이 열려 있으면 원본 코드가 보인다(낮음). */
export function checkSourceMap(
  scriptUrl: string,
  status: number,
  body: string,
): LiveFinding[] {
  if (status !== 200 || !/"sources"\s*:/.test(body.slice(0, 2000))) return [];
  return [
    finding(
      "LIVE-005",
      "low",
      `${scriptUrl}.map`,
      "소스맵이 공개돼 있어 압축 전 원본 코드와 주석을 누구나 볼 수 있습니다.",
      `[LIVE-005] 소스맵(${scriptUrl}.map) 공개
할 일: 운영 빌드에서 브라우저 소스맵을 끄거나(next.config 의 productionBrowserSourceMaps: false), Sentry 등에만 올린다.
확인: .map 주소를 열어 404 가 나오는지 본다.`,
    ),
  ];
}

/** LIVE-007: Supabase Auth 공개 설정 */
export function checkAuthSettings(settings: {
  mailer_autoconfirm?: boolean;
  disable_signup?: boolean;
}): LiveFinding[] {
  if (settings.mailer_autoconfirm !== true || settings.disable_signup === true)
    return [];
  return [
    finding(
      "LIVE-007",
      "low",
      "auth/v1/settings",
      "이메일 확인 없이 바로 가입·로그인됩니다. 남의 이메일로 계정을 만들거나 봇이 대량 가입할 수 있습니다.",
      `[LIVE-007] 이메일 확인 없이 가입 허용
할 일: Supabase 대시보드 Authentication → Sign In / Providers → Email 에서 Confirm email 을 켠다. 가입이 필요 없으면 Allow new users to sign up 을 끈다.
확인: 새 이메일로 가입해 확인 메일을 눌러야 로그인되는지 본다.`,
    ),
  ];
}

const CREATE_TABLE = new RegExp(
  String.raw`^create\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?${TABLE_NAME}`,
  "i",
);
const ENABLE_RLS = new RegExp(
  String.raw`^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${TABLE_NAME}[\s\S]*\benable\s+row\s+level\s+security`,
  "i",
);
const BUCKET_ROW =
  /insert\s+into\s+storage\.buckets[\s\S]*?values\s*([\s\S]*)/i;

/** 마이그레이션에서 만든 테이블과 RLS 를 켰는지(LIVE-006 비교용), Storage 버킷 이름, 각각 만든 위치 */
export function schemaFromMigrations(files: SourceFile[]) {
  const rls = new Map<string, boolean>();
  const buckets = new Set<string>();
  const tableAt = new Map<string, CodeLocation>();
  const rlsAt = new Map<string, CodeLocation>();
  const bucketAt = new Map<string, CodeLocation>();
  const sql = files
    .filter((f) => isSqlFile(f.path))
    .sort((a, b) => a.path.localeCompare(b.path));
  for (const file of sql) {
    for (const stmt of splitSqlStatements(file.content)) {
      const create = stmt.text.match(CREATE_TABLE);
      if (create) {
        const name = normalizeTableName(create[1]!);
        if (!rls.has(name)) rls.set(name, false);
        if (!tableAt.has(name))
          tableAt.set(name, {
            path: file.path,
            line: stmt.line,
            what: "create table",
          });
      }
      const enable = stmt.text.match(ENABLE_RLS);
      if (enable) {
        const name = normalizeTableName(enable[1]!);
        rls.set(name, true);
        rlsAt.set(name, {
          path: file.path,
          line: stmt.line,
          what: "enable row level security",
        });
      }
      const bucket = stmt.text.match(BUCKET_ROW);
      if (bucket)
        for (const m of bucket[1]!.matchAll(/\(\s*'([^']+)'/g)) {
          buckets.add(m[1]!);
          if (!bucketAt.has(m[1]!))
            bucketAt.set(m[1]!, {
              path: file.path,
              line: stmt.line,
              what: "storage.buckets",
            });
        }
    }
  }
  return { rls, buckets, tableAt, rlsAt, bucketAt };
}

/**
 * 운영에서 찾은 문제를 리포의 마이그레이션 위치와 잇는다.
 * LIVE-001: 테이블을 만든 곳, LIVE-006: RLS 를 켠 곳(운영에 반영 안 됨), LIVE-002: 버킷을 만든 곳.
 * 수정 프롬프트에도 파일을 적어 AI 코딩 도구가 바로 찾아가게 한다.
 */
export function linkToCode(
  findings: LiveFinding[],
  schema: ReturnType<typeof schemaFromMigrations>,
): LiveFinding[] {
  return findings.map((f) => {
    const name = normalizeTableName(f.target);
    const code =
      f.id === "LIVE-001"
        ? schema.tableAt.get(name)
        : f.id === "LIVE-006"
          ? (schema.rlsAt.get(name) ?? schema.tableAt.get(name))
          : f.id === "LIVE-002"
            ? schema.bucketAt.get(f.target)
            : undefined;
    if (!code) return f;
    return {
      ...f,
      code,
      fix: `${f.fix}\n참고: 리포에서 이것을 만든 곳은 ${code.path}:${code.line} (${code.what}) 입니다. 그 파일을 고치지 말고 새 마이그레이션을 추가한다.`,
    };
  });
}

const SUPABASE_URL =
  /https:\/\/[a-z0-9]{20}\.supabase\.co\b|https?:\/\/(?:127\.0\.0\.1|localhost):543\d\d\b/g;
const PUBLIC_KEY =
  /\bsb_publishable_[A-Za-z0-9_-]{20,}|\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

/** 배포된 JS 에서 Supabase 주소와 공개 키를 찾는다(공격자가 보는 것과 같은 방법). service_role 은 제외. */
export function findSupabaseConfig(texts: string[]) {
  let url: string | null = null;
  let key: string | null = null;
  for (const text of texts) {
    url ??= text.match(SUPABASE_URL)?.[0] ?? null;
    for (const m of text.matchAll(PUBLIC_KEY)) {
      if (findSecrets(m[0]).length > 0) continue;
      key ??= m[0];
    }
    if (url && key) break;
  }
  return url && key ? { url, key } : null;
}
