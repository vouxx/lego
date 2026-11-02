import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** 대화 첫 메시지로 짧은 제목을 만든다 */
export async function generateTitle(text: string) {
  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 50,
    messages: [
      {
        role: "user",
        content: `다음 대화의 제목을 10자 이내로 지어줘:\n\n${text}`,
      },
    ],
  });
  const block = res.content[0];
  return block?.type === "text" ? block.text.trim() : "새 대화";
}
