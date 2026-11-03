import { admin } from "@/lib/admin";

export async function GET() {
  const { data } = await admin.from("files").select("id, name, owner_id, path");
  return Response.json(data);
}
