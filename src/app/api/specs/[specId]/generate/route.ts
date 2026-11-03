import { after } from "next/server";
import { z } from "zod";
import type { GenerationEvent } from "@/features/specs/schemas";
import { generateSpec } from "@/features/specs/services/generate";
import { getCurrentUser } from "@/lib/auth";

// PRD → 설계 → 작업 → 프롬프트까지 1~3분 걸린다.
export const maxDuration = 300;

/**
 * 스펙 생성 진행을 NDJSON(한 줄에 이벤트 하나)으로 흘려보낸다.
 * 생성은 응답과 따로 돌아서, 사용자가 탭을 닫아도 after() 로 끝까지 진행된다.
 */
export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/specs/[specId]/generate">,
) {
  const { specId } = await params;
  if (!z.uuid().safeParse(specId).success) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const queue: GenerationEvent[] = [];
  const state: { finished: boolean; wake: (() => void) | null } = {
    finished: false,
    wake: null,
  };
  const run = (async () => {
    for await (const event of generateSpec(user, specId)) {
      queue.push(event);
      state.wake?.();
    }
    state.finished = true;
    state.wake?.();
  })();
  after(run);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (queue.length === 0 && !state.finished) {
        await new Promise<void>((resolve) => (state.wake = resolve));
      }
      const event = queue.shift();
      if (event)
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      else controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
