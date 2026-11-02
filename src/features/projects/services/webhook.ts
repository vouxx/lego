import "server-only";
import { verify } from "@octokit/webhooks-methods";
import { z } from "zod";
import { githubWebhookSecret } from "@/lib/github/app";
import { err, ok, type Result } from "@/shared/lib/result";
import { deleteInstallation, deleteProjectsByRepos } from "../repository";

const installationEvent = z.object({
  action: z.string(),
  installation: z.object({ id: z.number() }),
});

const installationRepositoriesEvent = installationEvent.extend({
  repositories_removed: z
    .array(z.object({ full_name: z.string() }))
    .default([]),
});

export async function verifyWebhookSignature(
  payload: string,
  signature: string | null,
) {
  if (!signature) return false;
  try {
    return await verify(githubWebhookSecret(), payload, signature);
  } catch {
    return false;
  }
}

/** 설치 삭제, 리포 접근 해제를 반영한다. 나머지 이벤트는 무시한다. */
export async function handleWebhookEvent(
  event: string | null,
  payload: unknown,
): Promise<Result<{ handled: boolean }>> {
  if (event === "installation") {
    const parsed = installationEvent.safeParse(payload);
    if (!parsed.success)
      return err("invalid_payload", "installation 이벤트 형식이 다릅니다.");
    if (parsed.data.action !== "deleted") return ok({ handled: false });

    const { error } = await deleteInstallation(parsed.data.installation.id);
    return error ? err("db_error", error.message) : ok({ handled: true });
  }

  if (event === "installation_repositories") {
    const parsed = installationRepositoriesEvent.safeParse(payload);
    if (!parsed.success) {
      return err(
        "invalid_payload",
        "installation_repositories 이벤트 형식이 다릅니다.",
      );
    }
    const removed = parsed.data.repositories_removed.map((r) => r.full_name);
    if (removed.length === 0) return ok({ handled: false });

    const { error } = await deleteProjectsByRepos(
      parsed.data.installation.id,
      removed,
    );
    return error ? err("db_error", error.message) : ok({ handled: true });
  }

  return ok({ handled: false });
}
