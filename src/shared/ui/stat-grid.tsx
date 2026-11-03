import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type Props = {
  items: { label: ReactNode; value: ReactNode; note?: ReactNode }[];
  className?: string;
};

/** 큰 숫자 칸. 칸 사이는 1px 선으로 나눈다(작업대 컨셉의 표 느낌). */
export function StatGrid({ items, className }: Props) {
  return (
    <dl
      className={cn(
        "bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-4",
        className,
      )}
    >
      {items.map((item, i) => (
        <div key={i} className="bg-background flex flex-col gap-1 p-4">
          <dt className="text-muted-foreground order-2 text-xs">
            {item.label}
          </dt>
          <dd className="order-1 font-mono text-2xl font-semibold tracking-tight">
            {item.value}
          </dd>
          {item.note ? (
            <dd className="text-muted-foreground order-3 text-xs">
              {item.note}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
