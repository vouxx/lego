import Link from "next/link";
import { TOOLS } from "../content";
import { SectionHeading } from "./SectionHeading";

/** 작업대 위의 도구 5개. 사용자 흐름 순서로 번호를 붙인다. */
export function ToolGrid() {
  return (
    <section aria-labelledby="tools-title" className="flex flex-col gap-6">
      <SectionHeading
        id="tools-title"
        eyebrow="01 · 도구"
        title="기획부터 회고까지, 도구 다섯 개"
        text="순서대로 써도 되고, 필요한 것만 골라 써도 됩니다. 회색 칸은 예시 출력입니다."
      />
      <ol className="bg-border grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool, i) => (
          <li
            key={tool.command}
            className="bg-background flex flex-col gap-3 p-5"
          >
            <div className="flex items-baseline justify-between gap-2 font-mono text-xs">
              <span className="text-muted-foreground">
                {String(i + 1).padStart(2, "0")} {tool.stage}
              </span>
              <code>lego {tool.command}</code>
            </div>
            <h3 className="text-lg font-semibold">{tool.title}</h3>
            <p className="text-muted-foreground text-sm break-keep">
              {tool.text}
            </p>
            <div className="bg-muted mt-auto rounded-md px-3 py-2 font-mono text-xs">
              {tool.output.map((line) => (
                <p key={line}>
                  <span className="text-ok" aria-hidden="true">
                    ✓{" "}
                  </span>
                  {line}
                </p>
              ))}
            </div>
            <Link
              href={tool.href}
              className="text-sm font-medium hover:underline"
            >
              {tool.title} 열기 →
            </Link>
          </li>
        ))}
        <li className="bg-muted/40 text-muted-foreground flex flex-col justify-center gap-2 p-5 font-mono text-xs">
          <p>모든 도구가 같은 리포·같은 결과를 씁니다.</p>
          <p>점검 결과 → 규칙 파일의 &lsquo;주의할 점&rsquo;</p>
          <p>점검 결과 → 학습 도우미의 개념 설명</p>
          <p>회고의 좋은 프롬프트 → 스펙의 작업 프롬프트</p>
        </li>
      </ol>
    </section>
  );
}
