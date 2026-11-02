"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";

type Props = { prompt: string };

export function FixPromptBox({ prompt }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-muted flex flex-col gap-2 rounded-md p-3">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium">
          수정 프롬프트 (Claude Code · Cursor에 붙여넣기)
        </span>
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "복사됨" : "복사"}
        </Button>
      </div>
      <pre className="text-sm whitespace-pre-wrap">{prompt}</pre>
    </div>
  );
}
