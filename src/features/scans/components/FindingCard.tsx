import Link from "next/link";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { FindingView } from "../schemas";
import { CodeSnippet } from "./CodeSnippet";
import { FindingStatusControl } from "./FindingStatusControl";
import { FixPromptBox } from "./FixPromptBox";
import { SeverityBadge } from "./SeverityBadge";

const VERDICT_NOTE: Record<string, string> = {
  uncertain: "AI가 코드만으로는 확신하지 못한 항목입니다. 직접 확인해 주세요.",
  false_positive: "AI가 오탐으로 판단한 항목입니다.",
};

type Props = { finding: FindingView; isNew?: boolean };

export function FindingCard({ finding, isNew = false }: Props) {
  const location =
    finding.lineStart === finding.lineEnd
      ? `${finding.filePath}:${finding.lineStart}`
      : `${finding.filePath}:${finding.lineStart}-${finding.lineEnd}`;

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={finding.severity} />
          <code className="text-muted-foreground text-xs">
            {finding.ruleId}
          </code>
          {isNew ? <Badge variant="outline">새로 생김</Badge> : null}
        </div>
        <CardTitle>{finding.ruleTitle}</CardTitle>
        <code className="text-muted-foreground text-xs break-all">
          {location}
        </code>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <CodeSnippet
          code={finding.snippet}
          filePath={finding.filePath}
          firstLine={finding.lineStart}
        />
        {finding.aiVerdict && VERDICT_NOTE[finding.aiVerdict] ? (
          <p className="text-muted-foreground text-sm">
            {VERDICT_NOTE[finding.aiVerdict]}
          </p>
        ) : null}
        {finding.explanation ? (
          <p className="text-sm">{finding.explanation}</p>
        ) : null}
        {finding.fixPrompt ? <FixPromptBox prompt={finding.fixPrompt} /> : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FindingStatusControl
            findingId={finding.id}
            status={finding.status}
          />
          <Link
            href={`/learn/finding/${finding.id}`}
            className="text-muted-foreground text-sm hover:underline"
          >
            이게 뭐예요? →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
