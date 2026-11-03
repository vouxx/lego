import Link from "next/link";
import { formatDateTime } from "@/shared/lib/format";
import { LEVEL_LABELS, type Level } from "../schemas";

type Props = {
  items: { id: string; level: Level; summary: string; createdAt: string }[];
};

export function RecentExplanations({ items }: Props) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/learn/${item.id}`} className="hover:underline">
            {item.summary || "설명"}
          </Link>
          <span className="text-muted-foreground ml-2 text-xs">
            {LEVEL_LABELS[item.level]} · {formatDateTime(item.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
