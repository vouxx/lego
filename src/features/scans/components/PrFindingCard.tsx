import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { PrFindingView } from "../schemas";
import { CodeSnippet } from "./CodeSnippet";
import { FixPromptBox } from "./FixPromptBox";
import { SeverityBadge } from "./SeverityBadge";

type Props = { finding: PrFindingView };

export function PrFindingCard({ finding }: Props) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <SeverityBadge severity={finding.severity} />
          <span className="text-muted-foreground">{finding.ruleId}</span>
        </div>
        <CardTitle>{finding.ruleTitle}</CardTitle>
        <code className="text-muted-foreground font-mono text-xs break-all">
          {finding.filePath}:{finding.line}
        </code>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {finding.snippet ? (
          <CodeSnippet
            code={finding.snippet}
            filePath={finding.filePath}
            firstLine={finding.line}
          />
        ) : null}
        {finding.aiVerdict === "uncertain" ? (
          <p className="text-muted-foreground text-sm">
            AI가 코드만으로는 확신하지 못한 항목입니다. 직접 확인해 주세요.
          </p>
        ) : null}
        <p className="text-sm">{finding.explanation ?? finding.reason}</p>
        {finding.fixPrompt ? <FixPromptBox prompt={finding.fixPrompt} /> : null}
        {finding.ruleId.startsWith("SEC-") ? (
          <Link
            href={`/concepts/rule/${finding.ruleId}`}
            className="text-muted-foreground self-end text-sm hover:underline"
          >
            이게 뭐예요? →
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
