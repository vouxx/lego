import { cn } from "@/shared/lib/cn";

type Props = { values: readonly number[] };

const HEIGHT = 40;
const BAR = 22;
const GAP = 9;

/** 최근 점검의 남은 문제 수 막대. 마지막(이번 점검)만 진하게. */
export function TrendBars({ values }: Props) {
  const max = Math.max(...values, 1);
  const width = values.length * BAR + (values.length - 1) * GAP;
  return (
    <svg
      viewBox={`0 0 ${width} ${HEIGHT + 4}`}
      className="h-11 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {values.map((v, i) => {
        const h = (v / max) * HEIGHT;
        return (
          <rect
            key={i}
            x={i * (BAR + GAP)}
            y={HEIGHT + 4 - h}
            width={BAR}
            height={h}
            className={cn(
              i === values.length - 1 ? "fill-foreground" : "fill-input",
            )}
          />
        );
      })}
    </svg>
  );
}
