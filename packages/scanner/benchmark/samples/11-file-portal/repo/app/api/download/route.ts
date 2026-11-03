import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/session";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const file = new URL(req.url).searchParams.get("file") ?? "";
  const data = await readFile(path.join(UPLOAD_DIR, user.id, file));
  return new Response(data);
}
