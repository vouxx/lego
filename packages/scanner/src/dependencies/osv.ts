import type { Candidate, ScanInput, Severity } from "../types";
import { readDependencies, type Dependency } from "./lockfile";

const OSV = "https://api.osv.dev/v1";
const BATCH = 1000;
const DETAIL_CONCURRENCY = 8;

type OsvVuln = {
  id: string;
  summary?: string;
  aliases?: string[];
  withdrawn?: string;
  database_specific?: { severity?: string };
  affected?: {
    package?: { name?: string; ecosystem?: string };
    ranges?: { events?: { fixed?: string }[] }[];
  }[];
};

const SEVERITY_ORDER: Severity[] = ["low", "medium", "high", "critical"];

function toSeverity(raw: string | undefined): Severity {
  switch (raw?.toUpperCase()) {
    case "CRITICAL":
      return "critical";
    case "HIGH":
      return "high";
    case "LOW":
      return "low";
    default:
      return "medium";
  }
}

const maxSeverity = (a: Severity, b: Severity) =>
  SEVERITY_ORDER.indexOf(a) >= SEVERITY_ORDER.indexOf(b) ? a : b;

function compareVersions(a: string, b: string) {
  const pa = a.split(/[.-]/).map((x) => Number.parseInt(x, 10) || 0);
  const pb = b.split(/[.-]/).map((x) => Number.parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function fixedVersion(vuln: OsvVuln, dep: Dependency) {
  const fixes = (vuln.affected ?? [])
    .filter((a) => a.package?.name === dep.name)
    .flatMap((a) => a.ranges ?? [])
    .flatMap((r) => r.events ?? [])
    .map((e) => e.fixed)
    .filter((v): v is string => !!v && compareVersions(v, dep.version) > 0)
    .sort(compareVersions);
  return fixes[0] ?? null;
}

export type AuditOptions = {
  fetch?: typeof fetch;
  /** 상세 정보를 받아 올 취약점 수 상한 */
  maxDetails?: number;
};

/**
 * SEC-014 알려진 취약점이 있는 의존성 버전. OSV(osv.dev) 에 질의한다.
 * 간접 의존성은 high 이상만 보고해 소음을 줄인다. 네트워크 오류는 throw 한다.
 */
export async function auditDependencies(
  input: ScanInput,
  { fetch: fetchImpl = fetch, maxDetails = 80 }: AuditOptions = {},
): Promise<Candidate[]> {
  const deps = readDependencies(input.files);
  if (deps.length === 0) return [];

  const hits = new Map<Dependency, string[]>();
  for (let i = 0; i < deps.length; i += BATCH) {
    const batch = deps.slice(i, i + BATCH);
    const res = await fetchImpl(`${OSV}/querybatch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        queries: batch.map((d) => ({
          package: { name: d.name, ecosystem: "npm" },
          version: d.version,
        })),
      }),
    });
    if (!res.ok) throw new Error(`OSV querybatch ${res.status}`);
    const data = (await res.json()) as {
      results: { vulns?: { id: string }[] }[];
    };
    data.results.forEach((r, j) => {
      if (r.vulns?.length)
        hits.set(
          batch[j]!,
          r.vulns.map((v) => v.id),
        );
    });
  }

  const ids = [...new Set([...hits.values()].flat())].slice(0, maxDetails);
  const details = new Map<string, OsvVuln>();
  for (let i = 0; i < ids.length; i += DETAIL_CONCURRENCY) {
    await Promise.all(
      ids.slice(i, i + DETAIL_CONCURRENCY).map(async (id) => {
        const res = await fetchImpl(`${OSV}/vulns/${encodeURIComponent(id)}`);
        if (res.ok) details.set(id, (await res.json()) as OsvVuln);
      }),
    );
  }

  const candidates: Candidate[] = [];
  for (const [dep, vulnIds] of hits) {
    const vulns = vulnIds
      .map((id) => details.get(id))
      .filter((v): v is OsvVuln => !!v && !v.withdrawn);
    if (vulns.length === 0) continue;
    const severity = vulns
      .map((v) => toSeverity(v.database_specific?.severity))
      .reduce(maxSeverity);
    if (!dep.direct && SEVERITY_ORDER.indexOf(severity) < 2) continue;

    const fixed = vulns
      .map((v) => fixedVersion(v, dep))
      .filter((v): v is string => !!v)
      .sort(compareVersions)
      .pop();
    const labels = vulns
      .slice(0, 3)
      .map((v) => v.aliases?.find((a) => a.startsWith("CVE-")) ?? v.id);
    candidates.push({
      ruleId: "SEC-014",
      severity,
      filePath: dep.file,
      lineStart: dep.line,
      lineEnd: dep.line,
      snippet: `${dep.name}@${dep.version}`,
      reason: [
        `${dep.direct ? "직접" : "간접"} 의존성 ${dep.name}@${dep.version} 에 알려진 취약점 ${vulns.length}개`,
        `(${labels.join(", ")}${vulns.length > 3 ? " 등" : ""})`,
        vulns[0]?.summary ? `: ${vulns[0].summary}` : "",
        fixed ? `. 고쳐진 버전 ${fixed} 이상` : "",
      ].join(""),
    });
  }
  return candidates;
}
