"use client";

import { X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { ChecklistGroup, ChecklistItem } from "../schemas";
import { AddCustomRuleForm } from "./AddCustomRuleForm";

type Props = {
  groups: ChecklistGroup[];
  disabled: boolean;
  enabledOf: (item: ChecklistItem) => boolean;
  onToggle: (item: ChecklistItem, enabled: boolean) => void;
  onRemove: (item: ChecklistItem) => void;
  onAdd: (section: string, content: string) => void;
};

export function RuleChecklist({
  groups,
  disabled,
  enabledOf,
  onToggle,
  onRemove,
  onAdd,
}: Props) {
  const sections = [
    ...new Set(groups.flatMap((g) => g.items.map((i) => i.section))),
  ];

  return (
    <div className="flex flex-col gap-5">
      {groups.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          이 리포에 맞는 규칙 팩이 없습니다. 아래에서 직접 추가해 주세요.
        </p>
      ) : null}
      {groups.map((group) => (
        <fieldset key={group.name} className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">{group.name}</legend>
          {group.items.map((item) => (
            <div key={item.id} className="flex items-start gap-2">
              <input
                id={`rule-${item.id}`}
                type="checkbox"
                className="mt-1"
                checked={enabledOf(item)}
                disabled={disabled}
                onChange={(e) => onToggle(item, e.target.checked)}
              />
              <label
                htmlFor={`rule-${item.id}`}
                className="flex-1 text-sm leading-snug"
              >
                {item.content}
                <span className="text-muted-foreground block text-xs">
                  {item.section}
                </span>
              </label>
              {item.custom ? (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label="규칙 지우기"
                  disabled={disabled}
                  onClick={() => onRemove(item)}
                >
                  <X />
                </Button>
              ) : null}
            </div>
          ))}
        </fieldset>
      ))}
      <AddCustomRuleForm
        sections={sections}
        disabled={disabled}
        onAdd={onAdd}
      />
    </div>
  );
}
