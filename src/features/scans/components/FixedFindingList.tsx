import type { ScanDiffView } from "../schemas";
import { SeverityBadge } from "./SeverityBadge";

type Props = { fixed: ScanDiffView["fixed"] };

/** 직전 점검에는 있었지만 이번에는 사라진 항목 */
export function FixedFindingList({ fixed }: Props) {
  if (fixed.length === 0) return null;
  return (
    <details className="rounded-lg border p-4">
      <summary className="cursor-pointer text-sm">
        직전 점검 이후 해결된 항목 {fixed.length}개
      </summary>
      <ul className="mt-3 flex flex-col gap-2">
        {fixed.map((item) => (
          <li
            key={item.fingerprint}
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            <SeverityBadge severity={item.severity} />
            <code className="text-muted-foreground text-xs">{item.ruleId}</code>
            <code className="text-xs break-all line-through">
              {item.filePath}:{item.lineStart}
            </code>
          </li>
        ))}
      </ul>
    </details>
  );
}
