import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = { content: string };

/** 규칙 파일 미리보기. HTML 은 렌더링하지 않는다(react-markdown 기본값). */
export function MarkdownPreview({ content }: Props) {
  if (!content.trim()) {
    return <p className="text-muted-foreground text-sm">내용이 없습니다.</p>;
  }
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => <h1 className="text-lg font-semibold" {...props} />,
          h2: (props) => (
            <h2 className="mt-2 text-base font-semibold" {...props} />
          ),
          h3: (props) => <h3 className="font-semibold" {...props} />,
          ul: (props) => (
            <ul className="flex list-disc flex-col gap-1 pl-5" {...props} />
          ),
          ol: (props) => (
            <ol className="flex list-decimal flex-col gap-1 pl-5" {...props} />
          ),
          code: (props) => (
            <code className="bg-muted rounded px-1 py-0.5 text-xs" {...props} />
          ),
          pre: (props) => (
            <pre className="bg-muted overflow-x-auto rounded p-2" {...props} />
          ),
          a: (props) => (
            <a
              className="underline"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
