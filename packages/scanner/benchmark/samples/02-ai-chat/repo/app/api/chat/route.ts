import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { conversationId, messages } = await req.json();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
  });
  const reply = completion.choices[0]?.message?.content ?? "";

  await supabase.from("messages").insert([
    { conversation_id: conversationId, role: "user", content: messages.at(-1)?.content },
    { conversation_id: conversationId, role: "assistant", content: reply },
  ]);

  return NextResponse.json({ reply });
}
