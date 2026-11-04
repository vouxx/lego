/** 바뀐 줄. line 은 새 파일 기준 1부터. */
export type AddedLine = { line: number; text: string };

/**
 * GitHub PR 파일 목록의 patch(unified diff 조각)에서 추가된 줄과 지워진 줄을 꺼낸다.
 * 큰 파일은 GitHub 이 patch 를 주지 않는다(빈 값).
 */
export function parsePatch(patch: string | undefined) {
  const added: AddedLine[] = [];
  const removed: string[] = [];
  if (!patch) return { added, removed };
  let line = 0;
  for (const raw of patch.split("\n")) {
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      line = Number(hunk[1]);
      continue;
    }
    if (raw.startsWith("+")) {
      added.push({ line, text: raw.slice(1) });
      line++;
    } else if (raw.startsWith("-")) {
      removed.push(raw.slice(1));
    } else if (!raw.startsWith("\\")) {
      line++;
    }
  }
  return { added, removed };
}

/** 후보의 줄 범위가 추가된 줄과 겹치는지 */
export function touchesAdded(
  range: { lineStart: number; lineEnd: number },
  added: AddedLine[],
) {
  return added.some(
    (a) => a.line >= range.lineStart && a.line <= range.lineEnd,
  );
}
