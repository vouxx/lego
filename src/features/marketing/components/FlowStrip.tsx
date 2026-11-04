import { FLOW } from "../content";
import { SectionHeading } from "./SectionHeading";

/** 한 작업이 끝나기까지 도구들이 이어지는 순서 */
export function FlowStrip() {
  return (
    <section aria-labelledby="flow-title" className="flex flex-col gap-6">
      <SectionHeading
        id="flow-title"
        eyebrow="02 · 흐름"
        title="작업 하나가 끝나기까지"
        text="작업 번호 하나로 스펙, PR, 리뷰, 운영이 이어집니다. 따로 옮겨 적을 것이 없습니다."
      />
      <ol className="bg-border grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2 lg:grid-cols-6">
        {FLOW.map((f, i) => (
          <li key={f.step} className="bg-background flex flex-col gap-2 p-4">
            <p className="text-muted-foreground font-mono text-xs">
              {String(i + 1).padStart(2, "0")} · {f.tool}
            </p>
            <h3 className="font-semibold">{f.step}</h3>
            <p className="text-muted-foreground text-sm break-keep">{f.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
