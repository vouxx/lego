"use client";

import { useState } from "react";

// 입력창 아래 추천 문장 3개. 서버 왕복 없이 바로 부르려고 브라우저에서 호출한다.
async function fetchSuggestions(draft: string): Promise<string[]> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "사용자가 이어서 쓸 만한 문장 3개를 줄바꿈으로 구분해 제안해." },
        { role: "user", content: draft },
      ],
    }),
  });
  const json = await res.json();
  return String(json.choices?.[0]?.message?.content ?? "")
    .split("\n")
    .filter(Boolean)
    .slice(0, 3);
}

export default function QuickSuggest({ draft, onPick }: { draft: string; onPick: (s: string) => void }) {
  const [items, setItems] = useState<string[]>([]);

  return (
    <div className="flex gap-2">
      <button type="button" onClick={async () => setItems(await fetchSuggestions(draft))}>
        추천 받기
      </button>
      {items.map((s) => (
        <button key={s} type="button" onClick={() => onPick(s)} className="rounded border px-2">
          {s}
        </button>
      ))}
    </div>
  );
}
