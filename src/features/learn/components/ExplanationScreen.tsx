import { PageHeader } from "@/shared/ui/page-header";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { LEVEL_LABELS, type ExplanationView } from "../schemas";
import { MermaidDiagram } from "./MermaidDiagram";
import { QuizPanel } from "./QuizPanel";

type Props = { view: ExplanationView };

export function ExplanationScreen({ view }: Props) {
  const { content } = view;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        trail={[{ href: "/learn", label: "학습" }, { label: "설명" }]}
        title={content.summary}
        description={
          <span className="font-mono text-xs break-all">
            {LEVEL_LABELS[view.level]} 수준 ·{" "}
            {view.sourceRef ?? "붙여넣은 코드"}
          </span>
        }
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">흐름</h2>
        <ol className="flex flex-col gap-3">
          {content.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-full text-xs">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="text-muted-foreground text-sm">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        {content.mermaid ? (
          <MermaidDiagram
            explanationId={view.id}
            source={content.mermaid}
            retried={Boolean(content.diagramRetried)}
          />
        ) : null}
      </section>

      {view.concepts.length + content.extraConcepts.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">핵심 개념</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {view.concepts.map((c) => (
              <Card key={c.slug} size="sm">
                <CardHeader>
                  <CardTitle>
                    <Link
                      href={`/concepts/${c.slug}`}
                      className="hover:underline"
                    >
                      {c.title} →
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {c.summary}
                </CardContent>
              </Card>
            ))}
            {content.extraConcepts.map((c) => (
              <Card key={c.title} size="sm">
                <CardHeader>
                  <CardTitle>{c.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {c.explanation}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <details className="text-sm">
        <summary className="cursor-pointer font-semibold">
          설명한 코드 보기
        </summary>
        <pre className="bg-muted mt-2 max-h-96 overflow-auto rounded p-3 text-xs">
          {view.code}
        </pre>
      </details>

      {view.quiz ? (
        <section className="flex flex-col gap-3" aria-label="퀴즈">
          <h2 className="text-lg font-semibold">이해했는지 확인</h2>
          <QuizPanel quiz={view.quiz} />
        </section>
      ) : null}
    </div>
  );
}
