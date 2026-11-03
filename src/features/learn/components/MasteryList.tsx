import Link from "next/link";
import type { MasteryView } from "../schemas";

type Props = { items: MasteryView[] };

/** 내가 배운 개념과 숙련도. */
export function MasteryList({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        아직 배운 개념이 없습니다. 코드를 설명받고 퀴즈를 풀면 여기에 쌓입니다.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.slug} className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <Link href={`/concepts/${item.slug}`} className="hover:underline">
              {item.title}
            </Link>
            <span className="text-muted-foreground">{item.mastery}</span>
          </div>
          <div
            className="bg-muted h-1.5 overflow-hidden rounded-full"
            role="meter"
            aria-label={`${item.title} 숙련도`}
            aria-valuenow={item.mastery}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="bg-primary h-full"
              style={{ width: `${item.mastery}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
