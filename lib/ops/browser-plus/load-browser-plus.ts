import "server-only";

import { execFile } from "child_process";
import { existsSync } from "fs";
import { readFile, readdir, stat } from "fs/promises";
import { basename, dirname, extname, join } from "path";
import { promisify } from "util";

import { isOpsPlayableVideoPath } from "@/lib/ops/ops-video-media";
import { normVdjPath, vdjDatabasePath } from "@/lib/ops/intelligence/vdj-database";
import { backfillQueuePath, songPackagesDir } from "@/lib/ops/intelligence/paths";

import type {
  BrowserPlusColumn,
  BrowserPlusFolderNode,
  BrowserPlusModel,
  BrowserPlusRow,
  BrowserPlusStats,
  BrowserPlusWorkStatus,
} from "./types";

const execFileAsync = promisify(execFile);
const RVTR_RE = /RVTR\d{6}/i;
const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".wav", ".aiff", ".aif", ".flac", ".aac", ".ogg"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".m4v", ".mov", ".avi", ".mkv", ".mpg", ".mpeg", ".vob", ".wmv"]);
const THUMBNAIL_EXPORT_ROOT = "/Users/bobhopp/Sites/retroverse-data/exports/thumbnails";

type PackageSummary = {
  rvtr: string;
  status: string;
  title: string | null;
  artist: string | null;
  coverUrl: string | null;
  updatedAt: string | null;
  processedAt: string | null;
  publishedAt: string | null;
};

type CacheEntry = {
  path: string;
  mtimeMs: number;
  size: number;
  model: BrowserPlusModel;
};

type BrowserPlusQueueStats = {
  packageCandidates: number;
  coverFirst: number;
};

let cache: CacheEntry | null = null;

export function clearBrowserPlusModelCache() {
  cache = null;
}

export const BROWSER_PLUS_COLUMNS: BrowserPlusColumn[] = [
  { id: "icon", label: "", width: 34, minWidth: 30, sortable: false, source: "vdj", align: "center", modes: ["library", "retroverse", "work"] },
  { id: "artist", label: "Artist", width: 190, minWidth: 120, sortable: true, source: "vdj", modes: ["library", "retroverse", "work"] },
  { id: "title", label: "Title", width: 230, minWidth: 140, sortable: true, source: "vdj", modes: ["library", "retroverse", "work"] },
  { id: "genre", label: "Genre", width: 105, minWidth: 80, sortable: true, source: "vdj", modes: ["library"] },
  { id: "year", label: "Year", width: 72, minWidth: 58, sortable: true, source: "vdj", align: "right", modes: ["library"] },
  { id: "playCount", label: "Plays", width: 72, minWidth: 58, sortable: true, source: "vdj", align: "right", modes: ["library", "work"] },
  { id: "label", label: "Label", width: 140, minWidth: 90, sortable: true, source: "vdj", modes: ["library", "retroverse"] },
  { id: "grouping", label: "Grouping", width: 140, minWidth: 100, sortable: true, source: "vdj", modes: ["library"] },
  { id: "rvTags", label: "RV Tags", width: 150, minWidth: 100, sortable: true, source: "vdj", modes: ["library", "work"] },
  { id: "rvtr", label: "RVTR", width: 112, minWidth: 92, sortable: true, source: "retroverse", modes: ["library", "retroverse", "work"] },
  { id: "packageStatus", label: "Package", width: 118, minWidth: 92, sortable: true, source: "retroverse", modes: ["library", "retroverse"] },
  { id: "deckStatus", label: "Deck", width: 110, minWidth: 88, sortable: true, source: "retroverse", modes: ["library", "retroverse"] },
  { id: "coverStatus", label: "Cover", width: 108, minWidth: 84, sortable: true, source: "derived", modes: ["library", "retroverse", "work"] },
  { id: "thumbnailStatus", label: "Thumbnail", width: 116, minWidth: 92, sortable: true, source: "derived", modes: ["library", "work"] },
  { id: "thumbnailSource", label: "Thumb Source", width: 126, minWidth: 100, sortable: true, source: "derived", modes: ["library"] },
  { id: "workStatus", label: "Work Status", width: 150, minWidth: 120, sortable: true, source: "derived", modes: ["library", "retroverse", "work"] },
  { id: "album", label: "Album", width: 180, minWidth: 120, sortable: true, source: "vdj", modes: [] },
  { id: "bpm", label: "BPM", width: 74, minWidth: 58, sortable: true, source: "vdj", align: "right", modes: [] },
  { id: "key", label: "Key", width: 70, minWidth: 54, sortable: true, source: "vdj", modes: [] },
  { id: "length", label: "Length", width: 82, minWidth: 68, sortable: true, source: "vdj", align: "right", modes: [] },
  { id: "firstSeen", label: "First Seen", width: 116, minWidth: 96, sortable: true, source: "vdj", modes: [] },
  { id: "lastPlay", label: "Last Play", width: 116, minWidth: 96, sortable: true, source: "vdj", modes: [] },
  { id: "user1", label: "User1", width: 130, minWidth: 90, sortable: true, source: "vdj", modes: [] },
  { id: "user2", label: "User2", width: 150, minWidth: 90, sortable: true, source: "vdj", modes: [] },
  { id: "filePath", label: "File Path", width: 280, minWidth: 180, sortable: true, source: "vdj", modes: [] },
  { id: "thumbnailPath", label: "Thumbnail Path", width: 280, minWidth: 180, sortable: true, source: "derived", modes: [] },
  { id: "matchMethod", label: "Match Method", width: 118, minWidth: 96, sortable: true, source: "derived", modes: ["retroverse", "work"] },
  { id: "coverageScore", label: "Coverage", width: 96, minWidth: 74, sortable: true, source: "derived", align: "right", modes: ["retroverse", "work"] },
  { id: "canonicalArtist", label: "Canonical Artist", width: 170, minWidth: 120, sortable: true, source: "retroverse", modes: ["retroverse"] },
  { id: "canonicalTrack", label: "Canonical Track", width: 190, minWidth: 130, sortable: true, source: "retroverse", modes: ["retroverse"] },
  { id: "lastGenerated", label: "Last Generated", width: 128, minWidth: 104, sortable: true, source: "retroverse", modes: [] },
  { id: "lastPublished", label: "Last Published", width: 128, minWidth: 104, sortable: true, source: "retroverse", modes: [] },
  { id: "coverageFlags", label: "Coverage Flags", width: 170, minWidth: 120, sortable: true, source: "derived", modes: [] },
  { id: "poiCount", label: "POI", width: 64, minWidth: 52, sortable: true, source: "vdj", align: "right", modes: [] },
  { id: "linkState", label: "Links", width: 72, minWidth: 58, sortable: true, source: "vdj", align: "right", modes: [] },
];

function decodeXmlAttr(value: string): string {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readAttr(block: string, name: string): string {
  const re = new RegExp(`\\s${name}="([^"]*)"`);
  const match = block.match(re);
  return match?.[1] ? decodeXmlAttr(match[1]) : "";
}

function numberAttr(block: string, name: string): number | null {
  const raw = readAttr(block, name);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseVdjDate(raw: string): string | null {
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

function displayBpm(tagsAttrs: string, scanAttrs: string): number | null {
  const tagBpm = numberAttr(tagsAttrs, "Bpm");
  if (tagBpm && tagBpm > 1) return Math.round(tagBpm);
  const scanBpm = numberAttr(scanAttrs, "Bpm");
  if (scanBpm && scanBpm > 0) return Math.round(60 / scanBpm);
  return null;
}

function mediaKind(filePath: string): BrowserPlusRow["mediaKind"] {
  if (filePath.startsWith("netsearch://")) return "netsearch";
  const extension = extname(filePath.split("?")[0] ?? "").toLowerCase();
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  if (AUDIO_EXTENSIONS.has(extension)) return "audio";
  return "other";
}

function thumbnailUrl(path: string): string {
  return `/api/ops/browser-plus/thumbnail?path=${encodeURIComponent(path)}`;
}

function withoutExtension(filePath: string): string {
  const ext = extname(filePath);
  return ext ? filePath.slice(0, -ext.length) : filePath;
}

function isVideoVaultPath(filePath: string): boolean {
  return /\/VIDEO VAULT\//i.test(filePath) && VIDEO_EXTENSIONS.has(extname(filePath).toLowerCase());
}

function findSidecarThumbnail(filePath: string): string | null {
  const base = withoutExtension(filePath);
  const candidates = [
    `${base}.jpg`,
    `${filePath}.jpg`,
    `${base}.jpeg`,
    `${filePath}.jpeg`,
    `${base}.png`,
    `${filePath}.png`,
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function generatedThumbnailPath(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const videoIndex = parts.findIndex((part) => part.toUpperCase() === "VIDEO");
  if (videoIndex < 0 || !parts[videoIndex + 1]) return null;
  return join(THUMBNAIL_EXPORT_ROOT, parts[videoIndex + 1], `${basename(withoutExtension(filePath))}.jpg`);
}

function detectThumbnail(filePath: string, isVideo: boolean, fileExists: boolean): Pick<
  BrowserPlusRow,
  "thumbnailStatus" | "thumbnailPath" | "thumbnailUrl" | "thumbnailSource"
> {
  if (!isVideo) {
    return {
      thumbnailStatus: "Missing",
      thumbnailPath: null,
      thumbnailUrl: null,
      thumbnailSource: "Missing",
    };
  }
  if (!fileExists) {
    return {
      thumbnailStatus: "Video Missing",
      thumbnailPath: null,
      thumbnailUrl: null,
      thumbnailSource: "Missing",
    };
  }

  const hit = findSidecarThumbnail(filePath);
  if (!hit) {
    return {
      thumbnailStatus: "Missing",
      thumbnailPath: null,
      thumbnailUrl: null,
      thumbnailSource: "Missing",
    };
  }

  return {
    thumbnailStatus: "Present",
    thumbnailPath: hit,
    thumbnailUrl: thumbnailUrl(hit),
    thumbnailSource: hit.endsWith(".png") ? "Sidecar PNG" : hit.startsWith(`${filePath}.`) ? "Sidecar EXT.JPG" : "Sidecar JPG",
  };
}

function folderParts(filePath: string): string[] {
  if (filePath.startsWith("netsearch://")) return ["NetSearch"];
  const parts = filePath.replace(/\\/g, "/").split("/").filter(Boolean);
  const djMediaIndex = parts.findIndex((part) => part.toUpperCase() === "DJ MEDIA");
  if (djMediaIndex >= 0) {
    const scoped = parts.slice(djMediaIndex + 1, -1);
    return scoped.length > 0 ? scoped : ["DJ MEDIA"];
  }
  return ["External/System", ...parts.slice(-3, -1)];
}

function rvtrFromLabel(label: string): string | null {
  const match = label.match(RVTR_RE);
  return match?.[0]?.toUpperCase() ?? null;
}

function prettyStatus(status: string | null | undefined): string {
  if (!status) return "Missing Package";
  const labels: Record<string, string> = {
    draft: "Draft",
    processing: "Processing",
    review: "Needs Review",
    cards_ready: "Cards Ready",
    approved: "Ready To Publish",
    published: "Published",
  };
  return labels[status] ?? status;
}

function coverageScore(rvtr: string | null, hasCover: boolean, pkg: PackageSummary | null, deckReady: boolean): 0 | 1 | 2 | 3 | 4 | 5 {
  if (!rvtr) return 0;
  if (pkg?.status === "published") return 5;
  if (deckReady) return 4;
  if (pkg) return 3;
  if (hasCover) return 2;
  return 1;
}

function workStatus(rvtr: string | null, hasCover: boolean, pkg: PackageSummary | null, deckReady: boolean): {
  status: BrowserPlusWorkStatus;
  reason: string;
} {
  if (!rvtr) return { status: "Missing RVTR", reason: "No RVTR found in the VirtualDJ Label field." };
  if (!hasCover) return { status: "Missing Cover", reason: "No VDJ or Retroverse cover is available." };
  if (!pkg) return { status: "Missing Package", reason: "RVTR is mapped but no package exists yet." };
  if (pkg.status === "draft" || pkg.status === "review") return { status: "Needs Review", reason: "Package exists but is not approved or published." };
  if (pkg.status === "cards_ready") return { status: "Cards Ready", reason: "Cards are ready for operator review." };
  if (pkg.status === "approved") return { status: "Ready To Publish", reason: "Package is approved and ready for publishing." };
  if (pkg.status === "published" && deckReady) return { status: "Complete", reason: "Published package and DK label are both present." };
  if (pkg.status === "published") return { status: "Published", reason: "Package is published; deck readiness is not confirmed." };
  return { status: "Needs Review", reason: "Package status requires operator attention." };
}

function compactDate(iso: string | null): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}

async function virtualDjRunning(): Promise<boolean> {
  if (process.platform !== "darwin") return false;
  try {
    await execFileAsync("pgrep", ["-x", "VirtualDJ"]);
    return true;
  } catch {
    return false;
  }
}

async function loadPackageSummaries(): Promise<Map<string, PackageSummary>> {
  const out = new Map<string, PackageSummary>();
  let files: string[] = [];
  try {
    files = await readdir(songPackagesDir());
  } catch {
    return out;
  }

  await Promise.all(
    files
      .filter((file) => /^RVTR\d{6}\.json$/i.test(file))
      .map(async (file) => {
        try {
          const raw = await readFile(join(songPackagesDir(), file), "utf8");
          const parsed = JSON.parse(raw) as {
            rvtr?: string;
            status?: string;
            updatedAt?: string;
            processedAt?: string | null;
            publishedAt?: string | null;
            metadata?: {
              title?: string;
              artist?: string;
              coverUrl?: string | null;
            };
          };
          const rvtr = (parsed.rvtr ?? basename(file, ".json")).trim().toUpperCase();
          if (!/^RVTR\d{6}$/.test(rvtr)) return;
          out.set(rvtr, {
            rvtr,
            status: parsed.status ?? "draft",
            title: parsed.metadata?.title ?? null,
            artist: parsed.metadata?.artist ?? null,
            coverUrl: parsed.metadata?.coverUrl ?? null,
            updatedAt: parsed.updatedAt ?? null,
            processedAt: parsed.processedAt ?? null,
            publishedAt: parsed.publishedAt ?? null,
          });
        } catch {
          // Ignore malformed package files for the read-only Browser+ prototype.
        }
      }),
  );

  return out;
}

async function loadBrowserPlusQueueStats(): Promise<BrowserPlusQueueStats> {
  const empty = { packageCandidates: 0, coverFirst: 0 };
  try {
    const parsed = JSON.parse(await readFile(backfillQueuePath(), "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { entries?: unknown }).entries)) {
      return empty;
    }
    const entries = (parsed as { entries: Array<{ filter?: unknown }> }).entries;
    return {
      packageCandidates: entries.filter((entry) => entry.filter === "missing_package").length,
      coverFirst: entries.filter((entry) => entry.filter === "missing_cover").length,
    };
  } catch {
    return empty;
  }
}

type FolderDraft = Omit<BrowserPlusFolderNode, "children"> & { children: Map<string, FolderDraft> };

function makeFolderDraft(name: string, path: string[]): FolderDraft {
  return {
    id: path.join("/"),
    name,
    path,
    trackCount: 0,
    rvtrCount: 0,
    dkCount: 0,
    pkCount: 0,
    missingCovers: 0,
    missingPackages: 0,
    children: new Map(),
  };
}

function addFolderStats(root: FolderDraft, row: BrowserPlusRow) {
  let current = root;
  for (const part of row.folderPath) {
    const nextPath = [...current.path, part];
    let next = current.children.get(part);
    if (!next) {
      next = makeFolderDraft(part, nextPath);
      current.children.set(part, next);
    }
    next.trackCount += 1;
    if (row.rvtr) next.rvtrCount += 1;
    if (row.label.startsWith("DK_")) next.dkCount += 1;
    if (row.label.startsWith("PK_")) next.pkCount += 1;
    if (row.coverStatus === "Missing Cover") next.missingCovers += 1;
    if (row.packageStatus === "Missing Package") next.missingPackages += 1;
    current = next;
  }
}

function finalizeFolder(draft: FolderDraft): BrowserPlusFolderNode {
  return {
    ...draft,
    children: [...draft.children.values()]
      .sort((a, b) => b.trackCount - a.trackCount || a.name.localeCompare(b.name))
      .map(finalizeFolder),
  };
}

function buildStats(
  rows: BrowserPlusRow[],
  folders: BrowserPlusFolderNode[],
  parseMs: number,
  queueStats: BrowserPlusQueueStats,
): BrowserPlusStats {
  let folderCount = 0;
  const visit = (nodes: BrowserPlusFolderNode[]) => {
    for (const node of nodes) {
      folderCount += 1;
      visit(node.children);
    }
  };
  visit(folders);
  const videoRows = rows.filter((row) => row.isVideo);
  const activeMissingThumbnails = videoRows.filter((row) => row.thumbnailStatus === "Missing");
  const repairableThumbnail = activeMissingThumbnails.filter((row) => {
    const generated = generatedThumbnailPath(row.filePath);
    return Boolean(generated && existsSync(generated));
  }).length;
  const vaultMissingThumbnail = rows.filter((row) => {
    if (!isVideoVaultPath(row.filePath) || !existsSync(row.filePath)) return false;
    return !findSidecarThumbnail(row.filePath);
  }).length;
  const thumbnailFolderStats = new Map<string, { videos: number; missing: number }>();
  for (const row of videoRows) {
    const folder = row.folderKey || dirname(row.filePath);
    const current = thumbnailFolderStats.get(folder) ?? { videos: 0, missing: 0 };
    current.videos += 1;
    if (row.thumbnailStatus !== "Present") current.missing += 1;
    thumbnailFolderStats.set(folder, current);
  }
  const missingPackage = rows.filter((row) => row.packageStatus === "Missing Package").length;
  const needsReview = rows.filter((row) => row.workStatus === "Needs Review").length;
  const needsRvtr = rows.filter((row) => !row.rvtr).length;
  const coverFirst = queueStats.coverFirst || rows.filter((row) => row.rvtr && row.coverStatus === "Missing Cover").length;
  const outOfScope = Math.max(0, missingPackage - queueStats.packageCandidates - needsRvtr - coverFirst);
  return {
    totalTracks: rows.length,
    videoTracks: videoRows.length,
    rvtrMapped: rows.filter((row) => row.rvtr).length,
    pkCount: rows.filter((row) => row.label.startsWith("PK_")).length,
    dkCount: rows.filter((row) => row.label.startsWith("DK_")).length,
    noRvtr: needsRvtr,
    coversPresent: rows.filter((row) => row.hasCover).length,
    vdjCovers: rows.filter((row) => row.hasVdjCover).length,
    retroverseCovers: rows.filter((row) => row.hasRetroverseCover).length,
    thumbnailsPresent: videoRows.filter((row) => row.thumbnailStatus === "Present").length,
    missingThumbnails: activeMissingThumbnails.length,
    missingFiles: rows.filter((row) => row.isVideo && !row.fileExists).length,
    patronReady: rows.filter((row) => row.rvtr && (row.thumbnailStatus === "Present" || row.hasRetroverseCover)).length,
    folderCount,
    parseMs,
    libraryHealth: {
      missingFile: rows.filter((row) => row.isVideo && !row.fileExists).length,
      missingThumbnail: activeMissingThumbnails.length,
      repairableThumbnail,
      requiresGenerationThumbnail: Math.max(0, activeMissingThumbnails.length - repairableThumbnail),
      vaultMissingThumbnail,
      missingRvtr: needsRvtr,
    },
    retroverseHealth: {
      missingPackage,
      packageCandidates: queueStats.packageCandidates,
      needsRvtr,
      coverFirst,
      outOfScope,
      needsReview,
      missingDeck: rows.filter((row) => row.rvtr && row.deckStatus === "Deck Missing").length,
    },
    thumbnailFolderHotspots: [...thumbnailFolderStats.entries()]
      .map(([folder, stats]) => ({
        folder,
        videos: stats.videos,
        missing: stats.missing,
        missingRate: stats.videos > 0 ? stats.missing / stats.videos : 0,
      }))
      .filter((stats) => stats.videos >= 10 && stats.missing >= 5)
      .sort((a, b) => b.missingRate - a.missingRate || b.missing - a.missing)
      .slice(0, 8),
  };
}

export async function loadBrowserPlusModel(): Promise<BrowserPlusModel> {
  const path = vdjDatabasePath();
  const fileStat = await stat(path).catch(() => null);
  if (!fileStat) {
    return {
      databasePath: path,
      databaseMtime: null,
      databaseSizeBytes: 0,
      parsedAt: new Date().toISOString(),
      virtualDjRunning: await virtualDjRunning(),
      readOnly: true,
      rows: [],
      folders: [],
      columns: BROWSER_PLUS_COLUMNS,
      stats: {
        totalTracks: 0,
        videoTracks: 0,
        rvtrMapped: 0,
        pkCount: 0,
        dkCount: 0,
        noRvtr: 0,
        coversPresent: 0,
        vdjCovers: 0,
        retroverseCovers: 0,
        thumbnailsPresent: 0,
        missingThumbnails: 0,
        missingFiles: 0,
        patronReady: 0,
        folderCount: 0,
        parseMs: 0,
        libraryHealth: {
          missingFile: 0,
          missingThumbnail: 0,
          repairableThumbnail: 0,
          requiresGenerationThumbnail: 0,
          vaultMissingThumbnail: 0,
          missingRvtr: 0,
        },
        retroverseHealth: {
          missingPackage: 0,
          packageCandidates: 0,
          needsRvtr: 0,
          coverFirst: 0,
          outOfScope: 0,
          needsReview: 0,
          missingDeck: 0,
        },
        thumbnailFolderHotspots: [],
      },
    };
  }

  if (cache && cache.path === path && cache.mtimeMs === fileStat.mtimeMs && cache.size === fileStat.size) {
    const queueStats = await loadBrowserPlusQueueStats();
    return {
      ...cache.model,
      virtualDjRunning: await virtualDjRunning(),
      stats: buildStats(cache.model.rows, cache.model.folders, cache.model.stats.parseMs, queueStats),
    };
  }

  const t0 = Date.now();
  const [xml, packages] = await Promise.all([readFile(path, "utf8"), loadPackageSummaries()]);
  const rows: BrowserPlusRow[] = [];
  const folderRoot = makeFolderDraft("root", []);
  const songRe = /<Song\s+FilePath="([^"]*)"[^>]*>([\s\S]*?)<\/Song>/g;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = songRe.exec(xml)) !== null) {
    const filePath = decodeXmlAttr(match[1] ?? "").replace(/\\/g, "/");
    const inner = match[2] ?? "";
    const tagsAttrs = inner.match(/<Tags([^>]*)\/?>/)?.[1] ?? "";
    const infosAttrs = inner.match(/<Infos([^>]*)\/?>/)?.[1] ?? "";
    const scanAttrs = inner.match(/<Scan([^>]*)\/?>/)?.[1] ?? "";
    const label = readAttr(tagsAttrs, "Label").trim();
    const rvtr = rvtrFromLabel(label);
    const pkg = rvtr ? packages.get(rvtr) ?? null : null;
    const hasVdjCover = Boolean(readAttr(infosAttrs, "Cover")) || /<Link\b[^>]*\sCover="/.test(inner);
    const retroverseCoverUrl = pkg?.coverUrl ?? null;
    const hasCover = hasVdjCover || Boolean(pkg?.coverUrl);
    const deckReady = label.startsWith("DK_");
    const packageStatus = prettyStatus(pkg?.status);
    const deckStatus = deckReady ? "Deck Ready" : pkg ? "Deck Missing" : "No Package";
    const coverStatus = hasCover ? "Cover Present" : "Missing Cover";
    const work = workStatus(rvtr, hasCover, pkg, deckReady);
    const score = coverageScore(rvtr, hasCover, pkg, deckReady);
    const folderPath = folderParts(filePath);
    const fileName = basename(filePath);
    const kind = mediaKind(filePath);
    const isVideo = isOpsPlayableVideoPath(filePath);
    const fileExists = isVideo ? existsSync(filePath) : filePath.startsWith("netsearch://") || existsSync(filePath);
    const thumbnail = detectThumbnail(filePath, isVideo, fileExists);
    const poiCount = (inner.match(/<Poi\b/g) ?? []).length;
    const linkCount = (inner.match(/<Link\b/g) ?? []).length;
    const artist = readAttr(tagsAttrs, "Author");
    const title = readAttr(tagsAttrs, "Title");
    const user2 = readAttr(tagsAttrs, "User2");
    const row: BrowserPlusRow = {
      id: `${index}:${normVdjPath(filePath)}`,
      filePath,
      fileName,
      fileType: extname(fileName).replace(".", "").toUpperCase() || kind.toUpperCase(),
      folderPath,
      folderKey: folderPath.join("/"),
      mediaKind: kind,
      artist,
      title,
      album: readAttr(tagsAttrs, "Album"),
      genre: readAttr(tagsAttrs, "Genre"),
      year: numberAttr(tagsAttrs, "Year"),
      bpm: displayBpm(tagsAttrs, scanAttrs),
      key: readAttr(tagsAttrs, "Key") || readAttr(scanAttrs, "Key"),
      lengthSeconds: numberAttr(infosAttrs, "SongLength"),
      playCount: numberAttr(infosAttrs, "PlayCount"),
      firstSeen: parseVdjDate(readAttr(infosAttrs, "FirstSeen")),
      firstPlay: parseVdjDate(readAttr(infosAttrs, "FirstPlay")),
      lastPlay: parseVdjDate(readAttr(infosAttrs, "LastPlay")),
      label,
      grouping: readAttr(tagsAttrs, "Grouping"),
      user1: readAttr(tagsAttrs, "User1"),
      user2,
      rvTags: user2,
      rvtr,
      matchMethod: rvtr ? "Label" : "Unmatched",
      packageStatus,
      deckStatus,
      coverStatus,
      thumbnailStatus: thumbnail.thumbnailStatus,
      thumbnailPath: thumbnail.thumbnailPath,
      thumbnailUrl: thumbnail.thumbnailUrl,
      thumbnailSource: thumbnail.thumbnailSource,
      workStatus: work.status,
      workStatusReason: work.reason,
      coverageScore: score,
      canonicalArtist: pkg?.artist ?? null,
      canonicalTrack: pkg?.title ?? null,
      lastGenerated: compactDate(pkg?.processedAt ?? pkg?.updatedAt ?? null),
      lastPublished: compactDate(pkg?.publishedAt ?? null),
      coverageFlags: [
        rvtr ? "RVTR" : "NO_RVTR",
        hasCover ? "COVER" : "NO_COVER",
        pkg ? "PACKAGE" : "NO_PACKAGE",
        deckReady ? "DK" : "NO_DK",
      ],
      poiCount,
      linkCount,
      hasVdjCover,
      hasCover,
      hasRetroverseCover: Boolean(retroverseCoverUrl),
      retroverseCoverUrl,
      fileExists,
      isVideo,
      searchText: `${artist} ${title} ${filePath} ${label} ${user2} ${rvtr ?? ""} ${thumbnail.thumbnailStatus} ${thumbnail.thumbnailSource}`.toLowerCase(),
    };
    rows.push(row);
    addFolderStats(folderRoot, row);
    index += 1;
  }

  const folders = [...folderRoot.children.values()]
    .sort((a, b) => b.trackCount - a.trackCount || a.name.localeCompare(b.name))
    .map(finalizeFolder);
  const parseMs = Date.now() - t0;
  const queueStats = await loadBrowserPlusQueueStats();
  const model: BrowserPlusModel = {
    databasePath: path,
    databaseMtime: new Date(fileStat.mtimeMs).toISOString(),
    databaseSizeBytes: fileStat.size,
    parsedAt: new Date().toISOString(),
    virtualDjRunning: await virtualDjRunning(),
    readOnly: true,
    rows,
    folders,
    columns: BROWSER_PLUS_COLUMNS,
    stats: buildStats(rows, folders, parseMs, queueStats),
  };

  cache = { path, mtimeMs: fileStat.mtimeMs, size: fileStat.size, model };
  return model;
}
