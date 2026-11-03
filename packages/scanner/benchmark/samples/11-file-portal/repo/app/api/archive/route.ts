import { execSync } from "node:child_process";
import { getCurrentUser } from "@/lib/session";

// 선택한 폴더를 zip 으로 묶어 내려준다.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const { folder } = await req.json();
  const zip = execSync(`cd uploads/${user.id} && zip -r - ${folder}`);
  return new Response(zip);
}
