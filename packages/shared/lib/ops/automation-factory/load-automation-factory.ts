import "server-only";

import { execFile } from "child_process";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { promisify } from "util";

import { bundledDeckIndexPath, intelligenceRoot, songPackagesDir } from "@/lib/ops/intelligence/paths";

const execFileAsync = promisify(execFile);

const QUEUE_PATH = join(intelligenceRoot(), "video-work-queue.json");
const LOOP_LOG_PATH = join(process.cwd(), "reports", "intelligence", "video-factory-loop.log");
const MAX_TABLE_ROWS = 24;

type QueueState = {
  matched: boolean;
  package: boolean;
  deck: boolean;
  cover: boolean;
  thumbnail: boolean;
};

export type VideoFactoryQueueItem = {
  rvtr: string;
  title: string;
  artist: string;
  videoFiles: string[];
  state: QueueState;
  nextWorker: string;
  updatedAt: string;
};

type VideoFactoryQueue = {
  version: 1;
  scope: "VIDEO";
  updatedAt: string;
  counts?: Partial<{
    complete: number;
    missingPackage: number;
    missingDeck: number;
    missingCover: number;
    missingThumbnail: number;
    unmatchedVideoRows: number;
    matchableUnmatchedVideoRows: number;
    uniqueVideoRvtrs: number;
    videoRows: number;
  }>;
  unmatchedVideoRows?: Array<{
    title: string;
    artist: string;
    filePath: string;
    updatedAt: string;
  }>;
  items: VideoFactoryQueueItem[];
};

export type AutomationFactorySummaryMetric = {
  label: string;
  value: number;
  tone: "running" | "waiting" | "blocked" | "disabled";
};

export type AutomationFactoryStatus = {
  running: boolean;
  pid: number | null;
  started: string | null;
  currentWorker: string | null;
  currentRvtr: string | null;
  artist: string | null;
  title: string | null;
  lastActivityAt: string | null;
  reason: string;
};

export type AutomationFactoryThroughput = {
  packagesCompletedToday: number;
  decksPromotedToday: number;
  coversRecoveredToday: number;
  thumbnailsGeneratedToday: number;
  queueReductionToday: number;
};

export type AutomationFactoryBottlenecks = {
  deckPromotionFailures: number;
  coverRecoveryFailures: number;
  thumbnailBacklog: number;
  identityBacklog: number;
};

export type AutomationFactoryActivity = {
  time: string | null;
  worker: string;
  rvtr: string | null;
  artist: string | null;
  title: string | null;
  event: string;
  detail: string;
};

export type AutomationFactoryBacklog = {
  missingPackages: VideoFactoryQueueItem[];
  missingDecks: VideoFactoryQueueItem[];
  missingCovers: VideoFactoryQueueItem[];
  missingThumbnails: VideoFactoryQueueItem[];
};

export type AutomationFactoryDiagnostics = {
  queuePath: string;
  queueLastUpdated: string | null;
  factoryLoopStatus: "running" | "not_running";
  currentLogFile: string;
  logAvailable: boolean;
  packageFolderCount: number;
  deckIndexCount: number;
};

export type AutomationFactoryModel = {
  generatedAt: string;
  summary: AutomationFactorySummaryMetric[];
  status: AutomationFactoryStatus;
  throughput: AutomationFactoryThroughput;
  bottlenecks: AutomationFactoryBottlenecks;
  backlog: AutomationFactoryBacklog;
  activity: AutomationFactoryActivity[];
  diagnostics: AutomationFactoryDiagnostics;
};

function numberFrom(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringFrom(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function songLabel(item: { artist?: string | null; title?: string | null; rvtr?: string | null }): string {
  const artist = item.artist?.trim();
  const title = item.title?.trim();
  if (artist && title) return `${artist} — ${title}`;
  return title || artist || item.rvtr || "Unknown";
}

function startOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function parseDate(value: string | null): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

async function readQueue(): Promise<VideoFactoryQueue> {
  const raw = await readFile(QUEUE_PATH, "utf8");
  const parsed = JSON.parse(raw) as VideoFactoryQueue;
  return {
    ...parsed,
    items: Array.isArray(parsed.items) ? parsed.items : [],
    unmatchedVideoRows: Array.isArray(parsed.unmatchedVideoRows) ? parsed.unmatchedVideoRows : [],
  };
}

async function readLoopLog(): Promise<string> {
  try {
    return await readFile(LOOP_LOG_PATH, "utf8");
  } catch {
    return "";
  }
}

async function packageFolderCount(): Promise<number> {
  try {
    const files = await readdir(songPackagesDir());
    return files.filter((file) => /^RVTR\d{6}\.json$/i.test(file)).length;
  } catch {
    return 0;
  }
}

async function deckIndexCount(): Promise<number> {
  try {
    const raw = JSON.parse(await readFile(bundledDeckIndexPath(), "utf8")) as { decks?: unknown };
    return Array.isArray(raw.decks) ? raw.decks.length : 0;
  } catch {
    return 0;
  }
}

async function activeLoopStatus(): Promise<Pick<AutomationFactoryStatus, "running" | "pid" | "started" | "reason">> {
  try {
    const { stdout } = await execFileAsync("ps", ["-axo", "pid,lstart,command"], { maxBuffer: 1024 * 1024 });
    const line = stdout
      .split(/\r?\n/)
      .find((entry) => /video-factory:(loop)|video-factory\.ts loop|tools\/intelligence\/video-factory\.ts loop/.test(entry));
    if (!line) {
      return { running: false, pid: null, started: null, reason: "No active video-factory:loop process found." };
    }
    const match = line.match(/^\s*(\d+)\s+(\w+\s+\w+\s+\d+\s+\d+:\d+:\d+\s+\d+)/);
    return {
      running: true,
      pid: match ? Number(match[1]) : null,
      started: match?.[2] ?? null,
      reason: "video-factory:loop process is active.",
    };
  } catch (err) {
    return {
      running: false,
      pid: null,
      started: null,
      reason: err instanceof Error ? err.message : "Unable to inspect process table.",
    };
  }
}

function latestCurrentWork(log: string): Pick<
  AutomationFactoryStatus,
  "currentWorker" | "currentRvtr" | "artist" | "title" | "lastActivityAt"
> {
  const lines = log.split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    const pkg = line.match(/Package worker:\s+(RVTR\d{6})\s+·\s+(.+?)\s+—\s+(.+)$/);
    if (pkg) {
      return {
        currentWorker: "package-worker",
        currentRvtr: pkg[1] ?? null,
        artist: pkg[2] ?? null,
        title: pkg[3] ?? null,
        lastActivityAt: null,
      };
    }
    if (line.includes("cover-recovery:")) {
      return { currentWorker: "cover-recovery", currentRvtr: null, artist: null, title: null, lastActivityAt: null };
    }
    if (line.includes("deck-worker:")) {
      return { currentWorker: "deck-worker", currentRvtr: null, artist: null, title: null, lastActivityAt: null };
    }
  }
  return { currentWorker: null, currentRvtr: null, artist: null, title: null, lastActivityAt: null };
}

function parseActivity(log: string): AutomationFactoryActivity[] {
  const lines = log.split(/\r?\n/).filter(Boolean);
  const out: AutomationFactoryActivity[] = [];
  for (const line of lines.slice(-240)) {
    const pkgStart = line.match(/Package worker:\s+(RVTR\d{6})\s+·\s+(.+?)\s+—\s+(.+)$/);
    if (pkgStart) {
      out.push({
        time: null,
        worker: "package-worker",
        rvtr: pkgStart[1] ?? null,
        artist: pkgStart[2] ?? null,
        title: pkgStart[3] ?? null,
        event: "started",
        detail: line,
      });
      continue;
    }
    const pkgDone = line.match(/package-worker:\s+(.*)$/);
    if (pkgDone) {
      out.push({
        time: null,
        worker: "package-worker",
        rvtr: null,
        artist: null,
        title: null,
        event: "completed",
        detail: pkgDone[1] ?? line,
      });
      continue;
    }
    const cover = line.match(/cover-recovery:\s+(.*)$/);
    if (cover) {
      out.push({
        time: null,
        worker: "cover-recovery",
        rvtr: null,
        artist: null,
        title: null,
        event: "completed",
        detail: cover[1] ?? line,
      });
      continue;
    }
    const deck = line.match(/deck-worker:\s+(.*)$/);
    if (deck) {
      out.push({
        time: null,
        worker: "deck-worker",
        rvtr: null,
        artist: null,
        title: null,
        event: "completed",
        detail: deck[1] ?? line,
      });
    }
  }
  return out.reverse().slice(0, 24);
}

function throughputFromLog(log: string): AutomationFactoryThroughput {
  const since = startOfToday();
  let packagesCompletedToday = 0;
  let decksPromotedToday = 0;
  let coversRecoveredToday = 0;
  let thumbnailsGeneratedToday = 0;
  let queueReductionToday = 0;

  for (const line of log.split(/\r?\n/)) {
    const packageLine = line.match(/package-worker:.*Missing package before=(\d+), after=(\d+)/);
    if (packageLine) {
      const before = Number(packageLine[1]);
      const after = Number(packageLine[2]);
      const delta = Math.max(0, before - after);
      packagesCompletedToday += delta;
      queueReductionToday += delta;
    }
    const deckLine = line.match(/deck-worker:.*promoted=(\d+).*Missing deck before=(\d+), after=(\d+)/);
    if (deckLine) {
      const promoted = Number(deckLine[1]);
      const before = Number(deckLine[2]);
      const after = Number(deckLine[3]);
      decksPromotedToday += promoted;
      queueReductionToday += Math.max(0, before - after);
    }
    const coverLine = line.match(/cover-recovery:.*recovered=(\d+)/);
    if (coverLine) {
      coversRecoveredToday += Number(coverLine[1]);
      queueReductionToday += Number(coverLine[1]);
    }
    const thumbLine = line.match(/thumbnail.*generated=(\d+)/i);
    if (thumbLine) {
      thumbnailsGeneratedToday += Number(thumbLine[1]);
      queueReductionToday += Number(thumbLine[1]);
    }
  }

  void since;
  return { packagesCompletedToday, decksPromotedToday, coversRecoveredToday, thumbnailsGeneratedToday, queueReductionToday };
}

function backlogItem(item: VideoFactoryQueueItem): VideoFactoryQueueItem {
  return item;
}

export async function loadAutomationFactoryModel(): Promise<AutomationFactoryModel> {
  const [queue, log, processStatus, packageCount, deckCount, logStat] = await Promise.all([
    readQueue(),
    readLoopLog(),
    activeLoopStatus(),
    packageFolderCount(),
    deckIndexCount(),
    stat(LOOP_LOG_PATH).catch(() => null),
  ]);
  const items = queue.items;
  const complete =
    numberFrom(queue.counts?.complete) ??
    items.filter((item) => item.state.package && item.state.deck && item.state.cover && item.state.thumbnail).length;
  const totalVideoRvtrs = numberFrom(queue.counts?.uniqueVideoRvtrs) ?? items.length;
  const missingPackage = numberFrom(queue.counts?.missingPackage) ?? items.filter((item) => !item.state.package).length;
  const missingDeck =
    numberFrom(queue.counts?.missingDeck) ?? items.filter((item) => item.state.package && !item.state.deck).length;
  const missingCover = numberFrom(queue.counts?.missingCover) ?? items.filter((item) => !item.state.cover).length;
  const missingThumbnail =
    numberFrom(queue.counts?.missingThumbnail) ?? items.filter((item) => !item.state.thumbnail).length;
  const unmatchedVideoRows = numberFrom(queue.counts?.unmatchedVideoRows) ?? queue.unmatchedVideoRows?.length ?? 0;
  const matchableUnmatched = numberFrom(queue.counts?.matchableUnmatchedVideoRows) ?? 0;
  const currentWork = latestCurrentWork(log);

  return {
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Total VIDEO RVTRs", value: totalVideoRvtrs, tone: "running" },
      { label: "Complete", value: complete, tone: "running" },
      { label: "Missing Package", value: missingPackage, tone: "waiting" },
      { label: "Missing Deck", value: missingDeck, tone: "waiting" },
      { label: "Missing Cover", value: missingCover, tone: missingCover > 0 ? "blocked" : "running" },
      { label: "Missing Thumbnail", value: missingThumbnail, tone: missingThumbnail > 0 ? "blocked" : "running" },
      { label: "Unmatched VIDEO Rows", value: unmatchedVideoRows, tone: unmatchedVideoRows > 0 ? "disabled" : "running" },
    ],
    status: {
      ...processStatus,
      ...currentWork,
      lastActivityAt: currentWork.lastActivityAt ?? queue.updatedAt,
    },
    throughput: throughputFromLog(log),
    bottlenecks: {
      deckPromotionFailures: missingDeck,
      coverRecoveryFailures: missingCover,
      thumbnailBacklog: missingThumbnail,
      identityBacklog: matchableUnmatched || unmatchedVideoRows,
    },
    backlog: {
      missingPackages: items.filter((item) => item.state.matched && !item.state.package).slice(0, MAX_TABLE_ROWS).map(backlogItem),
      missingDecks: items.filter((item) => item.state.matched && item.state.package && !item.state.deck).slice(0, MAX_TABLE_ROWS).map(backlogItem),
      missingCovers: items.filter((item) => !item.state.cover).slice(0, MAX_TABLE_ROWS).map(backlogItem),
      missingThumbnails: items.filter((item) => !item.state.thumbnail).slice(0, MAX_TABLE_ROWS).map(backlogItem),
    },
    activity: parseActivity(log),
    diagnostics: {
      queuePath: QUEUE_PATH,
      queueLastUpdated: stringFrom(queue.updatedAt),
      factoryLoopStatus: processStatus.running ? "running" : "not_running",
      currentLogFile: LOOP_LOG_PATH,
      logAvailable: Boolean(logStat),
      packageFolderCount: packageCount,
      deckIndexCount: deckCount,
    },
  };
}
