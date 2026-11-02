import { Octokit } from "@octokit/rest";
import { createHmac, timingSafeEqual } from "node:crypto";

// 봇 계정 토큰 (repo, issues 권한)
export const octokit = new Octokit({
  auth: "{{GITHUB_TOKEN}}",
  userAgent: "release-helper-bot",
});

export const REPO = { owner: "acme-dev", repo: "web" };

export function verifySignature(body: string, signature: string) {
  const expected =
    "sha256=" +
    createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET!).update(body).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
