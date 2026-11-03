/**
 * 공개 리포를 GitHub API 없이 읽기 위한 파서.
 * - git smart HTTP 의 info/refs 응답에서 기본 브랜치와 커밋을 읽는다.
 * - codeload 가 주는 커밋 tarball(ustar/pax)에서 파일을 꺼낸다.
 * 서버 전용 코드에서 쓰지만 테스트하려고 server-only 를 붙이지 않는다.
 */

export type GitRefs = {
  head: { branch: string; sha: string } | null;
  branches: Map<string, string>;
};

/** pkt-line(4자리 16진수 바이트 길이 + 내용, 0000 은 flush) 을 내용 목록으로 나눈다. */
function pktLines(body: Buffer) {
  const lines: string[] = [];
  let offset = 0;
  while (offset + 4 <= body.length) {
    const length = Number.parseInt(
      body.subarray(offset, offset + 4).toString(),
      16,
    );
    if (Number.isNaN(length)) break;
    if (length < 4) {
      offset += 4; // flush / delimiter
      continue;
    }
    lines.push(
      body
        .subarray(offset + 4, offset + length)
        .toString("utf8")
        .replace(/\n$/, ""),
    );
    offset += length;
  }
  return lines;
}

/** `GET https://github.com/<owner>/<repo>.git/info/refs?service=git-upload-pack` 응답을 읽는다. */
export function parseGitRefs(body: string | Buffer): GitRefs {
  const branches = new Map<string, string>();
  let headSha: string | null = null;
  let headBranch: string | null = null;

  for (const line of pktLines(
    typeof body === "string" ? Buffer.from(body) : body,
  )) {
    const match = /^([0-9a-f]{40}) ([^\0\s]+)(?:\0(.*))?$/.exec(line);
    if (!match) continue;
    const [, sha, ref, caps] = match;
    if (ref === "HEAD") {
      headSha = sha!;
      headBranch =
        /symref=HEAD:refs\/heads\/(\S+)/.exec(caps ?? "")?.[1] ?? null;
    } else if (ref!.startsWith("refs/heads/")) {
      branches.set(ref!.slice("refs/heads/".length), sha!);
    }
  }
  return {
    head: headSha && headBranch ? { branch: headBranch, sha: headSha } : null,
    branches,
  };
}

export type TarFile = { path: string; size: number; content: Buffer };

const BLOCK = 512;

function readString(buf: Buffer, start: number, length: number) {
  const end = buf.indexOf(0, start);
  return buf
    .subarray(start, end === -1 || end > start + length ? start + length : end)
    .toString("utf8");
}

function readOctal(buf: Buffer, start: number, length: number) {
  const text = readString(buf, start, length).trim();
  return text ? Number.parseInt(text, 8) : 0;
}

function paxPath(content: Buffer) {
  // "길이 key=value\n" 레코드의 연속
  let offset = 0;
  let path: string | null = null;
  while (offset < content.length) {
    const space = content.indexOf(0x20, offset);
    if (space === -1) break;
    const length = Number.parseInt(
      content.subarray(offset, space).toString(),
      10,
    );
    if (!length) break;
    const record = content
      .subarray(space + 1, offset + length - 1)
      .toString("utf8");
    const eq = record.indexOf("=");
    if (record.slice(0, eq) === "path") path = record.slice(eq + 1);
    offset += length;
  }
  return path;
}

/** tar 안의 일반 파일을 돌려준다. 디렉터리·링크는 건너뛴다. */
export function* readTar(tar: Buffer): Generator<TarFile> {
  let offset = 0;
  let longName: string | null = null;

  while (offset + BLOCK <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK);
    if (header.every((b) => b === 0)) break;

    const size = readOctal(header, 124, 12);
    const type = String.fromCharCode(header[156] ?? 0);
    const name = readString(header, 0, 100);
    const prefix = readString(header, 345, 155);
    const dataStart = offset + BLOCK;
    const content = tar.subarray(dataStart, dataStart + size);
    offset = dataStart + Math.ceil(size / BLOCK) * BLOCK;

    if (type === "x" || type === "L") {
      longName =
        type === "x"
          ? paxPath(content)
          : readString(content, 0, content.length);
      continue;
    }
    if (type === "g") continue;

    const path = longName ?? (prefix ? `${prefix}/${name}` : name);
    longName = null;
    if (type === "0" || type === "\0") yield { path, size, content };
  }
}
