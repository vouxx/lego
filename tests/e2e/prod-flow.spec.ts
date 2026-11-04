import { expect, test, type Page } from "@playwright/test";

/**
 * 운영 점검용. 로그인한 실제 계정으로 2~5단계를 한 번씩 돌린다.
 *   E2E_BASE_URL=https://vouxx-lego.vercel.app E2E_AUTH_FILE=tests/e2e/.auth/prod.json pnpm e2e:login
 *   E2E_BASE_URL=https://vouxx-lego.vercel.app pnpm e2e --project=prod-signed-in
 *
 * 테스트가 만든 것(설명·세션·스펙·임시 프로젝트)은 끝에 지운다. 기존 프로젝트는 지우지 않는다.
 * 규칙 파일은 ZEEK 에 만들어 둔 채로 남긴다. AI 비용은 한 번에 약 $0.3.
 */
const RULE_REPO = "vouxx/ZEEK";
const TEMP_REPO = "https://github.com/vouxx/vouxx.github.io";

test.describe.configure({ mode: "serial" });

async function openProject(page: Page, repo: string) {
  await page.goto("/projects", { waitUntil: "networkidle" });
  await page
    .getByRole("main")
    .getByRole("link", { name: new RegExp(repo) })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(repo);
}

async function deleteHere(page: Page, button: string, back: RegExp) {
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: button }).click();
  await expect(page).toHaveURL(back);
}

test("규칙 파일: 만들고, 규칙을 끄고, 저장한다", async ({ page }) => {
  test.setTimeout(150_000);
  await openProject(page, RULE_REPO);
  await page.getByRole("link", { name: "AI 규칙 파일 열기 →" }).click();
  const make = page.getByRole("button", { name: "CLAUDE.md 만들기" });
  const editor = page.getByRole("textbox", { name: /CLAUDE\.md 편집/ });
  // 처음이면 만들기 버튼, 이미 있으면 에디터가 뜬다. 화면이 다 뜬 뒤에 고른다.
  await expect(make.or(editor)).toBeVisible();
  if (await make.isVisible()) await make.click();
  await expect(editor).toHaveValue(/## 기술 스택/, { timeout: 120_000 });
  await expect(editor).toHaveValue(/## 폴더 구조/);

  const rule = page.getByRole("checkbox").first();
  const wasChecked = await rule.isChecked();
  await rule.setChecked(!wasChecked);
  await expect(page.getByText("저장하지 않은 변경 있음")).toBeVisible();
  await page.getByRole("button", { name: "새 버전으로 저장" }).click();
  await expect(page.getByRole("button", { name: "저장됨" })).toBeVisible();
  await expect(page.getByText(/PR 대신 내려받기/)).toBeVisible();
});

test("학습: 코드를 설명받고 퀴즈를 푼 뒤 지운다", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/learn", { waitUntil: "networkidle" });
  await page.getByLabel("설명할 코드").fill(`// 운영 점검 ${Date.now()}
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const { data } = await supabaseAdmin.from("orders").select("*").eq("id", id).single();
  return Response.json(data);
}`);
  await page.getByRole("button", { name: "설명해 줘" }).click();
  await expect(page).toHaveURL(/\/learn\/[0-9a-f-]+$/, { timeout: 120_000 });
  const quiz = page.getByRole("region", { name: "퀴즈" }).locator("fieldset");
  await expect(quiz.first()).toBeVisible();
  const count = await quiz.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++)
    await quiz.nth(i).getByRole("radio").first().check();
  await page.getByRole("button", { name: "채점하기" }).click();
  await expect(page.getByText(/\d\/\d 맞힘/)).toBeVisible();
  await deleteHere(page, "설명 지우기", /\/learn$/);
});

test("학습: 점검 결과의 '이게 뭐예요?'에서 설명을 만든 뒤 지운다", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await openProject(page, RULE_REPO);
  await page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ hasText: "완료" })
    .first()
    .getByRole("link")
    .click();
  await page.getByRole("link", { name: "이게 뭐예요? →" }).first().click();
  await page.getByRole("button", { name: "이 문제 설명 듣기" }).click();
  await expect(page).toHaveURL(/\/learn\/[0-9a-f-]+$/, { timeout: 120_000 });
  await expect(page.getByRole("heading", { name: "핵심 개념" })).toBeVisible();
  await deleteHere(page, "설명 지우기", /\/learn$/);
});

const FAKE_KEY = "sk-" + "ant-" + "api03-" + "q".repeat(40);
const LOG = [
  {
    type: "user",
    timestamp: "2026-11-03T05:00:00Z",
    message: { role: "user", content: `결제 웹훅 만들어줘. 키는 ${FAKE_KEY}` },
  },
  {
    type: "assistant",
    timestamp: "2026-11-03T05:01:00Z",
    message: {
      id: "a1",
      role: "assistant",
      content: [
        { type: "text", text: "웹훅 라우트를 만들었습니다." },
        {
          type: "tool_use",
          name: "Write",
          input: { file_path: "src/app/api/webhook/route.ts" },
        },
      ],
    },
  },
  {
    type: "user",
    timestamp: "2026-11-03T05:05:00Z",
    message: {
      role: "user",
      content: "서명 검증도 꼭 넣고, 검증 실패면 400 을 돌려줘.",
    },
  },
  {
    type: "assistant",
    timestamp: "2026-11-03T05:06:00Z",
    message: {
      id: "a2",
      role: "assistant",
      content: [
        {
          type: "text",
          text: "stripe.webhooks.constructEvent 로 검증하도록 바꿨습니다.",
        },
      ],
    },
  },
]
  .map((l) => JSON.stringify(l))
  .join("\n");

test("회고: 로그를 올려 분석하고, 키 마스킹·갤러리 공개를 확인한 뒤 지운다", async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  await page.goto("/sessions/new", { waitUntil: "networkidle" });
  await page.getByLabel("세션 로그 파일").setInputFiles({
    name: "prod-check.jsonl",
    mimeType: "application/json",
    buffer: Buffer.from(LOG),
  });
  const preview = page.getByRole("region", { name: "마스킹 미리보기" });
  await expect(preview).not.toContainText(FAKE_KEY);
  await page.getByLabel("세션 제목").fill("운영 점검용 세션(자동 삭제)");
  await page
    .getByRole("button", { name: "확인했어요, 올리고 분석하기" })
    .click();
  await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("heading", { name: "대화 타임라인" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("heading", { name: /잘 먹힌 프롬프트|교훈|막힌 지점/ })
      .first(),
  ).toBeVisible({
    timeout: 150_000,
  });
  await expect(page.getByText(FAKE_KEY)).toHaveCount(0);

  // 공개하면 로그인하지 않은 사람도 갤러리·공유 페이지에서 본다. 지우면 갤러리에서 사라진다.
  await page
    .getByRole("combobox")
    .filter({ hasText: "나만 보기" })
    .selectOption("public");
  const shareLink = page.getByRole("link", { name: /^\/s\// });
  await expect(shareLink).toBeVisible();
  const sharePath = (await shareLink.textContent())!.trim();
  const anon = await browser.newContext({ storageState: undefined });
  const visitor = await anon.newPage();
  await visitor.goto("/gallery", { waitUntil: "networkidle" });
  await expect(visitor.locator(`a[href="${sharePath}"]`)).toBeVisible();
  await visitor.goto(sharePath);
  await expect(
    visitor.getByRole("heading", { name: "대화 타임라인" }),
  ).toBeVisible();
  await expect(visitor.getByText(FAKE_KEY)).toHaveCount(0);

  await deleteHere(page, "세션 지우기", /\/sessions$/);
  await visitor.goto("/gallery", { waitUntil: "networkidle" });
  await expect(visitor.locator(`a[href="${sharePath}"]`)).toHaveCount(0);
  // 지운 세션은 내용 없이 '찾을 수 없음'. 링크 미리보기 봇은 상태 코드로도 404 를 받는다.
  await visitor.goto(sharePath);
  await expect(
    visitor.getByText(/could not be found|찾을 수 없/),
  ).toBeVisible();
  await expect(
    visitor.getByRole("heading", { name: "대화 타임라인" }),
  ).toHaveCount(0);
  const botView = await visitor.request.get(sharePath, {
    headers: { "user-agent": "Slackbot-LinkExpanding 1.0" },
  });
  expect(botView.status()).toBe(404);
  await anon.close();
});

test("스펙: 아이디어로 작업까지 만든 뒤 지운다", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/specs/new", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "팀 점심 메뉴 투표" }).click();
  await page.getByRole("button", { name: "다음: 확인 질문" }).click();
  await expect(page).toHaveURL(/\/specs\/[0-9a-f-]+$/, { timeout: 60_000 });
  const questions = page.getByRole("main").locator("fieldset");
  await expect(questions.first()).toBeVisible();
  const count = await questions.count();
  for (let i = 0; i < count; i++)
    await questions.nth(i).getByRole("button").first().click();
  await page.getByRole("button", { name: "스펙 만들기" }).click();
  await expect(page.getByRole("tab", { name: /작업 \(\d+\)/ })).toBeVisible({
    timeout: 280_000,
  });
  await expect(page.getByText("T-1", { exact: true }).first()).toBeVisible();
  await deleteHere(page, "스펙 지우기", /\/specs$/);
});

test("프로젝트: 공개 리포를 주소로 등록한 뒤 지운다", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/projects/new", { waitUntil: "networkidle" });
  await page.getByLabel("공개 리포 주소").fill(TEMP_REPO);
  await page
    .getByRole("button", { name: /등록|추가/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/, { timeout: 90_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "vouxx.github.io",
  );
  await deleteHere(page, "프로젝트 지우기", /\/projects$/);
  await expect(
    page.getByRole("main").getByText("vouxx/vouxx.github.io"),
  ).toHaveCount(0);
});
