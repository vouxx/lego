import { Card, CardContent } from "@/shared/ui/card";
import { TARGET_INFO, type ContextTarget } from "../schemas";
import { GenerateContextButton } from "./GenerateContextButton";

type Props = { projectId: string; target: ContextTarget };

export function EmptyContext({ projectId, target }: Props) {
  const { path, tool } = TARGET_INFO[target];
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold">아직 {path} 가 없습니다</h2>
          <p className="text-muted-foreground text-sm">
            리포의 기술 스택과 폴더 구조를 읽고, {tool} 가 작업 전에 읽을 규칙
            파일 초안을 만듭니다. 보안 점검에서 나온 문제는 &lsquo;주의할
            점&rsquo;으로 들어갑니다.
          </p>
        </div>
        <GenerateContextButton
          projectId={projectId}
          target={target}
          label={`${path} 만들기`}
        />
      </CardContent>
    </Card>
  );
}
