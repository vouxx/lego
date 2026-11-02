import type { Database } from "./database.types";

// 생성된 Tables<> 헬퍼는 public 스키마 기준이라 lego 스키마용 별칭을 둔다.
type Lego = Database["lego"];
export type Row<T extends keyof Lego["Tables"]> = Lego["Tables"][T]["Row"];
export type Insert<T extends keyof Lego["Tables"]> =
  Lego["Tables"][T]["Insert"];
export type Update<T extends keyof Lego["Tables"]> =
  Lego["Tables"][T]["Update"];
