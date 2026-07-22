import "server-only";

import {
  normVdjPath,
  scanVdjDatabase,
  type VdjLibraryEntry,
} from "@/lib/ops/intelligence/vdj-database";

import type { VdjRvtrLinkedEntry } from "./types";

const RVTR_RE = /RVTR\d{6}/i;

/** Extract an authoritative RVTR from a VirtualDJ Label field only. */
export function rvtrFromVdjLabel(label: string | null | undefined): string | null {
  const m = label?.match(RVTR_RE);
  return m?.[0]?.toUpperCase() ?? null;
}

function toLinkedEntry(entry: VdjLibraryEntry, rvtr: string): VdjRvtrLinkedEntry {
  return {
    rvtr,
    filePath: entry.filePath,
    artist: entry.artist,
    title: entry.title,
    album: entry.album,
    year: entry.year,
    playCount: entry.playCount,
    label: entry.label,
    user2: entry.user2,
    isVideo: entry.isVideo,
  };
}

/**
 * VirtualDJ library entries whose Label already carries an RVTR.
 * No title/artist resolution — Label only.
 */
export async function listVdjRvtrLinkedEntries(): Promise<VdjRvtrLinkedEntry[]> {
  const scan = await scanVdjDatabase();
  const out: VdjRvtrLinkedEntry[] = [];
  for (const entry of scan.entries) {
    const rvtr = rvtrFromVdjLabel(entry.label);
    if (!rvtr) continue;
    out.push(toLinkedEntry(entry, rvtr));
  }
  out.sort((a, b) => {
    const pc = (b.playCount ?? 0) - (a.playCount ?? 0);
    if (pc !== 0) return pc;
    return `${a.artist} ${a.title}`.localeCompare(`${b.artist} ${b.title}`);
  });
  return out;
}

/** Find the first VirtualDJ entry whose Label contains this RVTR. */
export async function findVdjEntryByRvtr(rvtr: string): Promise<VdjRvtrLinkedEntry | null> {
  const target = rvtr.trim().toUpperCase();
  const scan = await scanVdjDatabase();
  const entry = scan.entries.find((e) => rvtrFromVdjLabel(e.label) === target);
  return entry ? toLinkedEntry(entry, target) : null;
}

/**
 * Resolve RVTR from a VirtualDJ file path using Label only.
 * Returns null when the path is unknown or Label has no RVTR.
 */
export async function resolveRvtrFromVdjFilePath(
  filePath: string,
): Promise<{ rvtr: string; entry: VdjRvtrLinkedEntry } | null> {
  const target = normVdjPath(filePath);
  if (!target) return null;
  const scan = await scanVdjDatabase();
  const entry = scan.entries.find((e) => e.filePathNorm === target);
  if (!entry) return null;
  const rvtr = rvtrFromVdjLabel(entry.label);
  if (!rvtr) return null;
  return { rvtr, entry: toLinkedEntry(entry, rvtr) };
}
