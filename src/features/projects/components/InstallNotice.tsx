const NOTICES: Record<string, string> = {
  installed: "GitHub App이 연결되었습니다. 등록할 리포를 고르세요.",
  synced: "설치된 GitHub App을 불러왔습니다. 등록할 리포를 고르세요.",
  install_requested:
    "조직 관리자에게 설치 승인을 요청했습니다. 승인되면 다시 시도해 주세요.",
};

const ERRORS: Record<string, string> = {
  install_missing_params:
    "설치 정보를 받지 못했습니다. GitHub App 설정에서 '설치 중 사용자 인증 요청'이 켜져 있는지 확인해 주세요.",
  github_user_mismatch:
    "로그인한 GitHub 계정과 GitHub App을 설치한 계정이 다릅니다.",
  github_verify_failed:
    "GitHub에서 설치 정보를 확인하지 못했습니다. 다시 시도해 주세요.",
  installation_not_accessible: "이 설치에 접근할 권한이 없습니다.",
  installation_taken: "다른 레고 사용자가 이미 연결한 설치입니다.",
  no_installations:
    "설치된 레고 GitHub App을 찾지 못했습니다. 먼저 'GitHub App 설치하기'를 눌러 주세요.",
  db_error: "설치 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

type Props = { notice?: string; error?: string };

export function InstallNotice({ notice, error }: Props) {
  if (error) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {ERRORS[error] ?? "GitHub App 연결 중 문제가 생겼습니다."}
      </p>
    );
  }
  if (notice && NOTICES[notice]) {
    return <p className="text-muted-foreground text-sm">{NOTICES[notice]}</p>;
  }
  return null;
}
