import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

type Props = {
  concepts: {
    slug: string;
    title: string;
    summary: string;
    ruleIds: string[];
  }[];
};

export function ConceptIndex({ concepts }: Props) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {concepts.map((c) => (
        <li key={c.slug}>
          <Card size="sm" className="h-full">
            <CardHeader>
              <CardTitle>
                <Link href={`/concepts/${c.slug}`} className="hover:underline">
                  {c.title}
                </Link>
              </CardTitle>
              <CardDescription>{c.summary}</CardDescription>
              {c.ruleIds.length > 0 ? (
                <p className="text-muted-foreground text-xs">
                  {c.ruleIds.join(" · ")}
                </p>
              ) : null}
            </CardHeader>
          </Card>
        </li>
      ))}
    </ul>
  );
}
