import { admin } from "@/lib/admin";
import { FileList } from "@/components/FileList";

// middleware 가 로그인을 확인하니까 여기서는 바로 읽는다.
export default async function DashboardPage() {
  const { data: files } = await admin.from("files").select("*").order("created_at");
  return <FileList files={files ?? []} />;
}
