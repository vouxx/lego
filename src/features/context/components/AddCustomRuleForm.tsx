"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

type Props = {
  sections: string[];
  disabled: boolean;
  onAdd: (section: string, content: string) => void;
};

export function AddCustomRuleForm({ sections, disabled, onAdd }: Props) {
  const [section, setSection] = useState("");
  const [content, setContent] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = section.trim() || "추가 규칙";
    const c = content.trim();
    if (!c) return;
    onAdd(s, c);
    setContent("");
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 border-t pt-4">
      <span className="text-sm font-semibold">규칙 직접 추가</span>
      <Input
        list="context-sections"
        placeholder="섹션 (예: 컴포넌트)"
        value={section}
        maxLength={40}
        onChange={(e) => setSection(e.target.value)}
      />
      <datalist id="context-sections">
        {sections.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <Input
        placeholder="규칙 (예: 날짜는 date-fns 로 다룬다.)"
        value={content}
        maxLength={500}
        onChange={(e) => setContent(e.target.value)}
      />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={disabled || !content.trim()}
      >
        추가
      </Button>
    </form>
  );
}
