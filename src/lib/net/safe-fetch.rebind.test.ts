import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const lookup = vi.fn();
vi.mock("node:dns/promises", () => ({ lookup }));
const { safeFetch } = await import("./safe-fetch");

describe("DNS rebinding", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    lookup.mockReset();
  });

  it("검사 때는 공인 IP, 연결할 때는 내부 IP 를 주면 연결하지 않는다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    lookup
      .mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
      .mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    await expect(safeFetch("https://rebind.test/")).rejects.toMatchObject({
      cause: expect.objectContaining({
        message: "내부망 주소는 점검할 수 없습니다.",
      }),
    });
    expect(lookup.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("443·8443 밖의 포트는 막는다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    await expect(safeFetch("https://example.com:6379/")).rejects.toThrow(
      "443, 8443",
    );
  });

  it("stayOn 밖으로 가는 주소는 요청하지 않는다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    await expect(
      safeFetch("https://victim.example/", { stayOn: () => false }),
    ).rejects.toThrow("확인한 사이트 밖");
  });
});
