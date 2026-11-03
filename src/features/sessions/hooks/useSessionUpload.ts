"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSessionUploadAction, finalizeSessionAction } from "../actions";
import {
  MAX_UPLOAD_BYTES,
  type SessionMessage,
  type SessionStats,
  type SessionTool,
} from "../schemas";
import { maskMessages } from "../services/mask";
import { detectTool, parseSession } from "../services/parse";
import { computeStats } from "../services/stats";

export type Prepared = {
  fileName: string;
  raw: string;
  tool: SessionTool;
  messages: SessionMessage[];
  maskedCount: number;
  stats: SessionStats;
};

const MAX_RAW_BYTES = 60_000_000;

/** 너무 크면 도구 결과·AI 답변을 줄여서 업로드 한도에 맞춘다. */
function fitToLimit(messages: SessionMessage[]) {
  const size = (list: SessionMessage[]) =>
    new Blob([JSON.stringify({ version: 1, tool: "text", messages: list })])
      .size;
  if (size(messages) <= MAX_UPLOAD_BYTES) return messages;
  const clipped = messages.map((m) =>
    m.role === "tool"
      ? { ...m, text: m.text.slice(0, 300) }
      : m.role === "assistant"
        ? { ...m, text: m.text.slice(0, 1_500) }
        : m,
  );
  return size(clipped) <= MAX_UPLOAD_BYTES ? clipped : null;
}

function prepare(
  fileName: string,
  raw: string,
  tool: SessionTool,
): Prepared | string {
  const parsed = parseSession(tool, raw);
  if (parsed.length === 0) return "대화를 찾지 못했습니다. 형식을 바꿔 보세요.";
  const { messages, count } = maskMessages(parsed);
  const fitted = fitToLimit(messages);
  if (!fitted) return "세션이 너무 깁니다. 일부만 잘라서 올려 주세요.";
  return {
    fileName,
    raw,
    tool,
    messages: fitted,
    maskedCount: count,
    stats: computeStats(fitted, count),
  };
}

/**
 * 원본 로그는 브라우저 안에서만 읽는다: 파싱 → 마스킹 → 미리보기 → 확인 후 마스킹된 JSON 만 업로드.
 */
export function useSessionUpload() {
  const router = useRouter();
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async (file: File) => {
    setError(null);
    setPrepared(null);
    if (file.size > MAX_RAW_BYTES) {
      setError("파일이 너무 큽니다(최대 60MB).");
      return;
    }
    const raw = await file.text();
    const result = prepare(file.name, raw, detectTool(file.name, raw));
    if (typeof result === "string") setError(result);
    else setPrepared(result);
  };

  const changeTool = (tool: SessionTool) => {
    if (!prepared) return;
    const result = prepare(prepared.fileName, prepared.raw, tool);
    if (typeof result === "string") setError(result);
    else {
      setError(null);
      setPrepared(result);
    }
  };

  const upload = async (meta: { title: string; projectId: string | null }) => {
    if (!prepared) return;
    setUploading(true);
    setError(null);
    try {
      const body = JSON.stringify({
        version: 1,
        tool: prepared.tool,
        messages: prepared.messages,
      });
      const created = await createSessionUploadAction({
        tool: prepared.tool,
        title: meta.title,
        projectId: meta.projectId,
        bytes: new Blob([body]).size,
      });
      if (!created.ok) {
        setError(created.error.message);
        return;
      }
      const res = await fetch(created.data.uploadUrl, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body,
      });
      if (!res.ok) {
        setError("업로드하지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      const finalized = await finalizeSessionAction({
        sessionId: created.data.sessionId,
        maskedCount: prepared.maskedCount,
      });
      if (!finalized.ok) {
        setError(finalized.error.message);
        return;
      }
      router.push(`/sessions/${created.data.sessionId}`);
    } finally {
      setUploading(false);
    }
  };

  return {
    prepared,
    error,
    uploading,
    load,
    changeTool,
    upload,
    reset: () => setPrepared(null),
  };
}
