"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/shared/ui/button";
import { CopyButton } from "@/shared/ui/copy-button";
import { Input } from "@/shared/ui/input";
import { createInviteAction } from "../actions";
import { INVITE_DAYS } from "../schemas";

type Props = { projectId: string };

/** GitHub 아이디로 초대 링크를 만든다. 링크는 지금 한 번만 볼 수 있다. */
export function InviteForm({ projectId }: Props) {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ url: string; login: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      setError(null);
      setCreated(null);
      const result = await createInviteAction({
        projectId,
        githubLogin: login,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setCreated({
        url: `${window.location.origin}/invites/${result.data.token}`,
        login: result.data.githubLogin,
      });
      setLogin("");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submit} className="flex max-w-md gap-2">
        <Input
          aria-label="초대할 GitHub 아이디"
          placeholder="GitHub 아이디"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          autoComplete="off"
          required
        />
        <Button type="submit" disabled={isPending}>
          초대 링크 만들기
        </Button>
      </form>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      {created ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-lg border p-3"
        >
          <p className="text-sm">
            @{created.login} 에게 이 링크를 보내 주세요. {INVITE_DAYS}일 동안 한
            번만 쓸 수 있고, 다시 볼 수 없습니다.
          </p>
          <code className="bg-muted rounded px-2 py-1 text-xs break-all">
            {created.url}
          </code>
          <div>
            <CopyButton text={created.url} label="링크 복사" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
