import "server-only";
import type { LlmUsage } from "@/lib/llm";
import { addTokenUsage, insertLlmCall } from "../repository";
import type { UsageSink } from "./llm-stages";

/** LLM 호출을 llm_calls 에 남기고 월 토큰 사용량에 더한다. */
export function usageRecorder(userId: string, specId: string): UsageSink {
  return async (purpose: string, usage: LlmUsage) => {
    await insertLlmCall({
      user_id: userId,
      spec_id: specId,
      purpose,
      model: usage.model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cost_usd: usage.costUsd,
      latency_ms: usage.latencyMs,
    });
    await addTokenUsage(userId, usage.inputTokens + usage.outputTokens);
  };
}

export async function hasTokenQuota(userId: string) {
  const { data } = await addTokenUsage(userId, 0);
  return data !== false;
}
