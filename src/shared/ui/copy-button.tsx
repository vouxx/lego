"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";

type Props = {
  text: string;
  label?: string;
  size?: "default" | "sm" | "xs";
  variant?: "default" | "outline" | "ghost";
};

export function CopyButton({
  text,
  label = "복사",
  size = "sm",
  variant = "outline",
}: Props) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size={size} variant={variant} onClick={copy} disabled={!text}>
      {copied ? <Check /> : <Copy />}
      {copied ? "복사됨" : label}
    </Button>
  );
}
