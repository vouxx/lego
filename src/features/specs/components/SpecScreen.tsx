import { PageHeader } from "@/shared/ui/page-header";
import Link from "next/link";
import type { SpecView } from "../services/specs";
import { ContextDraftPanel } from "./ContextDraftPanel";
import { DesignView } from "./DesignView";
import { PrdEditor } from "./PrdEditor";
import { QuestionForm } from "./QuestionForm";
import { RetryGeneration } from "./RetryGeneration";
import { SpecTabs } from "./SpecTabs";
import { TaskBoard } from "./TaskBoard";

type Props = { spec: SpecView };

export function SpecScreen({ spec }: Props) {
  return (
    <>
      <PageHeader
        trail={[{ href: "/specs", label: "스펙" }, { label: spec.title }]}
        title={spec.title}
        description={
          <div className="flex flex-col gap-1">
            <span>{spec.idea}</span>
            <span className="font-mono text-xs">
              {spec.stack ? `${spec.stack} · ` : ""}
              {spec.project ? (
                <Link
                  href={`/projects/${spec.project.id}`}
                  className="hover:text-foreground underline"
                >
                  {spec.project.name}
                </Link>
              ) : (
                "리포 없음"
              )}
            </span>
          </div>
        }
      />
      <SpecBody spec={spec} />
    </>
  );
}

function SpecBody({ spec }: Props) {
  if (spec.status === "questions") {
    return (
      <QuestionForm
        specId={spec.id}
        questions={spec.questions}
        initialAnswers={spec.answers}
      />
    );
  }
  if (spec.status === "generating") {
    const stale = spec.generationStale;
    return (
      <RetryGeneration
        specId={spec.id}
        progress={spec.progress}
        canRetry={stale}
        message={
          stale
            ? "생성이 멈춘 것 같습니다. 다시 만들어 주세요."
            : "스펙을 만들고 있습니다. 잠시 뒤 새로고침해 주세요."
        }
      />
    );
  }
  if (spec.status === "failed") {
    return (
      <RetryGeneration
        specId={spec.id}
        progress={spec.progress}
        canRetry={spec.questions.length > 0}
        message={spec.error ?? "스펙을 만들지 못했습니다."}
      />
    );
  }
  return (
    <SpecTabs
      tabs={[
        {
          id: "tasks",
          label: `작업 (${spec.tasks.length})`,
          content: <TaskBoard tasks={spec.tasks} />,
        },
        {
          id: "prd",
          label: "PRD",
          content: <PrdEditor specId={spec.id} prd={spec.prd} />,
        },
        {
          id: "design",
          label: "설계",
          content: <DesignView tables={spec.tables} screens={spec.screens} />,
        },
        {
          id: "context",
          label: "CLAUDE.md 초안",
          content: (
            <ContextDraftPanel
              content={spec.contextMd}
              project={spec.project}
            />
          ),
        },
      ]}
    />
  );
}
