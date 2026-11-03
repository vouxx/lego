import { getCurrentUser } from "@/lib/auth";
import { admin } from "@/lib/admin";

const ALLOWED_HOSTS = new Set(["drive.example.com", "files.example.com"]);

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const { url } = await req.json();
  const target = new URL(url);
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname))
    return new Response("허용하지 않는 주소", { status: 400 });
  const blob = await (await fetch(target)).blob();
  await admin.storage.from("documents").upload(`${user.id}/${crypto.randomUUID()}`, blob);
  return Response.json({ ok: true });
}
