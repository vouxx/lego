import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * 사용자가 준 주소로 서버가 요청할 때 쓴다(운영 점검). SSRF 를 막기 위해:
 * - https 만(개발 환경에서는 localhost http 허용)
 * - 주소를 DNS 로 풀어 사설·루프백·링크 로컬 IP 면 거절(운영)
 * - 리다이렉트는 직접 따라가며 매번 다시 검사, 최대 3번
 * - 시간 제한 8초, 본문 2MB
 */
const TIMEOUT_MS = 8_000;
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;

export class BlockedUrlError extends Error {}

const allowLocal = () => process.env.NODE_ENV !== "production";

function isPrivateIp(ip: string) {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true;
    if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
    return /^(fc|fd|fe8|fe9|fea|feb)/.test(v);
  }
  const [a, b] = ip.split(".").map(Number) as [number, number];
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/;

/** 요청해도 되는 주소인지 검사한다. 안 되면 BlockedUrlError. */
export async function assertPublicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedUrlError("주소 형식이 올바르지 않습니다.");
  }
  if (url.username || url.password)
    throw new BlockedUrlError("주소에 계정 정보를 넣을 수 없습니다.");
  if (allowLocal() && LOCAL_HOST.test(url.hostname)) return url;
  if (url.protocol !== "https:")
    throw new BlockedUrlError("https 주소만 점검할 수 있습니다.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true }).catch(() => {
        throw new BlockedUrlError("주소를 찾을 수 없습니다.");
      });
  if (addresses.some((a) => isPrivateIp(a.address)))
    throw new BlockedUrlError("내부망 주소는 점검할 수 없습니다.");
  return url;
}

export type SafeResponse = {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: string;
};

/** 검사를 거친 GET/POST. 본문은 문자열로 2MB 까지만 읽는다. */
export async function safeFetch(
  raw: string,
  init: {
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    body?: string;
  } = {},
): Promise<SafeResponse> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, {
      method: init.method ?? "GET",
      headers: { "user-agent": "lego-live-check", ...init.headers },
      body: init.body,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, url).toString();
      continue;
    }
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    return {
      url: url.toString(),
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      body: Buffer.concat(chunks).toString("utf8"),
    };
  }
  throw new BlockedUrlError("리다이렉트가 너무 많습니다.");
}
