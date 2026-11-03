import { readDoc } from "@/lib/docs";

export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name") ?? "intro";
  return new Response(await readDoc(name));
}
