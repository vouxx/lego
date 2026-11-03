import { z } from "zod";
import type { StackTag } from "@/shared/stack/schema";

const detectSchema = z.object({
  always: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export type RulePack = {
  id: string;
  slug: string;
  name: string;
  detect: unknown;
  items: {
    id: string;
    section: string;
    content: string;
    sortOrder: number;
    defaultEnabled: boolean;
  }[];
};

/** 감지된 스택 태그에 맞는 규칙 팩만 고른다. 순서는 입력 순서를 따른다. */
export function selectPacks<P extends Pick<RulePack, "detect">>(
  packs: P[],
  tags: StackTag[],
): P[] {
  return packs.filter((pack) => {
    const detect = detectSchema.safeParse(pack.detect);
    if (!detect.success) return false;
    if (detect.data.always) return true;
    return (detect.data.tags ?? []).some((t) => (tags as string[]).includes(t));
  });
}
