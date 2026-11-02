import "server-only";
import postgres from "postgres";

// 공개 글 검색용 읽기 전용 커넥션
export const sql = postgres(process.env.DATABASE_URL!, { max: 5 });
