import "server-only";
import { lookup } from "node:dns/promises";
import { isIP, type LookupFunction } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

/**
 * 사용자가 준 주소로 서버가 요청할 때 쓴다(운영 점검). SSRF 를 막기 위해:
 * - https 만(개발 환경에서는 localhost http 허용)
 * - 공인 주소만 허용(IPv6 는 전역 유니캐스트만). 호스트 포트는 443·8443 만(운영)
 * - 주소를 DNS 로 풀어 검사하고, 실제 연결할 때도 같은 검사를 거친다(DNS rebinding 방지)
 * - 리다이렉트는 직접 따라가며 매번 다시 검사, 최대 3번
 * - 시간 제한 8초, 본문 2MB
 */
const TIMEOUT_MS = 8_000;
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;

export class BlockedUrlError extends Error {}

const allowLocal = () => process.env.NODE_ENV !== "production";

const ALLOWED_PORTS = new Set(["", "443", "8443"]);

/** 허용 목록 방식. 전역 유니캐스트(2000::/3) 밖은 전부 막는다(IPv4 매핑, NAT64, 사이트 로컬 포함). */
function isPrivateIpv6(ip: string) {
  const [first = "", second = ""] = ip.toLowerCase().split(":");
  if (first === "") return true; // ::1, ::ffff:…, ::7f00:1
  const head = parseInt(first, 16);
  if ((head & 0xe000) !== 0x2000) return true;
  if (head === 0x2002) return true; // 6to4 는 안쪽 IPv4 로 이어진다
  if (head === 0x2001) {
    const next = parseInt(second || "0", 16);
    return next === 0 || next === 0xdb8; // Teredo, 문서용
  }
  return false;
}

export function isPrivateIp(ip: string) {
  if (isIP(ip) === 6) return isPrivateIpv6(ip);
  const [a, b, c] = ip.split(".").map(Number) as [number, number, number];
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
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
  if (!ALLOWED_PORTS.has(url.port))
    throw new BlockedUrlError("443, 8443 포트만 점검할 수 있습니다.");
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

/** 연결 직전에 다시 풀어 검사한다. 검사와 연결 사이에 DNS 응답을 바꾸는 공격을 막는다. */
const checkedLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true, verbatim: true }).then(
    (addresses) => {
      const blocked = addresses.find((a) => isPrivateIp(a.address));
      if (blocked || addresses.length === 0) {
        callback(
          new BlockedUrlError(
            "내부망 주소는 점검할 수 없습니다.",
          ) as NodeJS.ErrnoException,
          "",
        );
      } else if (options.all) {
        callback(null, addresses);
      } else {
        callback(null, addresses[0]!.address, addresses[0]!.family);
      }
    },
    (error: NodeJS.ErrnoException) => callback(error, ""),
  );
};

let agent: Agent | undefined;
const pinnedAgent = () =>
  (agent ??= new Agent({ connect: { lookup: checkedLookup } }));

/** 같은 사이트인지. www 만 다른 주소는 같은 사이트로 본다(apex → www 리다이렉트가 흔하다). */
export const sameSite = (siteUrl: string) => {
  const host = (url: URL) => url.hostname.replace(/^www\./, "");
  const expected = host(new URL(siteUrl));
  return (url: URL) => host(url) === expected;
};

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
    /** 이 사이트를 벗어나는 리다이렉트는 따라가지 않는다(소유를 확인한 사이트만 점검). */
    stayOn?: (url: URL) => boolean;
  } = {},
): Promise<SafeResponse> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);
    if (init.stayOn && !init.stayOn(url))
      throw new BlockedUrlError("확인한 사이트 밖으로 이동하는 주소입니다.");
    const res = await undiciFetch(url, {
      method: init.method ?? "GET",
      headers: { "user-agent": "lego-live-check", ...init.headers },
      body: init.body,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      dispatcher: allowLocal() ? undefined : pinnedAgent(),
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
