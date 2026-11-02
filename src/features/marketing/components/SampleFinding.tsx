import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { SAMPLE_PROMPT } from "../content";

/** 실제 점검 결과 카드 모양의 예시 */
export function SampleFinding() {
  return (
    <section aria-labelledby="sample-title" className="flex flex-col gap-4">
      <h2 id="sample-title" className="text-2xl font-semibold">
        이런 결과를 받습니다
      </h2>
      <Card>
        <CardHeader className="gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="destructive">심각</Badge>
            <code className="text-muted-foreground text-xs">SEC-004</code>
          </div>
          <CardTitle>브라우저 코드에서 Supabase 관리자 키 사용</CardTitle>
          <code className="text-muted-foreground text-xs">
            src/components/AdminPanel.tsx:6
          </code>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm">
            &quot;use client&quot; 파일은 방문자의 브라우저로 그대로 전달됩니다.
            여기서 쓴 관리자 키는 누구나 꺼내 볼 수 있고, 이 키는 모든 보안
            규칙을 건너뛰어 데이터베이스 전체를 읽고 지울 수 있습니다.
          </p>
          <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs leading-relaxed whitespace-pre-wrap">
            {SAMPLE_PROMPT}
          </pre>
        </CardContent>
      </Card>
    </section>
  );
}
