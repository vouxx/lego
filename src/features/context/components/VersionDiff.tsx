import { diffLines } from "diff";
import { cn } from "@/shared/lib/cn";

type Props = { before: string | null; after: string; beforeLabel: string };

/** 줄 단위 비교. 추가는 +, 삭제는 - 로 표시한다. */
export function VersionDiff({ before, after, beforeLabel }: Props) {
  if (before === null) {
    return (
      <p className="text-muted-foreground text-sm">
        비교할 이전 버전이 없습니다.
      </p>
    );
  }
  const parts = diffLines(before, after);
  if (parts.every((p) => !p.added && !p.removed)) {
    return (
      <p className="text-muted-foreground text-sm">{beforeLabel}과 같습니다.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs">{beforeLabel}과 비교</p>
      <pre className="overflow-x-auto rounded border text-xs leading-relaxed">
        {parts.flatMap((part, i) =>
          part.value
            .replace(/\n$/, "")
            .split("\n")
            .map((line, j) => (
              <div
                key={`${i}-${j}`}
                className={cn(
                  "px-2",
                  part.added && "bg-primary/10",
                  part.removed && "bg-destructive/10 text-destructive",
                )}
              >
                {part.added ? "+ " : part.removed ? "- " : "  "}
                {line}
              </div>
            )),
        )}
      </pre>
    </div>
  );
}
