"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Result } from "@/shared/lib/result";
import {
  addCustomRuleAction,
  removeCustomRuleAction,
  saveContextVersionAction,
  toggleRuleAction,
} from "../actions";
import type { ChecklistItem } from "../schemas";

const CONFIRM_OVERWRITE =
  "직접 고친 내용이 규칙 조합으로 다시 만들어집니다. 계속할까요?";

/**
 * 에디터 내용과 규칙 변경을 함께 다룬다.
 * 규칙을 바꾸면 서버가 문서를 다시 조합해 돌려주고, 손으로 고친 내용이 있으면 먼저 확인한다.
 */
export function useContextEditor(contextFileId: string, savedContent: string) {
  const router = useRouter();
  const [content, setContent] = useState(savedContent);
  const [manualEdit, setManualEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // 체크박스는 누르는 즉시 바꿔 보여준다. 서버 값이 따라오면 같은 값이 되므로 그대로 둬도 된다.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  // 다시 분석하거나 저장해서 서버의 현재 버전이 바뀌면 에디터도 맞춘다.
  const [lastSaved, setLastSaved] = useState(savedContent);
  if (savedContent !== lastSaved) {
    setLastSaved(savedContent);
    setContent(savedContent);
    setManualEdit(false);
  }

  const edit = (value: string) => {
    setContent(value);
    setManualEdit(true);
  };

  const applyRules = (
    run: () => Promise<Result<{ content: string }>>,
    onFail?: () => void,
  ) => {
    if (manualEdit && !window.confirm(CONFIRM_OVERWRITE)) return false;
    setError(null);
    startTransition(async () => {
      const result = await run();
      if (!result.ok) {
        setError(result.error.message);
        onFail?.();
        return;
      }
      setContent(result.data.content);
      setManualEdit(false);
      router.refresh();
    });
    return true;
  };

  const enabledOf = (item: ChecklistItem) => overrides[item.id] ?? item.enabled;

  const toggle = (item: ChecklistItem, enabled: boolean) => {
    const started = applyRules(
      () =>
        toggleRuleAction({
          contextFileId,
          itemId: item.id,
          custom: item.custom,
          enabled,
        }),
      () => setOverrides((o) => ({ ...o, [item.id]: !enabled })),
    );
    if (started) setOverrides((o) => ({ ...o, [item.id]: enabled }));
  };

  const remove = (item: ChecklistItem) =>
    applyRules(() =>
      removeCustomRuleAction({ contextFileId, ruleId: item.id }),
    );

  const add = (section: string, ruleContent: string) =>
    applyRules(() =>
      addCustomRuleAction({ contextFileId, section, content: ruleContent }),
    );

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveContextVersionAction({ contextFileId, content });
      if (!result.ok) setError(result.error.message);
      else router.refresh();
    });
  };

  return {
    content,
    edit,
    dirty: content !== savedContent,
    isPending,
    error,
    toggle,
    enabledOf,
    remove,
    add,
    save,
  };
}
