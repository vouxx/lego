import type { Result } from "@/shared/lib/result";
import type { InstallableRepo } from "../schemas";
import { InstallAppCard } from "./InstallAppCard";
import { InstallNotice } from "./InstallNotice";
import { RepoPicker } from "./RepoPicker";

type Props = {
  notice?: string;
  error?: string;
  loadError: string | null;
  repos: Result<InstallableRepo[]> | null;
  hasInstallations: boolean;
  installUrl: string;
  authorizeUrl: string;
};

export function PrivateRepoSection({
  notice,
  error,
  loadError,
  repos,
  hasInstallations,
  installUrl,
  authorizeUrl,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <InstallNotice notice={notice} error={error} />
      {loadError ? (
        <p role="alert" className="text-destructive text-sm">
          {loadError}
        </p>
      ) : null}
      {repos && !repos.ok ? (
        <p role="alert" className="text-destructive text-sm">
          {repos.error.message}
        </p>
      ) : null}
      {repos?.ok ? <RepoPicker repos={repos.data} /> : null}
      <InstallAppCard
        installUrl={installUrl}
        authorizeUrl={authorizeUrl}
        hasInstallations={hasInstallations}
      />
    </div>
  );
}
