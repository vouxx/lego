/**
 * 사용자가 붙여넣은 GitHub 리포 주소를 owner/repo 로 바꾼다. 알아볼 수 없으면 null.
 * 받는 형식: owner/repo, https://github.com/owner/repo(.git)(/tree/…), github.com/owner/repo, git@github.com:owner/repo.git
 */
export function parseRepoInput(input: string): string | null {
  const text = input.trim();
  const patterns = [
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/i,
    /^git@github\.com:([\w.-]+)\/([\w.-]+?)(?:\.git)?$/i,
    /^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1] && match[2] && !/^\.+$/.test(match[2]))
      return `${match[1]}/${match[2]}`;
  }
  return null;
}

/** 리포 경로의 파일 목록에서 스택 감지에 쓰는 최상위·src 항목을 뽑는다. */
export function topLevelEntries(paths: string[]) {
  const root = new Set<string>();
  const src = new Set<string>();
  for (const path of paths) {
    const [first, second] = path.split("/");
    if (first) root.add(first);
    if (first === "src" && second) src.add(second);
  }
  return { rootEntries: [...root], srcEntries: [...src] };
}
