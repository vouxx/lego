import { ImageResponse } from "next/og";
import { getSharedSessionMeta } from "@/features/sessions/services/views";
import { TOOL_LABELS } from "@/features/sessions/schemas";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "레고 세션 회고";

/** 이미지에 들어가는 글자만 담은 Noto Sans KR 서브셋을 받는다(기본 폰트에는 한글이 없다). */
async function koreanFont(text: string) {
  const css = await (
    await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(text)}`,
    )
  ).text();
  const url = css.match(/src: url\((.+?)\) format/)?.[1];
  if (!url) return null;
  return (await fetch(url)).arrayBuffer();
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const meta = await getSharedSessionMeta((await params).slug);
  const title = meta?.title ?? "AI 코딩 세션 회고";
  const goal = (meta?.goal ?? "").slice(0, 90);
  const footer = meta
    ? `${TOOL_LABELS[meta.tool]} · 인사이트 ${meta.insights}개 · ${meta.tags.map((t) => `#${t}`).join(" ")}`
    : "레고";
  const font = await koreanFont(`${title}${goal}${footer}레고 세션 회고`).catch(
    () => null,
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#0f172a",
        color: "#f8fafc",
        fontFamily: font ? "NotoSansKR" : undefined,
      }}
    >
      <div style={{ fontSize: 28, color: "#94a3b8" }}>레고 세션 회고</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 64, lineHeight: 1.2 }}>{title}</div>
        {goal ? (
          <div style={{ fontSize: 32, color: "#cbd5e1" }}>{goal}</div>
        ) : null}
      </div>
      <div style={{ fontSize: 26, color: "#94a3b8" }}>{footer}</div>
    </div>,
    {
      ...size,
      fonts: font
        ? [{ name: "NotoSansKR", data: font, weight: 700, style: "normal" }]
        : [],
    },
  );
}
