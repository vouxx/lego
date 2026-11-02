import { buttonVariants } from "@/shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

type Props = { installUrl: string; hasInstallations: boolean };

export function InstallAppCard({ installUrl, hasInstallations }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {hasInstallations ? "다른 계정이나 리포 추가" : "GitHub App 설치"}
        </CardTitle>
        <CardDescription>
          레고 GitHub App을 설치할 때 고른 리포만 읽습니다. 코드를 수정하거나
          커밋하지 않습니다.
        </CardDescription>
      </CardHeader>
      <div className="px-6">
        <a
          href={installUrl}
          className={buttonVariants({
            variant: hasInstallations ? "outline" : "default",
          })}
        >
          {hasInstallations ? "설치 설정 열기" : "GitHub App 설치하기"}
        </a>
      </div>
    </Card>
  );
}
