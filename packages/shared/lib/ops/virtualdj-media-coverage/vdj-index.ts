import "server-only";

import { createHash } from "crypto";
import { stat } from "fs/promises";

import {
  normVdjPath,
  scanVdjDatabase,
  type VdjLibraryEntry,
} from "@/lib/ops/intelligence/vdj-database";
import { classifyManagedMediaPath } from "./managed-roots";

import type { InventorySummary } from "./types";

export type VirtualDjLibraryIndex = {
  entries: readonly VdjLibraryEntry[];
  byRvtr: ReadonlyMap<string, readonly number[]>;
  byArtistTitle: ReadonlyMap<string, readonly number[]>;
  byTitle: ReadonlyMap<string, readonly number[]>;
  byArtist: ReadonlyMap<string, readonly number[]>;
  byFilePath: ReadonlyMap<string, readonly number[]>;
  managedAudio: ReadonlySet<number>;
  managedVideo: ReadonlySet<number>;
  excludedVideoVault: ReadonlySet<number>;
  outsideManagedLibrary: ReadonlySet<number>;
  summary: InventorySummary;
};

let indexCache: { fingerprint: string; index: VirtualDjLibraryIndex } | null = null;

export function normalizeIdentityText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/^the\s+/i, "")
    .replace(/\b(feat(?:uring)?|ft)\.?\b/gi, " ")
    .replace(/[\u2018\u2019'`´]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function artistTitleKey(artist: string, title: string): string {
  return `${normalizeArtistText(artist)}|${normalizeIdentityText(title)}`;
}

export function normalizeArtistText(value: string): string {
  const primary = value.split(/\s+(?:feat(?:uring)?|ft|with)\.?\s+/i)[0] ?? value;
  return normalizeIdentityText(primary);
}

export function rvtrFromLabel(label: string): string | null {
  const match = label.trim().toUpperCase().match(/^(?:PK_)?(RVTR\d{6})$/);
  return match?.[1] ?? null;
}

function append(map: Map<string, number[]>, key: string, index: number): void {
  if (!key) return;
  const group = map.get(key);
  if (group) group.push(index);
  else map.set(key, [index]);
}

function readonlyMap(map: Map<string, number[]>): ReadonlyMap<string, readonly number[]> {
  return map;
}

export async function buildVirtualDjLibraryIndex(options?: {
  force?: boolean;
}): Promise<VirtualDjLibraryIndex> {
  const scan = await scanVdjDatabase({ force: options?.force });
  const xmlStat = await stat(scan.path).catch(() => null);
  const mtimeMs = xmlStat?.mtimeMs ?? 0;
  const fingerprint = createHash("sha256")
    .update(`${scan.path}\0${mtimeMs}\0${scan.fileSizeBytes}`)
    .digest("hex");

  if (!options?.force && indexCache?.fingerprint === fingerprint) return indexCache.index;

  const byRvtr = new Map<string, number[]>();
  const byArtistTitle = new Map<string, number[]>();
  const byTitle = new Map<string, number[]>();
  const byArtist = new Map<string, number[]>();
  const byFilePath = new Map<string, number[]>();
  const managedAudio = new Set<number>();
  const managedVideo = new Set<number>();
  const excludedVideoVault = new Set<number>();
  const outsideManagedLibrary = new Set<number>();

  scan.entries.forEach((entry, index) => {
    const rvtr = rvtrFromLabel(entry.label);
    if (rvtr) append(byRvtr, rvtr, index);
    append(byArtistTitle, artistTitleKey(entry.artist, entry.title), index);
    append(byTitle, normalizeIdentityText(entry.title), index);
    append(byArtist, normalizeArtistText(entry.artist), index);
    append(byFilePath, normVdjPath(entry.filePath), index);
    switch (entry.managedClass ?? classifyManagedMediaPath(entry.filePath)) {
      case "managed_audio":
        managedAudio.add(index);
        break;
      case "managed_video":
        managedVideo.add(index);
        break;
      case "excluded_video_vault":
        excludedVideoVault.add(index);
        break;
      default:
        outsideManagedLibrary.add(index);
    }
  });

  const summary: InventorySummary = {
    xmlPath: scan.path,
    xmlEntries: scan.entries.length,
    managedMusic: managedAudio.size,
    managedVideo: managedVideo.size,
    videoVaultExcluded: excludedVideoVault.size,
    outsideManagedLibrary: outsideManagedLibrary.size,
    fingerprint,
    fingerprintTime: xmlStat?.mtime.toISOString() ?? scan.scannedAt,
    fileSizeBytes: scan.fileSizeBytes,
    parseMs: scan.parseMs,
  };

  const index: VirtualDjLibraryIndex = {
    entries: Object.freeze([...scan.entries]),
    byRvtr: readonlyMap(byRvtr),
    byArtistTitle: readonlyMap(byArtistTitle),
    byTitle: readonlyMap(byTitle),
    byArtist: readonlyMap(byArtist),
    byFilePath: readonlyMap(byFilePath),
    managedAudio,
    managedVideo,
    excludedVideoVault,
    outsideManagedLibrary,
    summary,
  };
  indexCache = { fingerprint, index };
  return index;
}
