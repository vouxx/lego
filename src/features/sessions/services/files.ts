import "server-only";
import { downloadSessionFile } from "../repository";
import {
  MAX_UPLOAD_BYTES,
  uploadFileSchema,
  type UploadFile,
} from "../schemas";

/** Storage 의 세션 파일을 읽어 형식을 검사한다. */
export async function readSessionFile(
  path: string,
): Promise<UploadFile | null> {
  const { data, error } = await downloadSessionFile(path);
  if (error || !data || data.size > MAX_UPLOAD_BYTES) return null;
  try {
    const parsed = uploadFileSchema.safeParse(JSON.parse(await data.text()));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
