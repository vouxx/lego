import { HERO_FINDINGS, SAMPLE_PROMPT } from "../content";
import { SeverityMark } from "./SeverityMark";
import { TerminalWindow } from "./TerminalWindow";

/** 히어로 오른쪽: 실제 점검 결과와 같은 형식의 예시. */
export function ScanTerminal() {
  return (
    <TerminalWindow title="lego scan · my-shop (예시)">
      <p className="text-terminal-muted">$ lego scan my-shop</p>
      <p className="text-terminal-muted">파일 128개 · 규칙 14개 · AI 판별</p>
      <ul className="mt-3 flex flex-col gap-2">
        {HERO_FINDINGS.map((f) => (
          <li key={f.id} className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2">
              <SeverityMark severity={f.severity} />
              <span className="text-terminal-muted">{f.id}</span>
            </span>
            <span className="pl-5">{f.title}</span>
            <span className="text-terminal-muted pl-5 break-all">
              {f.where}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-terminal-border mt-4 border-t pt-3">
        <p className="text-ok">
          ✓ 수정 프롬프트 3개 — Claude Code·Cursor 에 붙여넣기
        </p>
        <pre className="text-terminal-muted mt-2 line-clamp-4 font-mono whitespace-pre-wrap">
          {SAMPLE_PROMPT}
        </pre>
      </div>
    </TerminalWindow>
  );
}
