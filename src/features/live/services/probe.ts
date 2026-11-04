import "server-only";
import {
  checkAuthSettings,
  checkBucketListing,
  checkBundle,
  checkExposedFile,
  checkHeaders,
  checkSourceMap,
  checkTableExposure,
  findSupabaseConfig,
  linkToCode,
  schemaFromMigrations,
  SENSITIVE_PATHS,
  type LiveFinding,
} from "@lego/scanner";
import { readRepoAtCommit } from "@/lib/github/repo-files";
import { reportError } from "@/lib/monitoring";
import { safeFetch, type SafeResponse } from "@/lib/net/safe-fetch";

/** 점검 한 번에 보내는 요청 수 상한. 남의 서버에 부담을 주지 않게 작게 둔다. */
const MAX_REQUESTS = 80;
const MAX_SCRIPTS = 25;
const MAX_TABLES = 40;
const MAX_BUCKETS = 10;
// openapi 로 테이블 목록을 못 얻을 때 시도하는 흔한 테이블
const COMMON_TABLES = [
  "profiles",
  "users",
  "orders",
  "payments",
  "messages",
  "posts",
  "todos",
  "notes",
  "customers",
  "subscriptions",
];

export type ProbeResult = {
  findings: LiveFinding[];
  requests: number;
  supabase: "found" | "not_found";
  tables: number;
  buckets: number;
  scripts: number;
  notes: string[];
};

type Repo = {
  installationId: number | null;
  repoFullName: string;
  commitSha: string | null;
};

const scriptSrcs = (html: string, base: string) => {
  const origin = new URL(base).origin;
  const out: string[] = [];
  for (const m of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    try {
      const url = new URL(m[1]!, base);
      if (url.origin === origin && !out.includes(url.toString()))
        out.push(url.toString());
    } catch {
      // 잘못된 주소는 건너뛴다.
    }
  }
  return out.slice(0, MAX_SCRIPTS);
};

const rowCount = (res: SafeResponse) => {
  if (res.status !== 200 && res.status !== 206) return 0;
  const total = res.headers["content-range"]?.split("/")[1];
  if (total && total !== "*") return Number(total) || 0;
  try {
    const rows = JSON.parse(res.body) as unknown;
    return Array.isArray(rows) ? rows.length : 0;
  } catch {
    return 0;
  }
};

/**
 * 배포된 사이트 하나를 밖에서 점검한다. 응답 내용(행, 파일)은 돌려주지 않고 판정만 돌려준다.
 * 실패한 요청은 건너뛰고 notes 에 남긴다.
 */
export async function probeSite(
  siteUrl: string,
  repo: Repo,
): Promise<ProbeResult> {
  let requests = 0;
  const notes: string[] = [];
  const findings: LiveFinding[] = [];
  let schema: ReturnType<typeof schemaFromMigrations> | null = null;
  const get = async (url: string, init?: Parameters<typeof safeFetch>[1]) => {
    if (requests >= MAX_REQUESTS) return null;
    requests++;
    try {
      return await safeFetch(url, init);
    } catch {
      return null;
    }
  };

  // 1. 첫 페이지: 보안 헤더, 스크립트 목록
  const home = await get(siteUrl);
  if (!home) throw new Error("사이트에 연결하지 못했습니다.");
  if (home.url.startsWith("https:"))
    findings.push(...checkHeaders(home.headers));
  else notes.push("http 주소라 HSTS 등 보안 헤더 점검을 건너뛰었습니다.");

  // 2. 배포된 JS: 비밀 키, 소스맵, Supabase 설정
  const scripts = scriptSrcs(home.body, home.url);
  const texts = [home.body];
  for (const [i, src] of scripts.entries()) {
    const res = await get(src);
    if (!res || res.status !== 200) continue;
    texts.push(res.body);
    findings.push(...checkBundle(new URL(src).pathname, res.body));
    if (i < 3) {
      const map = await get(`${src}.map`);
      if (map)
        findings.push(
          ...checkSourceMap(new URL(src).pathname, map.status, map.body),
        );
    }
  }

  // 3. 열려 있으면 안 되는 파일
  for (const { path } of SENSITIVE_PATHS) {
    const res = await get(new URL(path, home.url).toString());
    if (res) findings.push(...checkExposedFile(path, res.status, res.body));
  }

  // 4. Supabase: 번들에서 찾은 주소·공개 키로, 로그인하지 않은 사람이 할 수 있는 것만 해 본다(읽기만).
  const config = findSupabaseConfig(texts);
  let tables = 0;
  let buckets = 0;
  if (!config) {
    notes.push(
      "배포된 JS 에서 Supabase 주소와 공개 키를 찾지 못해 DB·Storage 점검을 건너뛰었습니다.",
    );
  } else {
    const headers = {
      apikey: config.key,
      authorization: `Bearer ${config.key}`,
    };
    schema = await repoSchema(repo, notes);

    const names = new Set<string>();
    const openapi = await get(`${config.url}/rest/v1/`, { headers });
    if (openapi?.status === 200) {
      try {
        const spec = JSON.parse(openapi.body) as {
          paths?: Record<string, unknown>;
        };
        for (const path of Object.keys(spec.paths ?? {}))
          if (/^\/[\w-]+$/.test(path)) names.add(path.slice(1));
      } catch {
        // openapi 가 막혀 있으면 아래 목록으로 시도한다.
      }
    }
    for (const t of schema.rls.keys()) if (!t.includes(".")) names.add(t);
    if (names.size === 0) COMMON_TABLES.forEach((t) => names.add(t));

    for (const table of [...names].slice(0, MAX_TABLES)) {
      const res = await get(
        `${config.url}/rest/v1/${encodeURIComponent(table)}?select=*&limit=1`,
        {
          headers: {
            ...headers,
            prefer: "count=exact",
            "range-unit": "items",
            range: "0-0",
          },
        },
      );
      if (!res) continue;
      tables++;
      findings.push(...checkTableExposure(table, rowCount(res), schema.rls));
    }

    const bucketNames = new Set(schema.buckets);
    const listed = await get(`${config.url}/storage/v1/bucket`, { headers });
    if (listed?.status === 200) {
      try {
        for (const b of JSON.parse(listed.body) as { id: string }[])
          bucketNames.add(b.id);
      } catch {
        // 목록을 못 보면 마이그레이션의 버킷 이름만 쓴다.
      }
    }
    for (const bucket of [...bucketNames].slice(0, MAX_BUCKETS)) {
      const res = await get(
        `${config.url}/storage/v1/object/list/${encodeURIComponent(bucket)}`,
        {
          method: "POST",
          headers: { ...headers, "content-type": "application/json" },
          body: JSON.stringify({ prefix: "", limit: 5, offset: 0 }),
        },
      );
      if (!res) continue;
      buckets++;
      let count = 0;
      try {
        const objects = JSON.parse(res.body) as unknown;
        count =
          res.status === 200 && Array.isArray(objects) ? objects.length : 0;
      } catch {
        count = 0;
      }
      findings.push(...checkBucketListing(bucket, count));
    }

    const auth = await get(`${config.url}/auth/v1/settings`, { headers });
    if (auth?.status === 200) {
      try {
        findings.push(...checkAuthSettings(JSON.parse(auth.body)));
      } catch {
        // 설정을 못 읽으면 건너뛴다.
      }
    }
  }
  if (requests >= MAX_REQUESTS)
    notes.push(
      `요청 ${MAX_REQUESTS}개 상한에 닿아 일부 항목은 점검하지 못했습니다.`,
    );

  return {
    findings: schema ? linkToCode(findings, schema) : findings,
    requests,
    supabase: config ? "found" : "not_found",
    tables,
    buckets,
    scripts: scripts.length,
    notes,
  };
}

/** 마이그레이션의 테이블·RLS·버킷. 스캔한 적이 없거나 읽기에 실패하면 비교하지 않는다. */
async function repoSchema(repo: Repo, notes: string[]) {
  if (!repo.commitSha) {
    notes.push(
      "이 프로젝트를 보안 점검한 적이 없어 코드(마이그레이션)와 운영 상태는 비교하지 않았습니다.",
    );
    return schemaFromMigrations([]);
  }
  try {
    const snapshot = await readRepoAtCommit(
      { installationId: repo.installationId },
      repo.repoFullName,
      repo.commitSha,
    );
    return schemaFromMigrations(snapshot.files);
  } catch (error) {
    reportError(error, { area: "live.repo" });
    notes.push("리포를 읽지 못해 코드와 운영 상태는 비교하지 않았습니다.");
    return schemaFromMigrations([]);
  }
}
