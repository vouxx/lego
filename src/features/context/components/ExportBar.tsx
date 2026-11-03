"use client";

import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import type { PrAvailability } from "../schemas";
import { PrButton } from "./PrButton";

type Props = {
  contextFileId: string;
  fileName: string;
  content: string;
  dirty: boolean;
  isPending: boolean;
  pr: PrAvailability;
  onSave: () => void;
};

export function ExportBar({
  contextFileId,
  fileName,
  content,
  dirty,
  isPending,
  pr,
  onSave,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap items-start gap-2">
      <Button onClick={onSave} disabled={isPending || !dirty}>
        {dirty ? "새 버전으로 저장" : "저장됨"}
      </Button>
      <Button variant="outline" onClick={download}>
        <Download /> {fileName} 내려받기
      </Button>
      <Button variant="outline" onClick={copy}>
        {copied ? <Check /> : <Copy />}
        {copied ? "복사됨" : "복사"}
      </Button>
      <PrButton contextFileId={contextFileId} pr={pr} dirty={dirty} />
    </div>
  );
}
