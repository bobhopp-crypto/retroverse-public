import { access, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import { listMediaLabJobs } from "./list-jobs";
import { jobOutputDir } from "./paths";

export type CutterActiveJob = {
  year: number;
  jobSlug: string;
};

export type CutterWorkspacePreference = {
  version: 1;
  activeJob: CutterActiveJob | null;
  detailWindowDurationSec: 10 | 30 | 60 | 300;
  selectedClipId: string | null;
  sourcePlayheadSec: number | null;
  updatedAt: string;
};

export type CutterJobOption = CutterActiveJob & {
  sourceFilename: string;
  durationSeconds: number | null;
  hasTranscript: boolean;
  activityAt: string;
};

const DEFAULT_DETAIL_WINDOW = 60 as const;
const DEFAULT_MEDIA_LAB_YEARS = [1967, 1969, 1978, 1992] as const;

export function cutterWorkspacePreferencePath(
  stateRoot = opsStateDir(),
): string {
  return join(stateRoot, "media-lab", "cutter-workspace.json");
}

export function emptyCutterWorkspacePreference(
  now = new Date().toISOString(),
): CutterWorkspacePreference {
  return {
    version: 1,
    activeJob: null,
    detailWindowDurationSec: DEFAULT_DETAIL_WINDOW,
    selectedClipId: null,
    sourcePlayheadSec: null,
    updatedAt: now,
  };
}

function validActiveJob(value: unknown): value is CutterActiveJob {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CutterActiveJob>;
  return (
    Number.isInteger(candidate.year) &&
    Number(candidate.year) >= 1900 &&
    Number(candidate.year) < 2100 &&
    typeof candidate.jobSlug === "string" &&
    /^[a-z0-9-]+$/i.test(candidate.jobSlug)
  );
}

export function normalizeCutterWorkspacePreference(
  value: unknown,
  now = new Date().toISOString(),
): CutterWorkspacePreference {
  if (!value || typeof value !== "object") return emptyCutterWorkspacePreference(now);
  const candidate = value as Partial<CutterWorkspacePreference>;
  const detailWindowDurationSec = [10, 30, 60, 300].includes(
    Number(candidate.detailWindowDurationSec),
  )
    ? (Number(candidate.detailWindowDurationSec) as 10 | 30 | 60 | 300)
    : DEFAULT_DETAIL_WINDOW;
  return {
    version: 1,
    activeJob: validActiveJob(candidate.activeJob) ? candidate.activeJob : null,
    detailWindowDurationSec,
    selectedClipId:
      typeof candidate.selectedClipId === "string" && candidate.selectedClipId
        ? candidate.selectedClipId
        : null,
    sourcePlayheadSec:
      Number.isFinite(candidate.sourcePlayheadSec) && Number(candidate.sourcePlayheadSec) >= 0
        ? Number(candidate.sourcePlayheadSec)
        : null,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
  };
}

export async function readCutterWorkspacePreference(
  stateRoot = opsStateDir(),
): Promise<CutterWorkspacePreference> {
  try {
    return normalizeCutterWorkspacePreference(
      JSON.parse(await readFile(cutterWorkspacePreferencePath(stateRoot), "utf8")),
    );
  } catch {
    return emptyCutterWorkspacePreference();
  }
}

export async function writeCutterWorkspacePreference(
  preference: CutterWorkspacePreference,
  stateRoot = opsStateDir(),
): Promise<void> {
  const path = cutterWorkspacePreferencePath(stateRoot);
  const directory = dirname(path);
  await mkdir(directory, { recursive: true });
  const temporary = join(
    directory,
    `.${basename(path)}.${process.pid}.${Date.now()}.tmp`,
  );
  await writeFile(temporary, `${JSON.stringify(preference, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function jobActivityAt(year: number, jobSlug: string, createdAt: string): Promise<string> {
  const directory = jobOutputDir(year, jobSlug);
  const candidates = [
    "clip-extractions.json",
    "editorial-segments.json",
    "chapter-map.json",
    "job.json",
  ];
  let activityMs = Date.parse(createdAt) || 0;
  for (const name of candidates) {
    try {
      activityMs = Math.max(activityMs, (await stat(join(directory, name))).mtimeMs);
    } catch {
      // Optional activity sources are allowed to be absent.
    }
  }
  return new Date(activityMs || 0).toISOString();
}

export async function listCutterJobOptions(
  years: readonly number[] = DEFAULT_MEDIA_LAB_YEARS,
): Promise<CutterJobOption[]> {
  const groups = await Promise.all(
    years.map(async (year) => {
      const jobs = await listMediaLabJobs(year);
      return Promise.all(
        jobs.map(async (job) => ({
          year,
          jobSlug: job.jobSlug,
          sourceFilename: job.sourceFilename,
          durationSeconds: job.durationSeconds,
          hasTranscript: job.hasSegments || job.hasTranscript,
          activityAt: await jobActivityAt(year, job.jobSlug, job.createdAt),
        })),
      );
    }),
  );
  return groups
    .flat()
    .sort(
      (left, right) =>
        right.activityAt.localeCompare(left.activityAt) ||
        right.year - left.year ||
        left.jobSlug.localeCompare(right.jobSlug),
    );
}

export async function resolveActiveCutterJob(
  preference: CutterWorkspacePreference,
  jobs: CutterJobOption[],
): Promise<CutterActiveJob | null> {
  if (preference.activeJob) {
    const directory = jobOutputDir(
      preference.activeJob.year,
      preference.activeJob.jobSlug,
    );
    if (
      jobs.some(
        (job) =>
          job.year === preference.activeJob?.year &&
          job.jobSlug === preference.activeJob.jobSlug,
      ) &&
      (await exists(join(directory, "job.json")))
    ) {
      return preference.activeJob;
    }
  }
  return jobs[0] ? { year: jobs[0].year, jobSlug: jobs[0].jobSlug } : null;
}
