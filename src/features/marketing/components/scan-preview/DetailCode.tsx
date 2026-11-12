import { cn } from "@/shared/lib/cn";

type Line = { line: number; text: string; hit?: boolean };
type Props = { lines: readonly Line[] };

/** 문제가 된 줄 몇 개. 걸린 줄은 치명 색 왼쪽 선과 옅은 바탕. */
export function DetailCode({ lines }: Props) {
  return (
    <pre className="bg-muted overflow-x-auto rounded-sm border py-2.5 font-mono text-xs leading-relaxed">
      {lines.map((l) => (
        <span
          key={l.line}
          className={cn(
            "block border-l-3 px-2.5",
            l.hit
              ? "bg-sev-critical-soft border-l-sev-critical"
              : "border-l-transparent",
          )}
        >
          <span className="text-muted-foreground inline-block w-6">
            {l.line}
          </span>
          {l.text}
        </span>
      ))}
    </pre>
  );
}
