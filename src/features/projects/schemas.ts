import { z } from "zod";
import type { DetectedStack } from "@/shared/stack/schema";

export const createProjectInput = z.object({
  repoFullName: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, "owner/repo 형식이어야 합니다."),
});
export type CreateProjectInput = z.infer<typeof createProjectInput>;

export const deleteProjectInput = z.object({ projectId: z.uuid() });

export const addPublicRepoInput = z.object({
  url: z.string().trim().min(1, "리포 주소를 입력해 주세요.").max(300),
});

export type InstallableRepo = {
  fullName: string;
  installationId: number;
  defaultBranch: string;
  isPrivate: boolean;
  alreadyAdded: boolean;
};

export type ProjectSummary = {
  id: string;
  repoFullName: string;
  defaultBranch: string;
  stack: DetectedStack | null;
};
