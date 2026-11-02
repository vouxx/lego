"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function createPost(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const title = String(formData.get("title"));
  const slug = String(formData.get("slug"));
  const body = String(formData.get("body"));
  await db.query(
    "INSERT INTO posts (title, slug, body, published) VALUES ($1, $2, $3, true)",
    [title, slug, body],
  );
  revalidatePath("/");
  redirect(`/posts/${slug}`);
}

export async function updatePost(id: number, title: string, body: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await db.query(`UPDATE posts SET title = '${title}', body = $1, updated_at = now() WHERE id = $2`, [body, id]);
  revalidatePath("/");
}

export async function deletePost(id: number) {
  await db.query("DELETE FROM posts WHERE id = $1", [id]);
  revalidatePath("/");
}
