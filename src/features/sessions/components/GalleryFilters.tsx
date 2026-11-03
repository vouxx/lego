import Link from "next/link";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { SESSION_TOOLS, TOOL_LABELS, type SessionTool } from "../schemas";

type Props = {
  filter: {
    q: string | null;
    tag: string | null;
    tool: SessionTool | null;
    sort: "recent" | "likes";
  };
  tags: string[];
};

/** GET 폼이라 JS 없이도 동작한다. */
export function GalleryFilters({ filter, tags }: Props) {
  const href = (
    patch: Partial<Record<"tag" | "tool" | "sort" | "q", string | null>>,
  ) => {
    const params = new URLSearchParams();
    const merged = { ...filter, ...patch };
    for (const [key, value] of Object.entries(merged))
      if (value) params.set(key, value);
    return `/gallery?${params.toString()}`;
  };
  return (
    <div className="flex flex-col gap-3">
      <form action="/gallery" className="flex gap-2">
        <Input
          name="q"
          defaultValue={filter.q ?? ""}
          placeholder="제목·목표 검색"
          aria-label="검색"
        />
        {filter.tag ? (
          <input type="hidden" name="tag" value={filter.tag} />
        ) : null}
        {filter.tool ? (
          <input type="hidden" name="tool" value={filter.tool} />
        ) : null}
        <input type="hidden" name="sort" value={filter.sort} />
        <Button type="submit" variant="outline">
          검색
        </Button>
      </form>
      <div className="flex flex-wrap gap-2 text-xs">
        {SESSION_TOOLS.map((tool) => (
          <Link
            key={tool}
            href={href({ tool: filter.tool === tool ? null : tool })}
            className={cn(
              "rounded-md border px-2 py-1",
              filter.tool === tool && "bg-primary text-primary-foreground",
            )}
          >
            {TOOL_LABELS[tool]}
          </Link>
        ))}
        <span className="text-muted-foreground px-1">|</span>
        <Link
          href={href({ sort: "recent" })}
          className={cn(
            "px-1",
            filter.sort === "recent" && "font-semibold underline",
          )}
        >
          최신순
        </Link>
        <Link
          href={href({ sort: "likes" })}
          className={cn(
            "px-1",
            filter.sort === "likes" && "font-semibold underline",
          )}
        >
          좋아요순
        </Link>
      </div>
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1 text-xs">
          {tags.map((tag) => (
            <Link
              key={tag}
              href={href({ tag: filter.tag === tag ? null : tag })}
              className={cn(
                "bg-muted rounded px-1.5 py-0.5",
                filter.tag === tag && "bg-primary text-primary-foreground",
              )}
            >
              #{tag}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
