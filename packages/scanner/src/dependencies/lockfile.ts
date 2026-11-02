import type { SourceFile } from "../types";

export type Dependency = {
  name: string;
  version: string;
  /** 버전을 읽은 파일(lockfile 또는 package.json) */
  file: string;
  line: number;
  /** package.json 에 직접 적힌 의존성인지 */
  direct: boolean;
};

export const LOCKFILES = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"];

export const isDependencyFile = (path: string) => {
  const name = path.split("/").pop() ?? "";
  return name === "package.json" || LOCKFILES.includes(name);
};

const dirOf = (path: string) =>
  path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "";

const lineOf = (content: string, needle: string) => {
  const index = content.indexOf(needle);
  return index < 0 ? 1 : content.slice(0, index).split("\n").length;
};

function directNames(pkgJson: SourceFile | undefined) {
  if (!pkgJson) return new Set<string>();
  try {
    const pkg = JSON.parse(pkgJson.content) as Record<string, unknown>;
    const names = new Set<string>();
    for (const key of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
    ]) {
      const deps = pkg[key];
      if (deps && typeof deps === "object")
        for (const name of Object.keys(deps)) names.add(name);
    }
    return names;
  } catch {
    return new Set<string>();
  }
}

function fromPackageLock(file: SourceFile) {
  const out: Omit<Dependency, "direct">[] = [];
  let lock: {
    packages?: Record<string, { version?: string; link?: boolean }>;
    dependencies?: Record<string, { version?: string }>;
  };
  try {
    lock = JSON.parse(file.content);
  } catch {
    return out;
  }
  if (lock.packages) {
    for (const [key, info] of Object.entries(lock.packages)) {
      if (!key || info.link || !info.version) continue;
      const name = key.slice(key.lastIndexOf("node_modules/") + 13);
      out.push({
        name,
        version: info.version,
        file: file.path,
        line: lineOf(file.content, `"${key}"`),
      });
    }
  } else if (lock.dependencies) {
    for (const [name, info] of Object.entries(lock.dependencies)) {
      if (info.version)
        out.push({
          name,
          version: info.version,
          file: file.path,
          line: lineOf(file.content, `"${name}"`),
        });
    }
  }
  return out;
}

// pnpm v6~v9: "  /name@1.2.3:", "  '@scope/name@1.2.3(peer@1)':", v5: "  /name/1.2.3:"
const PNPM_KEY =
  /^ {2}['"]?\/?((?:@[^/@\s'"]+\/)?[^@/\s'"(]+)[@/](\d[^:('"\s]*)/;

function fromPnpmLock(file: SourceFile) {
  const out: Omit<Dependency, "direct">[] = [];
  const lines = file.content.split("\n");
  let inPackages = false;
  lines.forEach((text, i) => {
    if (/^\S/.test(text)) inPackages = text.startsWith("packages:");
    if (!inPackages) return;
    const match = PNPM_KEY.exec(text);
    if (match)
      out.push({
        name: match[1]!,
        version: match[2]!,
        file: file.path,
        line: i + 1,
      });
  });
  return out;
}

function fromYarnLock(file: SourceFile) {
  const out: Omit<Dependency, "direct">[] = [];
  const lines = file.content.split("\n");
  let pending: { name: string; line: number } | null = null;
  lines.forEach((text, i) => {
    if (
      /^\S.*:$/.test(text) &&
      !text.startsWith("#") &&
      !text.startsWith("__metadata")
    ) {
      const spec = text.split(",")[0]!.replace(/["':]/g, "").trim();
      const at = spec.lastIndexOf("@");
      pending = at > 0 ? { name: spec.slice(0, at), line: i + 1 } : null;
      return;
    }
    const version = /^ {2}version:? "?([^"\s]+)"?/.exec(text);
    if (pending && version) {
      out.push({
        name: pending.name.replace(/^(.+)@npm$/, "$1"),
        version: version[1]!,
        file: file.path,
        line: pending.line,
      });
      pending = null;
    }
  });
  return out;
}

const EXACT = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

/** lockfile 이 없는 package.json 은 ^1.2.3 처럼 최소 버전만 알 수 있어 그 버전으로 본다. */
function fromPackageJson(file: SourceFile) {
  const out: Omit<Dependency, "direct">[] = [];
  try {
    const pkg = JSON.parse(file.content) as Record<string, unknown>;
    for (const key of ["dependencies", "devDependencies"]) {
      const deps = pkg[key] as Record<string, unknown> | undefined;
      if (!deps || typeof deps !== "object") continue;
      for (const [name, range] of Object.entries(deps)) {
        if (typeof range !== "string") continue;
        const version = range.replace(/^[\^~=v]/, "");
        if (EXACT.test(version))
          out.push({
            name,
            version,
            file: file.path,
            line: lineOf(file.content, `"${name}"`),
          });
      }
    }
  } catch {
    // 깨진 package.json 은 건너뛴다.
  }
  return out;
}

/** 리포의 lockfile(없으면 package.json)에서 npm 의존성과 설치 버전을 읽는다. */
export function readDependencies(files: SourceFile[]): Dependency[] {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const seen = new Set<string>();
  const deps: Dependency[] = [];

  for (const file of files) {
    const name = file.path.split("/").pop() ?? "";
    const dir = dirOf(file.path);
    let parsed: Omit<Dependency, "direct">[] = [];
    if (name === "package-lock.json") parsed = fromPackageLock(file);
    else if (name === "pnpm-lock.yaml") parsed = fromPnpmLock(file);
    else if (name === "yarn.lock") parsed = fromYarnLock(file);
    else if (
      name === "package.json" &&
      !LOCKFILES.some((lock) => byPath.has(dir + lock))
    )
      parsed = fromPackageJson(file);
    else continue;

    const direct = directNames(byPath.get(dir + "package.json"));
    for (const dep of parsed) {
      const key = `${dep.name}@${dep.version}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deps.push({ ...dep, direct: direct.has(dep.name) });
    }
  }
  return deps;
}
