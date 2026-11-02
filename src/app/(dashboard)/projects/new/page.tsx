import { Suspense } from "react";
import { InstallAppCard } from "@/features/projects/components/InstallAppCard";
import { InstallNotice } from "@/features/projects/components/InstallNotice";
import { RepoPicker } from "@/features/projects/components/RepoPicker";
import {
  getMyInstallations,
  listInstallableRepos,
} from "@/features/projects/services/projects";
import { githubAppInstallUrl } from "@/lib/github/app";

export default function NewProjectPage({
  searchParams,
}: PageProps<"/projects/new">) {
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">리포 연결</h1>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <NewProject searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NewProject({
  searchParams,
}: Pick<PageProps<"/projects/new">, "searchParams">) {
  const { notice, error } = await searchParams;
  const installations = await getMyInstallations();
  if (!installations.ok) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {installations.error.message}
      </p>
    );
  }

  const hasInstallations = installations.data.length > 0;
  const repos = hasInstallations ? await listInstallableRepos() : null;

  return (
    <>
      <InstallNotice
        notice={typeof notice === "string" ? notice : undefined}
        error={typeof error === "string" ? error : undefined}
      />
      {repos && !repos.ok ? (
        <p role="alert" className="text-destructive text-sm">
          {repos.error.message}
        </p>
      ) : null}
      {repos?.ok ? <RepoPicker repos={repos.data} /> : null}
      <InstallAppCard
        installUrl={githubAppInstallUrl()}
        hasInstallations={hasInstallations}
      />
    </>
  );
}
