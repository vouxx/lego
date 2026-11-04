"use client";

import { useState } from "react";
import type { TrendPoint } from "../services/trend";

type Props = { points: TrendPoint[] };

const W = 640;
const H = 180;
const PAD = { top: 12, right: 12, bottom: 24, left: 32 };

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
  });

/** 점검마다 남은 문제 수(한 줄). 점에 올리면 그 점검의 숫자를 보여 준다. */
export function TrendChart({ points }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.open));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1]!;
  const x = (i: number) =>
    PAD.left +
    (points.length === 1
      ? (W - PAD.left - PAD.right) / 2
      : (i * (W - PAD.left - PAD.right)) / (points.length - 1));
  const y = (v: number) => PAD.top + (1 - v / top) * (H - PAD.top - PAD.bottom);
  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.open).toFixed(1)}`,
    )
    .join(" ");
  const current = active === null ? null : points[active]!;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < points.length; i++)
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    setActive(best);
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`점검 ${points.length}번의 남은 문제 수: ${points
          .map((p) => `${day(p.at)} ${p.open}개`)
          .join(", ")}`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y(t)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {t}
            </text>
          </g>
        ))}
        {[0, points.length - 1]
          .filter((i, k, all) => all.indexOf(i) === k)
          .map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 6}
              textAnchor={
                points.length === 1 ? "middle" : i === 0 ? "start" : "end"
              }
              className="fill-muted-foreground text-[10px]"
            >
              {day(points[i]!.at)}
            </text>
          ))}
        {current ? (
          <line
            x1={x(active!)}
            x2={x(active!)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            className="stroke-muted-foreground"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ) : null}
        <path
          d={path}
          fill="none"
          className="stroke-foreground"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle
            key={p.scanId}
            cx={x(i)}
            cy={y(p.open)}
            r={active === i ? 5 : 4}
            className="fill-foreground stroke-background"
            strokeWidth={2}
          />
        ))}
        {/* 끝점까지 잡히도록 차트 전체 폭을 hover 영역으로 쓴다 */}
        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
        />
      </svg>
      {current ? (
        <div
          role="status"
          className="bg-popover text-popover-foreground pointer-events-none absolute top-0 rounded-md border px-3 py-2 text-xs shadow-sm"
          style={{
            left: `${(x(active!) / W) * 100}%`,
            transform: `translateX(${x(active!) > W / 2 ? "-105%" : "5%"})`,
          }}
        >
          <p className="font-medium">
            {new Date(current.at).toLocaleString("ko-KR")}
          </p>
          <p>
            남은 문제 {current.open}개 (critical·high {current.serious}개)
          </p>
          <p className="text-muted-foreground">
            새로 생김 {current.added} · 해결 {current.fixed}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function niceTicks(max: number) {
  const step =
    max <= 4 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : 20;
  const out: number[] = [];
  for (let v = 0; v < max + step; v += step) out.push(v);
  return out;
}
