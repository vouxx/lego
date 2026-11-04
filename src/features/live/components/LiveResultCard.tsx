import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { CopyButton } from "@/shared/ui/copy-button";
import { SeverityMark } from "@/shared/ui/severity";
import type { LiveResult } from "../schemas";

type Props = {
  result: LiveResult;
  repoFullName: string;
  commitSha: string | null;
};

export function LiveResultCard({ result, repoFullName, commitSha }: Props) {
  const code = result.code;
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="bg-muted inline-flex rounded-md px-2 py-0.5">
            <SeverityMark severity={result.severity} />
          </span>
          <span className="text-muted-foreground">{result.id}</span>
          {result.isNew ? <Badge variant="outline">새로 생김</Badge> : null}
        </div>
        <CardTitle>{result.title}</CardTitle>
        <code className="text-muted-foreground font-mono text-xs break-all">
          {result.target}
        </code>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm">{result.detail}</p>
        {code ? (
          <p className="text-sm">
            <span className="text-muted-foreground">코드에서 만든 곳: </span>
            {commitSha ? (
              <a
                href={`https://github.com/${repoFullName}/blob/${commitSha}/${code.path}#L${code.line}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs underline"
              >
                {code.path}:{code.line}
              </a>
            ) : (
              <code className="font-mono text-xs">
                {code.path}:{code.line}
              </code>
            )}{" "}
            <span className="text-muted-foreground text-xs">({code.what})</span>
          </p>
        ) : null}
        <details className="text-sm">
          <summary className="cursor-pointer">
            고치는 방법(AI 코딩 도구에 붙여넣기)
          </summary>
          <pre className="bg-muted mt-2 overflow-x-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap">
            {result.fix}
          </pre>
          <div className="mt-2">
            <CopyButton text={result.fix} />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
