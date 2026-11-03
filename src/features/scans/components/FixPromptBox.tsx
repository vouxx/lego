"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { TerminalWindow } from "@/shared/ui/terminal-window";

type Props = { prompt: string };

export function FixPromptBox({ prompt }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TerminalWindow
      title="수정 프롬프트 · Claude Code·Cursor 에 붙여넣기"
      actions={
        <Button size="xs" variant="secondary" onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "복사됨" : "복사"}
        </Button>
      }
    >
      <pre className="font-mono whitespace-pre-wrap">{prompt}</pre>
    </TerminalWindow>
  );
}
