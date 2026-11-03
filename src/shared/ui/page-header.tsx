import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  /** 경로 표시: 앞 항목은 링크, 마지막은 현재 위치 */
  trail?: { href?: string; label: string }[];
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

/** 대시보드 화면 머리말: 고정폭 경로 + 제목 + 설명 + 오른쪽 버튼. */
export function PageHeader({ trail, title, description, actions }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
      <div className="flex min-w-0 flex-col gap-1.5">
        {trail?.length ? (
          <nav
            aria-label="경로"
            className="text-muted-foreground flex flex-wrap items-center gap-1.5 font-mono text-xs"
          >
            {trail.map((item, i) => (
              <span
                key={`${item.label}-${i}`}
                className="flex items-center gap-1.5"
              >
                {i > 0 ? <span aria-hidden="true">/</span> : null}
                {item.href ? (
                  <Link href={item.href} className="hover:text-foreground">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight break-all sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <div className="text-muted-foreground text-sm break-keep">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
