import { readFile, stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

import { isOpsPlayableVideoPath } from "@/lib/ops/ops-video-media";

import type { VdjIntelligenceSnapshot } from "./vdj-intelligence-types";

/** Default VirtualDJ library database path. */
export function vdjDatabasePath(): string {
  return (
    process.env.RETROVERSE_VDJ_DATABASE?.trim() ||
    join(homedir(), "Library/Application Support/VirtualDJ/database.xml")
  );
}

export function normVdjPath(p: string): string {
  return p
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\/g, "/")
    .trim()
    .toLowerCase();
}

function decodeXmlAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readAttr(block: string, name: string): string {
  const re = new RegExp(`\\s${name}="([^"]*)"`);
  const m = block.match(re);
  return m?.[1] ? decodeXmlAttr(m[1]) : "";
}

export type VdjLibraryEntry = {
  filePath: string;
  filePathNorm: string;
  artist: string;
  title: string;
  album: string;
  year: number | null;
  genre: string;
  remix: string;
  user1: string;
  user2: string;
  playCount: number | null;
  rating: number | null;
  lastPlayed: string | null;
  firstSeen: string | null;
  isVideo: boolean;
};

export type VdjDatabaseScan = {
  path: string;
  scannedAt: string;
  fileSizeBytes: number;
  parseMs: number;
  entries: VdjLibraryEntry[];
};

let scanCache: { mtimeMs: number; scan: VdjDatabaseScan } | null = null;

/** Full scan of database.xml — cached by file mtime. */
export async function scanVdjDatabase(options?: { force?: boolean }): Promise<VdjDatabaseScan> {
  const path = vdjDatabasePath();
  const fileStat = await stat(path).catch(() => null);
  if (!fileStat) {
    return {
      path,
      scannedAt: new Date().toISOString(),
      fileSizeBytes: 0,
      parseMs: 0,
      entries: [],
    };
  }

  if (!options?.force && scanCache && scanCache.mtimeMs === fileStat.mtimeMs) {
    return scanCache.scan;
  }

  const t0 = Date.now();
  const xml = await readFile(path, "utf8");
  const entries: VdjLibraryEntry[] = [];

  const songRe =
    /<Song\s+FilePath="([^"]*)"[^>]*>([\s\S]*?)<\/Song>/g;
  let m: RegExpExecArray | null;
  while ((m = songRe.exec(xml)) !== null) {
    const rawPath = decodeXmlAttr(m[1]!);
    const inner = m[2] ?? "";
    const tagsMatch = inner.match(/<Tags([^>]*)\/?>/);
    const infosMatch = inner.match(/<Infos([^>]*)\/?>/);
    const tagsAttrs = tagsMatch?.[1] ?? "";
    const infosAttrs = infosMatch?.[1] ?? "";

    const yearRaw = readAttr(tagsAttrs, "Year");
    const yearNum = Number(yearRaw);
    const year = Number.isFinite(yearNum) && yearNum > 0 ? yearNum : null;
    const playRaw = readAttr(infosAttrs, "PlayCount");
    const playCount = playRaw ? Number(playRaw) : null;
    const ratingRaw = readAttr(infosAttrs, "Rating");
    const ratingNum = Number(ratingRaw);
    const normalized = normVdjPath(rawPath);

    entries.push({
      filePath: rawPath.replace(/\\/g, "/"),
      filePathNorm: normalized,
      artist: readAttr(tagsAttrs, "Author"),
      title: readAttr(tagsAttrs, "Title"),
      album: readAttr(tagsAttrs, "Album"),
      year,
      genre: readAttr(tagsAttrs, "Genre"),
      remix: readAttr(tagsAttrs, "Remix"),
      user1: readAttr(tagsAttrs, "User1"),
      user2: readAttr(tagsAttrs, "User2"),
      playCount: Number.isFinite(playCount) ? playCount : null,
      rating: Number.isFinite(ratingNum) && ratingNum > 0 ? ratingNum : null,
      lastPlayed: readAttr(infosAttrs, "LastPlay") || readAttr(infosAttrs, "LastPlayed") || null,
      firstSeen: readAttr(infosAttrs, "FirstSeen") || null,
      isVideo: isOpsPlayableVideoPath(rawPath),
    });
  }

  const scan: VdjDatabaseScan = {
    path,
    scannedAt: new Date().toISOString(),
    fileSizeBytes: fileStat.size,
    parseMs: Date.now() - t0,
    entries,
  };

  scanCache = { mtimeMs: fileStat.mtimeMs, scan };
  return scan;
}

/** Path-indexed lookup (reuses full scan). */
export async function loadVdjMetaForPaths(
  filePaths: string[],
): Promise<Map<string, { user2: string; playCount: number | null }>> {
  const wanted = new Set(filePaths.map(normVdjPath));
  const out = new Map<string, { user2: string; playCount: number | null }>();
  if (wanted.size === 0) return out;

  const scan = await scanVdjDatabase();
  for (const entry of scan.entries) {
    if (!wanted.has(entry.filePathNorm)) continue;
    out.set(entry.filePathNorm, { user2: entry.user2, playCount: entry.playCount });
  }
  return out;
}

/** Full VDJ intelligence snapshot for a library entry (VDJ-first canon). */
export function vdjEntryToSnapshot(entry: VdjLibraryEntry): VdjIntelligenceSnapshot {
  return {
    filePath: entry.filePath,
    artist: entry.artist,
    title: entry.title,
    album: entry.album,
    year: entry.year,
    genre: entry.genre,
    remix: entry.remix,
    user1: entry.user1,
    user2: entry.user2,
    playCount: entry.playCount,
    rating: entry.rating,
    lastPlayed: entry.lastPlayed,
    firstSeen: entry.firstSeen,
    isVideo: entry.isVideo,
    capturedAt: new Date().toISOString(),
  };
}

/** Lookup full VDJ snapshot by normalized path. */
export async function loadVdjSnapshotsForPaths(
  filePaths: string[],
): Promise<Map<string, VdjIntelligenceSnapshot>> {
  const wanted = new Set(filePaths.map(normVdjPath));
  const out = new Map<string, VdjIntelligenceSnapshot>();
  if (wanted.size === 0) return out;

  const scan = await scanVdjDatabase();
  for (const entry of scan.entries) {
    if (!wanted.has(entry.filePathNorm)) continue;
    out.set(entry.filePathNorm, vdjEntryToSnapshot(entry));
  }
  return out;
}
