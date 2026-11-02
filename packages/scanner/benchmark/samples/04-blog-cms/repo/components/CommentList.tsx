import { db } from "@/lib/db";

// 댓글에 링크/굵게 정도는 허용하고 싶어서 script 태그만 지운다
function sanitize(html: string) {
  return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
}

export default async function CommentList({ postId }: { postId: number }) {
  const { rows: comments } = await db.query(
    "SELECT id, author_name, body FROM comments WHERE post_id = $1 ORDER BY created_at",
    [postId],
  );

  return (
    <section className="mt-12">
      <h2>댓글 {comments.length}개</h2>
      {comments.map((c) => (
        <div key={c.id} className="border-b py-3">
          <strong>{c.author_name}</strong>
          <p dangerouslySetInnerHTML={{ __html: sanitize(c.body) }} />
        </div>
      ))}
    </section>
  );
}
