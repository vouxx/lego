import { RULES } from "../content";
import { SectionHeading } from "./SectionHeading";
import { SeverityMark } from "@/shared/ui/severity";

export function RuleCatalog() {
  return (
    <section
      id="rules"
      aria-labelledby="rules-title"
      className="flex scroll-mt-20 flex-col gap-6"
    >
      <SectionHeading
        id="rules-title"
        eyebrow="03 · 점검 항목"
        title="22가지를 점검합니다"
        text="AI 코딩 도구로 만든 Next.js·Supabase 앱에서 실제로 자주 나오는 실수만 골랐습니다."
      />
      <ul className="divide-y rounded-lg border">
        {RULES.map((rule) => (
          <li
            key={rule.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm"
          >
            <code className="text-muted-foreground w-16 font-mono text-xs">
              {rule.id}
            </code>
            <span className="text-muted-foreground font-mono text-xs">
              <SeverityMark severity={rule.severity} />
            </span>
            <span className="min-w-0 basis-full break-keep sm:flex-1 sm:basis-auto">
              {rule.text}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
