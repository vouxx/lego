import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * 세션 회고: 로그 업로드(브라우저 마스킹) → 분석 → 공개 → 갤러리 → 공유 이미지.
 * 로컬 Supabase 에서 `pnpm e2e:local-seed` 뒤에 돈다. Sonnet 을 한 번 부른다.
 */
test.skip(
  !existsSync("tests/e2e/.auth/local-project.json"),
  "pnpm e2e:local-seed 를 먼저 실행해 주세요.",
);

const FAKE_KEY = "sk-" + "ant-" + "api03-" + "z".repeat(40);
const line = (o: unknown) => JSON.stringify(o);
const LOG = [
  line({
    type: "user",
    timestamp: "2026-11-03T01:00:00Z",
    message: {
      role: "user",
      content: `Next.js 에 Supabase 로그인을 붙여줘. 키는 ${FAKE_KEY}`,
    },
  }),
  line({
    type: "assistant",
    timestamp: "2026-11-03T01:01:00Z",
    message: {
      id: "a1",
      role: "assistant",
      content: [
        { type: "text", text: "키는 .env.local 에 넣겠습니다." },
        {
          type: "tool_use",
          name: "Edit",
          input: { file_path: "src/lib/supabase.ts" },
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
          content: "Error: Cannot find module '@supabase/ssr'",
          is_error: true,
        },
      ],
    },
  }),
  line({
    type: "assistant",
    message: {
      id: "a2",
      role: "assistant",
      content: [
        {
          type: "tool_use",
          name: "Edit",
          input: { file_path: "src/lib/supabase.ts" },
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
          content: "Error: Cannot find module '@supabase/ssr'",
          is_error: true,
        },
      ],
    },
  }),
  line({
    type: "user",
    timestamp: "2026-11-03T01:10:00Z",
    message: {
      role: "user",
      content:
        "먼저 pnpm add @supabase/ssr 로 설치하고, 미들웨어에서 세션을 갱신하는 공식 패턴대로 다시 해줘.",
    },
  }),
  line({
    type: "assistant",
    timestamp: "2026-11-03T01:15:00Z",
    message: {
      id: "a3",
      role: "assistant",
      content: [
        {
          type: "text",
          text: "설치 후 middleware.ts 에 updateSession 을 추가했고 로그인이 동작합니다.",
        },
        {
          type: "tool_use",
          name: "Write",
          input: { file_path: "middleware.ts" },
        },
      ],
    },
  }),
].join("\n");

test("세션을 올려 분석하고 공개하면 갤러리와 공유 페이지에 나온다", async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  await page.goto("/sessions/new");
  await page.getByLabel("세션 로그 파일").setInputFiles({
    name: "session.jsonl",
    mimeType: "application/json",
    buffer: Buffer.from(LOG),
  });

  const preview = page.getByRole("region", { name: "마스킹 미리보기" });
  await expect(preview).toContainText("Supabase 로그인을 붙여줘");
  await expect(preview).not.toContainText(FAKE_KEY);
  await expect(preview).toContainText("sk-ant-****");

  await page
    .getByRole("button", { name: "확인했어요, 올리고 분석하기" })
    .click();
  await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("heading", { name: "잘 먹힌 프롬프트" }),
  ).toBeVisible({ timeout: 150_000 });
  await expect(page.getByText(FAKE_KEY)).toHaveCount(0);

  await page
    .getByRole("combobox")
    .filter({ hasText: "나만 보기" })
    .selectOption("public");
  const shareLink = page.getByRole("link", { name: /^\/s\// });
  await expect(shareLink).toBeVisible();
  const sharePath = (await shareLink.textContent())!.trim();

  const anon = await browser.newContext({ storageState: undefined });
  const visitor = await anon.newPage();
  await visitor.goto(sharePath);
  await expect(
    visitor.getByRole("heading", { name: "대화 타임라인" }),
  ).toBeVisible();
  await expect(visitor.getByText(FAKE_KEY)).toHaveCount(0);

  await visitor.goto("/gallery");
  await expect(visitor.locator(`a[href="${sharePath}"]`)).toBeVisible();

  await visitor.goto(sharePath);
  const ogUrl = await visitor
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  const og = await visitor.request.get(ogUrl!);
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
  await anon.close();
});
