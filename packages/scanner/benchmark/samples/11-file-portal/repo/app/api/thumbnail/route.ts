import { exec } from "node:child_process";
import { promisify } from "node:util";
import { getCurrentUser } from "@/lib/session";

const run = promisify(exec);

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const { name, size } = await req.json();
  await run(`convert uploads/${user.id}/${name} -resize ${size} thumbs/${name}.png`);
  return Response.json({ ok: true });
}
