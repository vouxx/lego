import { notFound } from "next/navigation";
import { marked } from "marked";
import { db } from "@/lib/db";
import CommentList from "@/components/CommentList";

export default async function PostPage({ params }: { params: { slug: string } }) {
  const { rows } = await db.query(
    "SELECT id, title, body, created_at FROM posts WHERE slug = $1 AND published = true",
    [params.slug],
  );
  const post = rows[0];
  if (!post) notFound();

  const html = marked.parse(post.body);

  return (
    <article className="prose mx-auto py-10">
      <h1>{post.title}</h1>
      <time>{new Date(post.created_at).toLocaleDateString("ko-KR")}</time>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <CommentList postId={post.id} />
    </article>
  );
}
