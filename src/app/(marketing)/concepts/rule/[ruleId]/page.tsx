import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { conceptSlugForRule } from "@/features/concepts/services/views";

type Props = PageProps<"/concepts/rule/[ruleId]">;

/** 점검 결과의 '이게 뭐예요?' → 규칙과 연결된 개념 페이지로 보낸다. */
export default function RuleConceptPage({ params }: Props) {
  return (
    <Suspense fallback={null}>
      <Redirect params={params} />
    </Suspense>
  );
}

async function Redirect({ params }: Pick<Props, "params">): Promise<null> {
  const slug = await conceptSlugForRule((await params).ruleId);
  if (!slug) notFound();
  redirect(`/concepts/${slug}`);
}
