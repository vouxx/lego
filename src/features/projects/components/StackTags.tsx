import { STACK_LABELS, type StackTag } from "@/shared/stack/schema";

type Props = { tags: StackTag[] };

export function StackTags({ tags }: Props) {
  if (tags.length === 0) {
    return <p className="text-muted-foreground text-sm">감지된 스택 없음</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li
          key={tag}
          className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs"
        >
          {STACK_LABELS[tag]}
        </li>
      ))}
    </ul>
  );
}
