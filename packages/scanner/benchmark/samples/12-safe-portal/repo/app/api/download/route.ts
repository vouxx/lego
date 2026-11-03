import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const file = path.basename(new URL(req.url).searchParams.get("file") ?? "");
  return new Response(await readFile(path.join(UPLOAD_DIR, user.id, file)));
}
