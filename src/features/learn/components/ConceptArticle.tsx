import Link from "next/link";
import { MarkdownPreview } from "@/shared/ui/markdown-preview";

type Props = {
  concept: {
    title: string;
    summary: string;
    body: string;
    rules: { id: string; title: string }[];
  };
};

export function ConceptArticle({ concept }: Props) {
  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/concepts"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← 개념 사전
        </Link>
        <h1 className="text-3xl font-semibold">{concept.title}</h1>
        <p className="text-muted-foreground">{concept.summary}</p>
      </div>
      <MarkdownPreview content={concept.body} />
      {concept.rules.length > 0 ? (
        <section className="flex flex-col gap-2 border-t pt-4">
          <h2 className="font-semibold">
            레고 보안 점검에서 이 개념과 관련된 규칙
          </h2>
          <ul className="text-sm">
            {concept.rules.map((r) => (
              <li key={r.id}>
                <code className="text-muted-foreground mr-2">{r.id}</code>
                {r.title}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
