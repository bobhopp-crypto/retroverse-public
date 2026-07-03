import "server-only";

import { readFile } from "fs/promises";

import { normVdjPath, vdjDatabasePath } from "@/lib/ops/intelligence/vdj-database";
import { isOpsPlayableVideoPath } from "@/lib/ops/ops-video-media";

const RVTR_RE = /RVTR\d{6}/i;

export type UnmatchedVideoTrack = {
  rowId: string;
  filePath: string;
  artist: string;
  title: string;
  label: string;
};

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

function rvtrFromLabel(label: string): string | null {
  const match = label.match(RVTR_RE);
  return match?.[0]?.toUpperCase() ?? null;
}

/** VIDEO-folder track with no RVTR label (excludes MUSIC + VIDEO VAULT). */
export function isUnmatchedVideoTrackPath(filePath: string): boolean {
  if (!isOpsPlayableVideoPath(filePath)) return false;
  const p = filePath.replace(/\\/g, "/");
  if (/\/MUSIC\//i.test(p)) return false;
  if (/\/VIDEO VAULT\//i.test(p)) return false;
  return /\/VIDEO\//i.test(p);
}

/** Load all unmatched VIDEO-folder entries from database.xml. */
export async function loadUnmatchedVideoTracks(): Promise<UnmatchedVideoTrack[]> {
  const path = vdjDatabasePath();
  const xml = await readFile(path, "utf8");
  const out: UnmatchedVideoTrack[] = [];
  const songRe = /<Song\s+FilePath="([^"]*)"[^>]*>([\s\S]*?)<\/Song>/g;
  let m: RegExpExecArray | null;
  let index = 0;

  while ((m = songRe.exec(xml)) !== null) {
    const filePath = decodeXmlAttr(m[1] ?? "").replace(/\\/g, "/");
    if (!isUnmatchedVideoTrackPath(filePath)) continue;

    const inner = m[2] ?? "";
    const tagsAttrs = inner.match(/<Tags([^>]*)\/?>/)?.[1] ?? "";
    const label = readAttr(tagsAttrs, "Label").trim();
    if (rvtrFromLabel(label)) continue;

    out.push({
      rowId: `${index}:${normVdjPath(filePath)}`,
      filePath,
      artist: readAttr(tagsAttrs, "Author").trim(),
      title: readAttr(tagsAttrs, "Title").trim(),
      label,
    });
    index += 1;
  }

  return out;
}
