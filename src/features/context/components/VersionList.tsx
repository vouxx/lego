import { formatDateTime } from "@/shared/lib/format";
import type { ContextVersionSummary } from "../schemas";

type Props = { versions: ContextVersionSummary[] };

export function VersionList({ versions }: Props) {
  if (versions.length === 0) return null;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-semibold">
        버전 기록 ({versions.length})
      </summary>
      <ol className="mt-2 flex flex-col gap-1">
        {versions.map((v, i) => (
          <li key={v.id} className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">
              {formatDateTime(v.createdAt)}
            </span>
            <span>{v.source === "edited" ? "직접 수정" : "자동 생성"}</span>
            {i === 0 ? <span className="text-xs">(현재)</span> : null}
            {v.prUrl ? (
              <a
                href={v.prUrl}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                PR ↗
              </a>
            ) : null}
          </li>
        ))}
      </ol>
    </details>
  );
}
