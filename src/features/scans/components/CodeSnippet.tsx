import { codeToHtml } from "shiki";

const LANGS: [RegExp, string][] = [
  [/\.tsx$/, "tsx"],
  [/\.[cm]?ts$/, "ts"],
  [/\.jsx$/, "jsx"],
  [/\.[cm]?js$/, "js"],
  [/\.sql$/, "sql"],
];

type Props = { code: string; filePath: string; firstLine: number };

export async function CodeSnippet({ code, filePath, firstLine }: Props) {
  const lang = LANGS.find(([pattern]) => pattern.test(filePath))?.[1] ?? "text";
  const html = await codeToHtml(code, {
    lang,
    theme: "github-light",
    transformers: [
      {
        line(node, line) {
          node.properties["data-line"] = firstLine + line - 1;
        },
      },
    ],
  });

  return (
    <div
      className="[&_.line]:before:text-muted-foreground overflow-x-auto rounded-md border text-xs [&_.line]:before:mr-4 [&_.line]:before:inline-block [&_.line]:before:w-8 [&_.line]:before:text-right [&_.line]:before:content-[attr(data-line)] [&_pre]:p-3"
      // Shiki 가 코드를 HTML 이스케이프해서 만든 결과라 그대로 넣어도 안전하다.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
