import { describe, expect, it } from "vitest";
import { parseGitRefs, readTar } from "./archive";

const pkt = (s: string) => (s.length + 4).toString(16).padStart(4, "0") + s;

describe("parseGitRefs", () => {
  it("기본 브랜치와 브랜치별 커밋을 읽는다", () => {
    const a = "a".repeat(40);
    const b = "b".repeat(40);
    // 실제 응답처럼 줄바꿈 없이 이어지고, flush(0000) 바로 뒤에 HEAD 가 온다.
    const body = [
      pkt("# service=git-upload-pack\n"),
      "0000",
      pkt(
        `${a} HEAD\0multi_ack symref=HEAD:refs/heads/main agent=git/github\n`,
      ),
      pkt(`${a} refs/heads/main\n`),
      pkt(`${b} refs/heads/dev\n`),
      pkt(`${b} refs/tags/v1\n`),
      "0000",
    ].join("");
    const refs = parseGitRefs(body);
    expect(refs.head).toEqual({ branch: "main", sha: a });
    expect([...refs.branches]).toEqual([
      ["main", a],
      ["dev", b],
    ]);
  });
});

function header(name: string, size: number, type = "0", prefix = "") {
  const h = Buffer.alloc(512);
  h.write(name, 0);
  h.write(size.toString(8).padStart(11, "0"), 124);
  h.write(type, 156);
  h.write("ustar", 257);
  if (prefix) h.write(prefix, 345);
  return h;
}
const pad = (b: Buffer) =>
  Buffer.concat([b, Buffer.alloc((512 - (b.length % 512)) % 512)]);

describe("readTar", () => {
  it("일반 파일, prefix, pax 긴 경로를 읽고 디렉터리는 건너뛴다", () => {
    const a = Buffer.from("hello");
    const longPath = "repo-abc/" + "d/".repeat(60) + "x.ts";
    const paxRecord = `path=${longPath}\n`;
    const pax = Buffer.from(`${Buffer.byteLength(paxRecord) + 4} ${paxRecord}`);
    const b = Buffer.from("export {}");
    const tar = Buffer.concat([
      header("repo-abc/", 0, "5"),
      header("a.txt", a.length, "0", "repo-abc"),
      pad(a),
      header("PaxHeader", pax.length, "x"),
      pad(pax),
      header("ignored-name", b.length, "0"),
      pad(b),
      Buffer.alloc(1024),
    ]);
    const files = [...readTar(tar)].map((f) => [f.path, f.content.toString()]);
    expect(files).toEqual([
      ["repo-abc/a.txt", "hello"],
      [longPath, "export {}"],
    ]);
  });
});
