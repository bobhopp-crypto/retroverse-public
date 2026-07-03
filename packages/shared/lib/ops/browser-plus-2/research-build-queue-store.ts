import "server-only";

import { readFile } from "fs/promises";

import type { BrowserPlusExecutionJob } from "@/lib/ops/browser-plus/execution-runner";
import { retroverseDataRoot } from "@/lib/retroverse-data-root";
import { join } from "path";

type JobStoreFile = {
  jobs?: BrowserPlusExecutionJob[];
};

export async function listBrowserPlusExecutionJobs(): Promise<BrowserPlusExecutionJob[]> {
  try {
    const raw = await readFile(join(retroverseDataRoot(), "ops", "browser-plus", "execution-jobs.json"), "utf8");
    const parsed = JSON.parse(raw) as JobStoreFile;
    return Array.isArray(parsed.jobs) ? parsed.jobs : [];
  } catch {
    return [];
  }
}
