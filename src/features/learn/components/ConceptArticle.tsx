import { MarkdownPreview } from "@/shared/ui/markdown-preview";
import { PageHeader } from "@/shared/ui/page-header";

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
      <PageHeader
        trail={[
          { href: "/concepts", label: "개념 사전" },
          { label: concept.title },
        ]}
        title={concept.title}
        description={concept.summary}
      />
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
