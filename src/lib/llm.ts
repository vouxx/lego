import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { serverEnv } from "@/lib/env.server";
import type { AppError } from "@/shared/lib/result";

/** 대량 1차 판별은 Haiku, 확정 항목의 설명·수정 프롬프트는 Sonnet (docs/design.md 기술 스택). */
export const LLM_MODELS = {
  triage: "claude-haiku-5-5",
  explain: "claude-sonnet-5-5",
} as const;
export type LlmModel = (typeof LLM_MODELS)[keyof typeof LLM_MODELS];

// 100만 토큰당 달러. 폴백으로 다른 모델이 응답할 수 있어 응답의 model 로 계산한다.
const PRICING: { prefix: string; input: number; output: number }[] = [
  { prefix: "claude-haiku", input: 0.1, output: 0.5 },
  { prefix: "claude-sonnet", input: 2, output: 10 },
  { prefix: "claude-opus", input: 5, output: 25 },
];

export type LlmUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
};

export type LlmOutcome<T> =
  | { ok: true; data: T; usage: LlmUsage }
  | { ok: false; error: AppError; usage: LlmUsage | null };

export function isLlmConfigured() {
  return Boolean(serverEnv().ANTHROPIC_API_KEY);
}

let client: Anthropic | undefined;
function anthropic() {
  client ??= new Anthropic({
    apiKey: serverEnv().ANTHROPIC_API_KEY,
    maxRetries: 2,
    timeout: 120_000,
  });
  return client;
}

function toUsage(
  model: string,
  usage: Anthropic.Beta.BetaUsage,
  startedAt: number,
): LlmUsage {
  const price = PRICING.find((p) => model.startsWith(p.prefix)) ?? PRICING[2]!;
  const inputTokens =
    usage.input_tokens +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0);
  const outputTokens = usage.output_tokens;
  return {
    model,
    inputTokens,
    outputTokens,
    costUsd:
      (inputTokens * price.input + outputTokens * price.output) / 1_000_000,
    latencyMs: Date.now() - startedAt,
  };
}

/** 구조화된 출력 한 번. 실패는 throw 하지 않고 코드로 돌려준다. */
export async function generateStructured<S extends z.ZodType>(params: {
  model: LlmModel;
  system: string;
  prompt: string;
  schema: S;
  maxTokens: number;
  effort: "low" | "medium" | "high";
}): Promise<LlmOutcome<z.infer<S>>> {
  if (!isLlmConfigured()) {
    return {
      ok: false,
      error: {
        code: "llm_not_configured",
        message: "ANTHROPIC_API_KEY 가 없습니다.",
      },
      usage: null,
    };
  }

  const startedAt = Date.now();
  // Haiku 는 서버 측 폴백을 지원하지 않는다. Sonnet 은 보안 코드 분석이 cyber 분류기에 걸릴 때 대비해 켠다.
  const fallback =
    params.model === LLM_MODELS.explain
      ? {
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default" as const,
        }
      : {};

  try {
    const response = await anthropic().beta.messages.parse({
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: [{ role: "user", content: params.prompt }],
      output_config: {
        format: betaZodOutputFormat(params.schema),
        effort: params.effort,
      },
      ...fallback,
    });
    const usage = toUsage(response.model, response.usage, startedAt);

    if (response.stop_reason === "refusal") {
      const category = response.stop_details?.category ?? "unknown";
      return {
        ok: false,
        error: {
          code: "refused",
          message: `모델이 요청을 거절했습니다 (${category}).`,
        },
        usage,
      };
    }
    if (response.stop_reason === "max_tokens") {
      return {
        ok: false,
        error: {
          code: "truncated",
          message: "응답이 max_tokens 에서 잘렸습니다.",
        },
        usage,
      };
    }
    if (response.parsed_output == null) {
      return {
        ok: false,
        error: {
          code: "parse_failed",
          message: "응답 형식이 스키마와 다릅니다.",
        },
        usage,
      };
    }
    return { ok: true, data: response.parsed_output as z.infer<S>, usage };
  } catch (error) {
    const fail = (code: string, message: string) => ({
      ok: false as const,
      error: { code, message },
      usage: null,
    });
    if (error instanceof Anthropic.AuthenticationError)
      return fail("llm_auth", "Anthropic API 키가 올바르지 않습니다.");
    if (error instanceof Anthropic.RateLimitError)
      return fail("llm_rate_limited", "Anthropic API 요청 한도를 넘었습니다.");
    if (error instanceof Anthropic.BadRequestError)
      return fail("llm_bad_request", error.message);
    if (error instanceof Anthropic.APIError)
      return fail("llm_api_error", `Anthropic API 오류 (${error.status})`);
    return fail(
      "llm_unknown",
      error instanceof Error ? error.message : String(error),
    );
  }
}
