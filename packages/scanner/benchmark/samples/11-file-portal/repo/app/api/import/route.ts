import { admin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/session";

// 다른 사이트의 파일을 주소로 가져온다.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const { url, name } = await req.json();
  const res = await fetch(url);
  const blob = await res.blob();
  await admin.storage.from("documents").upload(`${user.id}/${name}`, blob);
  return Response.json({ ok: true });
}
