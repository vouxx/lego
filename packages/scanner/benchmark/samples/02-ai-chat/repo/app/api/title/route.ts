import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTitle } from "@/lib/llm";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { conversationId, firstMessage } = await req.json();
  const title = await generateTitle(firstMessage);

  await supabase
    .from("conversations")
    .update({ title })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  return NextResponse.json({ title });
}
