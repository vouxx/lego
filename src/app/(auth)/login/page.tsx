import { safeNextPath } from "@/shared/lib/safe-redirect";
import { Suspense } from "react";
import { GitHubSignInForm } from "@/features/auth/components/GitHubSignInForm";
import { SignInError } from "@/features/auth/components/SignInError";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>레고 시작하기</CardTitle>
          <CardDescription>
            GitHub 계정으로 로그인하고 리포를 연결하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Suspense fallback={<GitHubSignInForm />}>
            <LoginForm searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}

async function LoginForm({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const { next, error } = await searchParams;
  return (
    <>
      <SignInError code={typeof error === "string" ? error : undefined} />
      <GitHubSignInForm
        next={typeof next === "string" ? safeNextPath(next) : undefined}
      />
    </>
  );
}
