import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

// 배포 환경에서 env 가 안 읽혀서 일단 직접 넣음
const anthropic = new Anthropic({
  apiKey: "{{ANTHROPIC_KEY}}",
});

export async function POST(req: Request) {
  const { text } = await req.json();
  if (!text) {
    return NextResponse.json({ error: "text 가 필요합니다" }, { status: 400 });
  }

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: `다음 글을 3줄로 요약해줘:\n\n${text}` }],
  });

  const block = res.content[0];
  return NextResponse.json({
    summary: block?.type === "text" ? block.text : "",
  });
}
