import axios from "axios";
import jwt from "jsonwebtoken";

const SECRET = process.env.INVITE_TOKEN_SECRET!;

export function createInviteToken(workspaceId: string, email: string) {
  return jwt.sign({ workspaceId, email }, SECRET, { expiresIn: "3d" });
}

export function readInviteToken(token: string) {
  return jwt.verify(token, SECRET, { algorithms: ["HS256"] }) as { workspaceId: string; email: string };
}

export async function notifySlack(text: string) {
  if (!process.env.SLACK_WEBHOOK_URL) return;
  await axios.post(process.env.SLACK_WEBHOOK_URL, { text });
}
