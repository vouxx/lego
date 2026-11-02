import { NextResponse } from "next/server";
import { octokit, REPO } from "@/lib/github";

// Sentry 알림이 오면 GitHub 이슈를 자동으로 만든다
export async function POST(req: Request) {
  const payload = await req.json();
  const issue = payload.data?.issue;
  if (!issue) return NextResponse.json({ skipped: true });

  await octokit.issues.create({
    ...REPO,
    title: `[Sentry] ${issue.title}`,
    body: `${issue.culprit ?? ""}\n\n${issue.permalink ?? ""}`,
    labels: ["bug", "sentry"],
  });

  return NextResponse.json({ ok: true });
}
