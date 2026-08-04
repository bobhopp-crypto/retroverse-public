import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type IssueGenerationStatus = "pending" | "succeeded" | "skipped" | "failed" | "prototype";

export type IssueGenerationMonitorJob = {
  rvtr: string;
  title: string;
  artist: string;
  year: number | null;
  playCount: number;
  status: IssueGenerationStatus;
  origin: "checkpoint" | "prototype";
  reason?: string;
  /** V1 Factory review state, independent of generated artwork. */
  reviewState?: "pending-review" | "approved" | "rejected";
  frameSelection?: {
    candidateCount: number;
    selectedTimestamps: number[];
    selectedReasons: string[];
    rejected: Record<string, number>;
    contactSheetAvailable: boolean;
  };
  previewHref?: string;
  generatedOutput?: {
    available: boolean;
    operatorPreviewHref: string;
    generatedAt: string;
    promptId?: string;
    reviewState: "pending-review" | "approved" | "rejected";
    reviewReason?: string;
  };
  /** Retained for checkpoint compatibility; not exposed in Phase 1 UI. */
  generationVersions?: Array<{
    versionNumber: number;
    createdAt: string;
    prompt?: string;
    sourceFrameRefs: string[];
    contactSheetRef?: string;
    reviewState: "not-generated" | "pending-review" | "approved" | "rejected";
    reviewReason?: string;
    candidates?: Array<{
      id: string;
      candidateNumber: number;
      seed: number;
      reviewState: "not-generated" | "pending-review" | "approved" | "rejected";
    }>;
  }>;
  magazineHeroFrame?: {
    available: boolean;
    operatorPreviewHref: string;
    path: string;
    timestamp: number;
    sha256: string;
    reason: string;
    sourceVideoPath?: string;
    selectedAt: string;
  };
  updatedAt: string;
};

export type IssueGenerationMonitorData = {
  updatedAt: string | null;
  jobs: IssueGenerationMonitorJob[];
  counts: Record<IssueGenerationStatus, number>;
  lastLog: string | null;
  stateDirs: string[];
};

type StoredJob = Partial<IssueGenerationMonitorJob> & {
  previewPath?: string;
  reviewState?: "pending-review" | "approved" | "rejected";
  reviewReason?: string;
  magazineHeroFrame?: {
    path?: string;
    sourcePath?: string;
    timestamp?: number;
    sha256?: string;
    reason?: string;
    sourceVideoPath?: string;
    selectedAt?: string;
  };
  generationVersions?: Array<{
    versionNumber?: number;
    createdAt?: string;
    prompt?: string;
    sourceFrameRefs?: string[];
    contactSheetRef?: string;
    reviewState?: string;
    reviewReason?: string;
    candidates?: Array<{ id?: string; candidateNumber?: number; seed?: number; reviewState?: string }>;
  }>;
  frameSelection?: Partial<IssueGenerationMonitorJob["frameSelection"]> & { contactSheetPath?: string };
};

type StoredState = { updatedAt?: string; jobs?: Record<string, StoredJob> };

const EMPTY_COUNTS: Record<IssueGenerationStatus, number> = {
  pending: 0,
  succeeded: 0,
  skipped: 0,
  failed: 0,
  prototype: 0,
};

function safePreviewHref(value: unknown): string | undefined {
  return typeof value === "string" && /^\/issue\/[a-z0-9-]+$/.test(value) ? value : undefined;
}

function sanitizeCheckpointJob(job: StoredJob): IssueGenerationMonitorJob | null {
  if (!job.rvtr || !/^RVTR\d{6}$/i.test(job.rvtr)) return null;
  const status = ["pending", "succeeded", "skipped", "failed"].includes(String(job.status))
    ? (job.status as Exclude<IssueGenerationStatus, "prototype">)
    : "failed";
  const selection = job.frameSelection;
  const generatedPath =
    typeof job.previewPath === "string" &&
    /^retroverse\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp)$/i.test(job.previewPath)
      ? job.previewPath
      : null;
  const generatedOutput = generatedPath
    ? {
        available: true,
        operatorPreviewHref: `/api/ops/issue-generation/generated-output?rvtr=${job.rvtr.toUpperCase()}`,
        generatedAt: typeof job.updatedAt === "string" ? job.updatedAt : "",
        promptId:
          typeof job.reason === "string" && job.reason.includes(": ")
            ? job.reason.split(": ").slice(1).join(": ")
            : undefined,
        reviewState:
          job.reviewState === "approved" || job.reviewState === "rejected"
            ? job.reviewState
            : ("pending-review" as const),
        reviewReason: typeof job.reviewReason === "string" ? job.reviewReason : undefined,
      }
    : undefined;

  const magazineRecord = job.magazineHeroFrame;
  const magazinePath =
    typeof magazineRecord?.path === "string" && magazineRecord.path.length > 0 ? magazineRecord.path : null;
  const magazineHeroFrame =
    magazinePath && existsSync(magazinePath)
      ? {
          available: true,
          operatorPreviewHref: `/api/ops/issue-generation/hero-frame?rvtr=${job.rvtr!.toUpperCase()}`,
          path: magazinePath,
          timestamp: typeof magazineRecord?.timestamp === "number" ? magazineRecord.timestamp : 0,
          sha256: typeof magazineRecord?.sha256 === "string" ? magazineRecord.sha256 : "",
          reason: typeof magazineRecord?.reason === "string" ? magazineRecord.reason : "",
          sourceVideoPath:
            typeof magazineRecord?.sourceVideoPath === "string" ? magazineRecord.sourceVideoPath : undefined,
          selectedAt:
            typeof magazineRecord?.selectedAt === "string"
              ? magazineRecord.selectedAt
              : typeof job.updatedAt === "string"
                ? job.updatedAt
                : "",
        }
      : undefined;

  return {
    rvtr: job.rvtr.toUpperCase(),
    title: typeof job.title === "string" ? job.title : "",
    artist: typeof job.artist === "string" ? job.artist : "",
    year: typeof job.year === "number" ? job.year : null,
    playCount: typeof job.playCount === "number" ? job.playCount : 0,
    status,
    origin: "checkpoint",
    reviewState:
      job.reviewState === "approved" || job.reviewState === "rejected"
        ? job.reviewState
        : "pending-review",
    reason: typeof job.reason === "string" ? job.reason : undefined,
    frameSelection: selection
      ? {
          candidateCount: typeof selection.candidateCount === "number" ? selection.candidateCount : 0,
          selectedTimestamps: Array.isArray(selection.selectedTimestamps)
            ? selection.selectedTimestamps.filter((value): value is number => typeof value === "number")
            : [],
          selectedReasons: Array.isArray(selection.selectedReasons)
            ? selection.selectedReasons.filter((value): value is string => typeof value === "string")
            : [],
          rejected: selection.rejected && typeof selection.rejected === "object" ? selection.rejected : {},
          contactSheetAvailable:
            typeof selection.contactSheetPath === "string" && selection.contactSheetPath.length > 0,
        }
      : undefined,
    previewHref: safePreviewHref(job.previewHref),
    generatedOutput,
    magazineHeroFrame,
    updatedAt: typeof job.updatedAt === "string" ? job.updatedAt : "1970-01-01T00:00:00.000Z",
  };
}

/** Prefer env, then proof evidence dir, then default local checkpoint. */
export function resolveIssueStateDirs(): string[] {
  const home = homedir();
  const envDir = process.env.RETROVERSE_ISSUE_STATE_DIR?.trim();
  const proofDir = join(home, ".retroverse", "issue-generation-rv03-05-proof");
  const defaultDir = join(home, ".retroverse", "issue-generation");
  const dirs: string[] = [];
  if (envDir) dirs.push(envDir);
  if (existsSync(join(proofDir, "state.json")) && !dirs.includes(proofDir)) dirs.push(proofDir);
  if (!dirs.includes(defaultDir)) dirs.push(defaultDir);
  return dirs;
}

async function loadJobsFromDir(stateDir: string): Promise<{
  jobs: IssueGenerationMonitorJob[];
  updatedAt: string | null;
  lastLog: string | null;
}> {
  const statePath = join(stateDir, "state.json");
  const logPath = join(stateDir, "run.log");
  if (!existsSync(statePath)) return { jobs: [], updatedAt: null, lastLog: null };
  try {
    const state = JSON.parse(await readFile(statePath, "utf8")) as StoredState;
    const jobs = Object.values(state.jobs ?? {})
      .map(sanitizeCheckpointJob)
      .filter((job): job is IssueGenerationMonitorJob => Boolean(job));
    const file = await stat(statePath);
    const log = existsSync(logPath)
      ? ((await readFile(logPath, "utf8")).trim().split("\n").slice(-1)[0] ?? null)
      : null;
    return { jobs, updatedAt: state.updatedAt ?? file.mtime.toISOString(), lastLog: log };
  } catch {
    return { jobs: [], updatedAt: null, lastLog: null };
  }
}

async function loadPilotFrameEvidence(
  byRvtr: Map<string, IssueGenerationMonitorJob>,
): Promise<void> {
  const pilotState = join(homedir(), ".retroverse", "issue-generation-ollama-overnight-2026-08-01", "state.json");
  if (!existsSync(pilotState)) return;
  try {
    const state = JSON.parse(await readFile(pilotState, "utf8")) as {
      jobs?: Record<
        string,
        {
          rvtr?: string;
          title?: string;
          artist?: string;
          year?: number | null;
          playCount?: number;
          status?: string;
          contactSheetPath?: string;
          timestamps?: number[];
          updatedAt?: string;
        }
      >;
    };
    for (const job of Object.values(state.jobs ?? {})) {
      const rvtr = job.rvtr?.toUpperCase();
      if (!rvtr || !/^RVTR\d{6}$/.test(rvtr) || job.status !== "prepared") continue;
      if (byRvtr.has(rvtr)) {
        const existing = byRvtr.get(rvtr)!;
        if (!existing.frameSelection?.contactSheetAvailable && job.contactSheetPath) {
          byRvtr.set(rvtr, {
            ...existing,
            frameSelection: {
              candidateCount: job.timestamps?.length ?? 4,
              selectedTimestamps: Array.isArray(job.timestamps) ? job.timestamps : [],
              selectedReasons: [],
              rejected: {},
              contactSheetAvailable: true,
            },
          });
        }
        continue;
      }
      const sheetOk = typeof job.contactSheetPath === "string" && existsSync(job.contactSheetPath);
      if (!sheetOk) continue;
      byRvtr.set(rvtr, {
        rvtr,
        title: typeof job.title === "string" ? job.title : "",
        artist: typeof job.artist === "string" ? job.artist : "",
        year: typeof job.year === "number" ? job.year : null,
        playCount: typeof job.playCount === "number" ? job.playCount : 0,
        status: "succeeded",
        origin: "checkpoint",
        reason: "Ollama overnight pilot · frames and prompt prepared (no artwork)",
        frameSelection: {
          candidateCount: job.timestamps?.length ?? 4,
          selectedTimestamps: Array.isArray(job.timestamps) ? job.timestamps : [],
          selectedReasons: [],
          rejected: {},
          contactSheetAvailable: true,
        },
        updatedAt: typeof job.updatedAt === "string" ? job.updatedAt : "1970-01-01T00:00:00.000Z",
      });
    }
  } catch {
    /* pilot evidence is optional */
  }
}

export async function loadIssueGenerationMonitor(): Promise<IssueGenerationMonitorData> {
  const { ensureMagazineHeroFrame, MAGAZINE_BENCHMARK_RVTR } = await import(
    "@/lib/ops/issue-generation/magazine-hero-frame"
  );
  await ensureMagazineHeroFrame(MAGAZINE_BENCHMARK_RVTR);

  const stateDirs = resolveIssueStateDirs();
  const byRvtr = new Map<string, IssueGenerationMonitorJob>();
  let updatedAt: string | null = null;
  let lastLog: string | null = null;

  for (const dir of stateDirs) {
    const loaded = await loadJobsFromDir(dir);
    if (!updatedAt && loaded.updatedAt) updatedAt = loaded.updatedAt;
    if (!lastLog && loaded.lastLog) lastLog = loaded.lastLog;
    for (const job of loaded.jobs) {
      const existing = byRvtr.get(job.rvtr);
      if (!existing) {
        byRvtr.set(job.rvtr, job);
        continue;
      }
      // V1 Factory prioritizes an explicit selected real frame over generated output.
      const existingScore =
        (existing.magazineHeroFrame?.available ? 2 : 0) + (existing.frameSelection?.contactSheetAvailable ? 1 : 0);
      const nextScore =
        (job.magazineHeroFrame?.available ? 2 : 0) + (job.frameSelection?.contactSheetAvailable ? 1 : 0);
      if (nextScore > existingScore || Date.parse(job.updatedAt) > Date.parse(existing.updatedAt)) {
        byRvtr.set(job.rvtr, job);
      }
    }
  }

  const jobs = [...byRvtr.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const counts = { ...EMPTY_COUNTS };
  for (const job of jobs) counts[job.status]++;
  return { updatedAt, jobs, counts, lastLog, stateDirs };
}
