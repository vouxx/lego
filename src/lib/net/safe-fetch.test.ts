import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { isPrivateIp, sameSite } = await import("./safe-fetch");

describe("isPrivateIp", () => {
  const hostOf = (ip: string) =>
    new URL(`https://[${ip}]/`).hostname.replace(/^\[|\]$/g, "");

  it.each([
    "::ffff:127.0.0.1",
    "::ffff:169.254.169.254",
    "::ffff:10.0.0.1",
    "::7f00:1",
    "64:ff9b::a9fe:a9fe",
    "2002:7f00:1::",
    "fec0::1",
    "fe80::1",
    "fd00::1",
    "::1",
    "2001:db8::1",
    "2001:0:1::",
  ])("IPv6 내부·터널 주소를 막는다: %s", (ip) => {
    expect(isPrivateIp(hostOf(ip))).toBe(true);
  });

  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "169.254.169.254",
    "192.168.0.1",
    "100.64.0.1",
    "198.18.0.1",
    "0.0.0.0",
  ])("IPv4 내부 주소를 막는다: %s", (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it("공인 주소는 통과한다", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp(hostOf("2606:4700:4700::1111"))).toBe(false);
  });
});

describe("sameSite", () => {
  const onSite = sameSite("https://example.com");
  it("www 차이만 허용한다", () => {
    expect(onSite(new URL("https://www.example.com/a"))).toBe(true);
    expect(onSite(new URL("https://example.com/a"))).toBe(true);
    expect(onSite(new URL("https://victim.com/"))).toBe(false);
    expect(onSite(new URL("https://example.com.evil.org/"))).toBe(false);
  });
});
