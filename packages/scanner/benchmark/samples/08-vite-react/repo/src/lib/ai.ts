// 상품 설명 자동 작성 (판매자 등록 화면)
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export async function writeDescription(name: string, keywords: string[]) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "쇼핑몰 상품 설명을 HTML 로 작성해. <p>, <ul>, <strong> 만 사용." },
        { role: "user", content: `상품명: ${name}\n키워드: ${keywords.join(", ")}` },
      ],
    }),
  });
  const json = await res.json();
  return json.choices[0].message.content as string;
}
