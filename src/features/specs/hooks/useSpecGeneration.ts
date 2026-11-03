"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GenerationEvent, GenerationStage } from "../schemas";

export type StageState = Partial<Record<GenerationStage, "start" | "done">>;

/** 생성 Route Handler 의 NDJSON 스트림을 읽어 단계별 진행을 보여준다. 끝나면 화면을 새로 읽는다. */
export function useSpecGeneration(specId: string) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [stages, setStages] = useState<StageState>({});
  const [error, setError] = useState<string | null>(null);

  const handle = (event: GenerationEvent) => {
    if (event.type === "stage") {
      setStages((s) => ({ ...s, [event.stage]: event.status }));
    } else if (event.type === "error") {
      setError(event.message);
    }
  };

  const start = async () => {
    setRunning(true);
    setStages({});
    setError(null);
    try {
      const res = await fetch(`/api/specs/${specId}/generate`, {
        method: "POST",
      });
      if (!res.ok || !res.body) {
        setError("생성을 시작하지 못했습니다.");
        return;
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) handle(JSON.parse(line) as GenerationEvent);
        }
      }
    } catch {
      setError(
        "연결이 끊겼습니다. 생성은 서버에서 계속되니 잠시 뒤 새로고침해 주세요.",
      );
    } finally {
      setRunning(false);
      router.refresh();
    }
  };

  return { start, running, stages, error };
}
