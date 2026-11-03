"use client";

import { useEffect, useId, useState } from "react";
import { retryDiagramAction } from "../actions";

type Props = { explanationId: string; source: string; retried: boolean };

/**
 * Mermaid 흐름도. 렌더링에 실패하면 서버에 한 번 다시 만들어 달라고 하고, 그래도 실패하면 숨긴다.
 * securityLevel strict 로 라벨 안의 HTML·클릭 이벤트를 막는다.
 */
export function MermaidDiagram({ explanationId, source, retried }: Props) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [code, setCode] = useState(source);
  const [canRetry, setCanRetry] = useState(!retried);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "neutral",
      });
      try {
        await mermaid.parse(code);
        const { svg } = await mermaid.render(`m${id}`, code);
        if (!cancelled) setSvg(svg);
      } catch {
        if (cancelled) return;
        if (!canRetry) {
          setHidden(true);
          return;
        }
        setCanRetry(false);
        const result = await retryDiagramAction({ explanationId });
        if (cancelled) return;
        if (result.ok && result.data.mermaid) setCode(result.data.mermaid);
        else setHidden(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, canRetry, explanationId, id]);

  if (hidden) return null;
  if (!svg) {
    return <p className="text-muted-foreground text-sm">흐름도를 그리는 중…</p>;
  }
  return (
    <div
      className="overflow-x-auto rounded-md border p-3 [&_svg]:mx-auto [&_svg]:max-w-full"
      // mermaid 가 strict 모드로 만든 SVG 다.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
