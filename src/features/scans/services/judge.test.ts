import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const generateStructured = vi.fn();
vi.mock("@/lib/llm", () => ({
  LLM_MODELS: { triage: "haiku", explain: "sonnet" },
  generateStructured: (...args: unknown[]) => generateStructured(...args),
}));

const { explain } = await import("./judge");

const item = (id: number) => ({
  id,
  ruleId: "SEC-014",
  ruleTitle: "의존성",
  filePath: "package-lock.json",
  lineStart: 1,
  lineEnd: 1,
  reason: "취약점",
  context: "1 | x",
});
const usage = {
  model: "sonnet",
  inputTokens: 1,
  outputTokens: 1,
  costUsd: 0,
  latencyMs: 1,
};
const answer = (ids: number[]) => ({
  ok: true,
  usage,
  data: {
    items: ids.map((id) => ({
      id,
      explanation: `설명 ${id}`,
      fix_prompt: `프롬프트 ${id}`,
    })),
  },
});
const fail = (code: string) => ({
  ok: false,
  usage,
  error: { code, message: code },
});

describe("explain", () => {
  beforeEach(() => generateStructured.mockReset());

  it("묶음이 실패하면 항목을 하나씩 다시 요청한다", async () => {
    generateStructured
      .mockResolvedValueOnce(fail("parse_failed"))
      .mockResolvedValueOnce(answer([0]))
      .mockResolvedValueOnce(answer([1]));
    const out = await explain(
      [item(0), item(1)],
      "next",
      async () => true,
      async () => {},
    );
    expect([...out.results.keys()]).toEqual([0, 1]);
    expect(out.failures).toEqual(["parse_failed"]);
    expect(generateStructured).toHaveBeenCalledTimes(3);
  });

  it("일부만 돌려받으면 빠진 항목만 다시 요청한다", async () => {
    generateStructured
      .mockResolvedValueOnce(answer([0]))
      .mockResolvedValueOnce(answer([1]));
    const out = await explain(
      [item(0), item(1)],
      "next",
      async () => true,
      async () => {},
    );
    expect(out.results.size).toBe(2);
    expect(generateStructured).toHaveBeenCalledTimes(2);
  });

  it("거절은 다시 보내지 않는다", async () => {
    generateStructured.mockResolvedValueOnce(fail("refused"));
    const out = await explain(
      [item(0), item(1)],
      "next",
      async () => true,
      async () => {},
    );
    expect(out.refused).toBe(2);
    expect(generateStructured).toHaveBeenCalledTimes(1);
  });
});
