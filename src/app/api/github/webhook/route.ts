import { NextResponse, type NextRequest } from "next/server";
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

  const result = await handleWebhookEvent(
    request.headers.get("x-github-event"),
    body,
  );
  if (!result.ok) {
    // 500 이면 GitHub 이 재전송한다. 형식 오류는 재전송해도 같으므로 400.
    const status = result.error.code === "invalid_payload" ? 400 : 500;
    return NextResponse.json({ error: result.error.code }, { status });
  }

  return NextResponse.json(result.data);
}
