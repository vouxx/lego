import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { PrivateRepoSection } from "@/features/projects/components/PrivateRepoSection";
import { PublicRepoSection } from "@/features/projects/components/PublicRepoSection";
import {
  getMyInstallations,
  listInstallableRepos,
} from "@/features/projects/services/projects";
import { githubAppAuthorizeUrl, githubAppInstallUrl } from "@/lib/github/app";
import { PageHeader } from "@/shared/ui/page-header";

export default function NewProjectPage({
  searchParams,
}: PageProps<"/projects/new">) {
  return (
    <main className="flex flex-col gap-10">
      <PageHeader
        trail={[{ href: "/projects", label: "프로젝트" }, { label: "연결" }]}
        title="리포 연결"
        description="코드는 읽기만 하고, 결과에는 문제가 된 몇 줄만 남깁니다."
      />
      <PublicRepoSection />
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">비공개 리포 · 조직 리포</h2>
        <Suspense
          fallback={
            <p className="text-muted-foreground text-sm">불러오는 중…</p>
          }
        >
          <PrivateRepos searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  );
}

async function PrivateRepos({
  searchParams,
}: Pick<PageProps<"/projects/new">, "searchParams">) {
  const { notice, error } = await searchParams;
  const user = await requireUser();
  const installations = await getMyInstallations();
  const hasInstallations = installations.ok && installations.data.length > 0;
  const repos = hasInstallations ? await listInstallableRepos(user) : null;

  return (
    <PrivateRepoSection
      notice={typeof notice === "string" ? notice : undefined}
      error={typeof error === "string" ? error : undefined}
      loadError={installations.ok ? null : installations.error.message}
      repos={repos}
      hasInstallations={hasInstallations}
      installUrl={githubAppInstallUrl()}
      authorizeUrl={githubAppAuthorizeUrl()}
    />
  );
}
