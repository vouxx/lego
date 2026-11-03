import { buttonVariants } from "@/shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

type Props = {
  installUrl: string;
  /** 이미 설치한 App 을 다시 연결하는 사용자 인증 주소 */
  authorizeUrl: string;
  hasInstallations: boolean;
};

export function InstallAppCard({
  installUrl,
  authorizeUrl,
  hasInstallations,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {hasInstallations ? "다른 계정이나 리포 추가" : "GitHub App 설치"}
        </CardTitle>
        <CardDescription>
          비공개 리포는 레고 GitHub App에 읽기 권한을 줘야 점검할 수 있습니다.
          설치할 때 고른 리포만 읽고, 코드를 수정하거나 커밋하지 않습니다.
          GitHub 설정은 새 탭에서 열리고, 이 탭으로 돌아오면 목록이 저절로
          갱신됩니다.
        </CardDescription>
      </CardHeader>
      <div className="flex flex-wrap items-center gap-3 px-6">
        <a
          href={installUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({
            variant: hasInstallations ? "outline" : "default",
          })}
        >
          {hasInstallations ? "설치 설정 열기 ↗" : "GitHub App 설치하기 ↗"}
        </a>
        <a href={authorizeUrl} className={buttonVariants({ variant: "ghost" })}>
          이미 설치했다면 설치 불러오기
        </a>
      </div>
    </Card>
  );
}
