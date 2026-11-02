import Anthropic from "@anthropic-ai/sdk";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic(); // ANTHROPIC_API_KEY 환경 변수를 읽는다
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 h"),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { success } = await ratelimit.limit(user.id);
  if (!success) return Response.json({ error: "요청이 너무 많습니다" }, { status: 429 });

  const { message } = await req.json();
  if (typeof message !== "string" || message.length > 4000) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: message }],
  });
  return Response.json({ reply: res.content });
}
