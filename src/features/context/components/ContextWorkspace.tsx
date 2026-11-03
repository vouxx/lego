"use client";

import { Card, CardContent } from "@/shared/ui/card";
import { useContextEditor } from "../hooks/useContextEditor";
import { TARGET_INFO, type ContextTarget } from "../schemas";
import type { ContextFileView } from "../services/view";
import { ContextSidePanel } from "./ContextSidePanel";
import { ExportBar } from "./ExportBar";
import { RuleChecklist } from "./RuleChecklist";
import { VersionList } from "./VersionList";

type Props = { target: ContextTarget; file: ContextFileView };

/** 왼쪽 규칙 체크리스트, 가운데 에디터, 오른쪽 미리보기·비교. */
export function ContextWorkspace({ target, file }: Props) {
  const editor = useContextEditor(file.id, file.content);
  const fileName = TARGET_INFO[target].path;

  return (
    <div className="flex flex-col gap-4">
      <ExportBar
        contextFileId={file.id}
        fileName={fileName}
        content={editor.content}
        dirty={editor.dirty}
        isPending={editor.isPending}
        pr={file.pr}
        onSave={editor.save}
      />
      {editor.error ? (
        <p role="alert" className="text-destructive text-sm">
          {editor.error}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardContent>
            <RuleChecklist
              groups={file.groups}
              disabled={editor.isPending}
              enabledOf={editor.enabledOf}
              onToggle={editor.toggle}
              onRemove={editor.remove}
              onAdd={editor.add}
            />
          </CardContent>
        </Card>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">
            {fileName} 편집
            {editor.dirty ? (
              <span className="text-muted-foreground ml-2 text-xs font-normal">
                저장하지 않은 변경 있음
              </span>
            ) : null}
          </span>
          <textarea
            value={editor.content}
            onChange={(e) => editor.edit(e.target.value)}
            spellCheck={false}
            className="bg-background focus-visible:ring-ring/50 min-h-[32rem] flex-1 rounded-md border p-3 font-mono text-xs leading-relaxed outline-none focus-visible:ring-3"
          />
        </label>
        <Card>
          <CardContent>
            <ContextSidePanel
              content={editor.content}
              savedContent={file.content}
              previousContent={file.previousContent}
              dirty={editor.dirty}
            />
          </CardContent>
        </Card>
      </div>
      <VersionList versions={file.versions} />
    </div>
  );
}
