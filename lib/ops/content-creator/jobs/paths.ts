import { join } from "path";

import { contentCreatorRoot } from "@/lib/ops/content-creator/library/paths";

export function contentCreatorJobsDir(): string {
  return join(contentCreatorRoot(), "jobs");
}

export function contentCreatorJobPath(jobId: string): string {
  return join(contentCreatorJobsDir(), `${jobId}.json`);
}

export function contentCreatorJobIndexPath(): string {
  return join(contentCreatorJobsDir(), "index.json");
}

export function contentCreatorJobRunnerLockPath(): string {
  return join(contentCreatorJobsDir(), "runner.lock");
}
