import { NextResponse } from "next/server";
import { verifySignature } from "@/lib/github";
import { runCommand } from "@/lib/commands";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  // 로컬에서 curl 로 테스트할 때는 서명 헤더가 없어서, 헤더가 있을 때만 확인한다
  if (signature && !verifySignature(body, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  const payload = JSON.parse(body);

  if (event === "issue_comment" && payload.action === "created") {
    await runCommand(payload.issue.number, payload.comment.body);
  }

  return NextResponse.json({ ok: true });
}
