import { describe, expect, it } from "vitest";
import { redact } from "../lib/redact";

// 테스트용 가짜 값. 실제 계정과 무관하다.
const FAKE_OPENAI = "{{OPENAI_KEY}}";
const FAKE_STRIPE = "{{STRIPE_LIVE_KEY}}";

describe("redact", () => {
  it("OpenAI 키를 가린다", () => {
    expect(redact(`key=${FAKE_OPENAI}`)).toBe("key=[REDACTED]");
  });

  it("Stripe 키를 가린다", () => {
    expect(redact(`stripe ${FAKE_STRIPE} failed`)).toBe("stripe [REDACTED] failed");
  });

  it("평범한 문장은 그대로 둔다", () => {
    expect(redact("hello world")).toBe("hello world");
  });
});
