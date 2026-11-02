import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";

export function NoteBody({ body }: { body: string }) {
  return (
    <div
      className="prose"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(body, { async: false })) }}
    />
  );
}
