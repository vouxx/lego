import { after, NextResponse, type NextRequest } from "next/server";
import { handlePushEvent } from "@/features/context/services/push";
import {
  handlePullRequestEvent,
  processPrReview,
} from "@/features/scans/services/pr-guard";
import { handleSpecPush } from "@/features/specs/services/push";
import {
  handleWebhookEvent,
  verifyWebhookSignature,
} from "@/features/projects/services/webhook";

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!(await verifyWebhookSignature(payload, signature))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const event = request.headers.get("x-github-event");
  const result =
    event === "push"
      ? await handlePush(body)
      : event === "pull_request"
        ? await handlePullRequest(body)
        : await handleWebhookEvent(event, body);
  if (!result.ok) {
    // 500 이면 GitHub 이 재전송한다. 형식 오류는 재전송해도 같으므로 400.
    const status = result.error.code === "invalid_payload" ? 400 : 500;
    return NextResponse.json({ error: result.error.code }, { status });
  }

  return NextResponse.json(result.data);
}

/** push 는 규칙 파일 '업데이트 필요' 표시와 스펙 작업 완료 처리 두 곳에 쓴다. */
async function handlePush(body: unknown) {
  const [context, spec] = await Promise.all([
    handlePushEvent(body),
    handleSpecPush(body),
  ]);
  if (!context.ok) return context;
  if (!spec.ok) return spec;
  return {
    ok: true as const,
    data: { handled: context.data.handled || spec.data.handled },
  };
}

/** PR 가드: 리뷰를 만들고 응답한 뒤 같은 서버에서 처리한다(GitHub 은 10초 안에 응답을 기다린다). */
async function handlePullRequest(body: unknown) {
  const result = await handlePullRequestEvent(body);
  if (!result.ok) return result;
  for (const { reviewId } of result.data.reviews) {
    after(() =>
      processPrReview(reviewId).catch((e) => console.error("[pr-guard]", e)),
    );
  }
  return { ok: true as const, data: { handled: result.data.handled } };
}
