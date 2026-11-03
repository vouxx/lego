import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getCurrentUser } from "@/lib/auth";

const run = promisify(execFile);

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const { folder } = await req.json();
  const { stdout } = await run("zip", ["-r", "-", "--", String(folder)], {
    cwd: `uploads/${user.id}`,
  });
  return new Response(stdout);
}
