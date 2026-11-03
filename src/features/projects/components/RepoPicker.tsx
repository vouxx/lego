"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { createProjectAction } from "../actions";
import type { InstallableRepo } from "../schemas";

type Props = { repos: InstallableRepo[] };

export function RepoPicker({ repos }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pendingRepo, setPendingRepo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = repos.filter((r) =>
    r.fullName.toLowerCase().includes(query.toLowerCase()),
  );

  const add = (repoFullName: string) => {
    setError(null);
    setPendingRepo(repoFullName);
    startTransition(async () => {
      const result = await createProjectAction({ repoFullName });
      if (result.ok) {
        router.push("/projects");
      } else {
        setError(result.error.message);
        setPendingRepo(null);
      }
    });
  };

  if (repos.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        레고에 읽기를 허용한 리포가 없습니다. &apos;허용할 리포 바꾸기&apos;에서
        리포를 추가해 주세요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="리포 이름으로 찾기"
        aria-label="리포 이름으로 찾기"
      />
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <ul className="divide-y rounded-lg border">
        {filtered.map((repo) => (
          <li
            key={repo.fullName}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <span className="min-w-0 truncate text-sm">
              {repo.fullName}
              {repo.isPrivate ? (
                <span className="text-muted-foreground ml-2 text-xs">
                  비공개
                </span>
              ) : null}
            </span>
            <Button
              size="sm"
              variant={repo.alreadyAdded ? "ghost" : "default"}
              disabled={repo.alreadyAdded || isPending}
              onClick={() => add(repo.fullName)}
            >
              {repo.alreadyAdded
                ? "등록됨"
                : pendingRepo === repo.fullName
                  ? "등록 중…"
                  : "등록"}
            </Button>
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="text-muted-foreground px-4 py-3 text-sm">
            일치하는 리포가 없습니다.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
