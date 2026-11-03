import { describe, expect, it } from "vitest";
import { maskMessages, maskText } from "./mask";
import { parseSession } from "./parse";

// 가짜 비밀값은 이어 붙여 만든다(GitHub push protection).
const SECRETS = {
  anthropic: "sk-" + "ant-" + "api03-" + "a".repeat(40),
  openai: "sk-" + "proj-" + "b".repeat(48),
  stripe: "sk_" + "live_" + "c".repeat(30),
  aws: "AKIA" + "ABCDEFGHIJKLMNOP",
  github: "ghp_" + "d".repeat(36),
  supabase: "sb_" + "secret_" + "e".repeat(30),
  slack: "xox" + "b-" + "1234567890-abcdefghij",
  google: "AIza" + "f".repeat(35),
  serviceRole:
    "eyJhbGciOiJIUzI1NiJ9." +
    btoa(JSON.stringify({ role: "service_role", iss: "supabase" })).replace(
      /=+$/,
      "",
    ) +
    "." +
    "g".repeat(20),
  password: "hunter2-very-secret",
  dbPassword: "p4ssw0rd-xyz",
  email: "jane.doe@example.com",
  home: "/Users/janedoe/projects",
  pemBody: "MIIEvQIBADANBgkqhkiG9w0BAQEFAASC" + "h".repeat(40),
};

function line(o: unknown) {
  return JSON.stringify(o);
}

// 비밀값을 여러 위치(사용자 글, 답변, 도구 입력, 도구 결과, .env 내용, 개인 키)에 심은 로그
const LOG = [
  line({
    type: "user",
    message: {
      role: "user",
      content: `이 키로 해줘 ${SECRETS.anthropic} 내 메일은 ${SECRETS.email}`,
    },
  }),
  line({
    type: "assistant",
    message: {
      id: "m1",
      role: "assistant",
      content: [
        { type: "thinking", thinking: `몰래 ${SECRETS.github}` },
        { type: "text", text: `OpenAI 키 ${SECRETS.openai} 를 넣었습니다.` },
        {
          type: "tool_use",
          name: "Write",
          input: { file_path: `${SECRETS.home}/.env`, content: SECRETS.stripe },
        },
      ],
    },
  }),
  line({
    type: "user",
    message: {
      role: "user",
      content: [
        {
          type: "tool_result",
          content: [
            `AWS_ACCESS_KEY_ID=${SECRETS.aws}`,
            `SUPABASE_SECRET_KEY=${SECRETS.supabase}`,
            `SLACK_TOKEN=${SECRETS.slack}`,
            `GOOGLE_KEY=${SECRETS.google}`,
            `SERVICE_ROLE=${SECRETS.serviceRole}`,
            `DB_PASSWORD=${SECRETS.password}`,
            `DATABASE_URL=postgres://admin:${SECRETS.dbPassword}@db.example.com/app`,
            `-----BEGIN PRIVATE KEY-----\n${SECRETS.pemBody}\n-----END PRIVATE KEY-----`,
          ].join("\n"),
        },
      ],
    },
  }),
  line({
    type: "assistant",
    isSidechain: true,
    message: {
      id: "s",
      role: "assistant",
      content: [{ type: "text", text: SECRETS.github }],
    },
  }),
].join("\n");

describe("세션 마스킹 테스트 세트", () => {
  it("심어 둔 비밀값이 하나도 남지 않는다", () => {
    const { messages, count } = maskMessages(parseSession("claude_code", LOG));
    const out = JSON.stringify(messages);
    const leaked = Object.entries(SECRETS)
      .filter(([, value]) => out.includes(value))
      .map(([key]) => key);
    expect(leaked).toEqual([]);
    expect(count).toBeGreaterThan(5);
  });

  it("마스킹은 여러 번 해도 결과가 같다(서버 2차 검사에서 바뀌지 않음)", () => {
    const once = maskMessages(parseSession("claude_code", LOG)).messages;
    const twice = maskMessages(once);
    expect(twice.messages).toEqual(once);
    expect(twice.count).toBe(0);
  });

  it("이메일과 홈 경로를 가린다", () => {
    expect(maskText(`${SECRETS.email} ${SECRETS.home}/a.ts`).text).toBe(
      "<email> /Users/<user>/projects/a.ts",
    );
  });
});
