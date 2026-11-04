import type { SlackConnectionView } from "../schemas";
import { SlackControls } from "./SlackControls";

type Props = {
  projectId: string;
  configured: boolean;
  connection: SlackConnectionView | null;
  /** OAuth 에서 돌아온 결과(?slack=) */
  status?: string;
};

const STATUS: Record<string, { ok: boolean; text: string }> = {
  connected: {
    ok: true,
    text: "Slack 에 연결했습니다. 채널에 확인 메시지를 보냈어요.",
  },
  cancelled: { ok: false, text: "Slack 연결을 취소했습니다." },
  invalid_state: {
    ok: false,
    text: "연결 요청이 만료됐습니다. 다시 눌러 주세요.",
  },
  slack_failed: {
    ok: false,
    text: "Slack 연결에 실패했습니다. 다시 시도해 주세요.",
  },
  not_configured: { ok: false, text: "Slack 연결이 아직 설정되지 않았습니다." },
};

/** 프로젝트 화면: 운영 점검·PR 가드·보안 점검 결과를 Slack 채널로 받기 */
export function SlackSection({
  projectId,
  configured,
  connection,
  status,
}: Props) {
  const banner = status ? STATUS[status] : undefined;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="slack-title">
      <div className="flex flex-col gap-1">
        <h2 id="slack-title" className="text-lg font-semibold">
          Slack 알림
        </h2>
        <p className="text-muted-foreground text-sm">
          고른 Slack 채널 하나에 점검 결과를 보냅니다. 레고는 그 채널에 글을
          쓰는 것만 하고, 대화는 읽지 않습니다.
        </p>
      </div>
      {banner ? (
        <p
          role={banner.ok ? "status" : "alert"}
          className={banner.ok ? "text-sm" : "text-destructive text-sm"}
        >
          {banner.text}
        </p>
      ) : null}
      {connection ? (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <p className="text-sm">
            <span className="font-medium">#{connection.channelName}</span>
            <span className="text-muted-foreground">
              {" "}
              · {connection.teamName} 워크스페이스로 보냅니다
            </span>
          </p>
          {connection.lastError ? (
            <p role="alert" className="text-destructive text-sm">
              마지막 전송 실패: {connection.lastError}. 채널이 지워졌거나 앱이
              제거됐다면 연결을 끊고 다시 연결해 주세요.
            </p>
          ) : null}
          <SlackControls projectId={projectId} notify={connection.notify} />
        </div>
      ) : configured ? (
        <a
          href={`/api/slack/oauth/start?projectId=${projectId}`}
          className="hover:bg-muted inline-flex w-fit items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
        >
          Slack 에 추가
        </a>
      ) : (
        <p className="text-muted-foreground text-sm">
          Slack 연결이 아직 설정되지 않았습니다.
        </p>
      )}
    </section>
  );
}
