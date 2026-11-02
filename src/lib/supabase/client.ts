import { createBrowserClient } from "@supabase/ssr";
import { DB_SCHEMA, publicEnv } from "./env";

export function createClient() {
  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { db: { schema: DB_SCHEMA } },
  );
}
