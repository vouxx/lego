import { redirect } from "next/navigation";
import { Suspense } from "react";
import { InviteScreen } from "@/features/members/components/InviteScreen";
import { getInviteView } from "@/features/members/services/members";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/shared/ui/page-header";

type Props = PageProps<"/invites/[token]">;

export default function InvitePage({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-12">
      <PageHeader title="프로젝트 초대" />
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Invite params={params} />
      </Suspense>
    </main>
  );
}

async function Invite({ params }: Pick<Props, "params">) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/invites/${encodeURIComponent(token)}`);
  const view = await getInviteView(user, token);
  return <InviteScreen view={view} token={token} myLogin={user.githubLogin} />;
}
