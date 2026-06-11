import { spawnContentCreatorJobRunner } from "./spawn-runner";
import { createJob } from "./store";
import type { ContentCreatorJob, ContentCreatorJobType } from "./types";

export async function enqueueContentCreatorJob(args: {
  type: ContentCreatorJobType;
  title: string;
  payload: Record<string, unknown>;
}): Promise<ContentCreatorJob> {
  const job = await createJob({
    type: args.type,
    title: args.title,
    payload: args.payload,
  });
  spawnContentCreatorJobRunner();
  return job;
}
