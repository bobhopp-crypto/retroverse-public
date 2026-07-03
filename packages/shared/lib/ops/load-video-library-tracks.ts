import "server-only";

import { readFile } from "node:fs/promises";

import { isUnmatchedVideoTrackPath } from "@/lib/ops/browser-plus/load-unmatched-video-tracks";
import { normVdjPath, vdjDatabasePath } from "@/lib/ops/intelligence/vdj-database";

const RVTR_RE = /RVTR\d{6}/i;

export type VideoLibraryTrack = {
  filePath: string;
  filePathNorm: string;
  artist: string;
  title: string;
  rvtr: string | null;
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

/** All VIDEO-folder tracks from database.xml (assigned + unresolved). */
export async function loadAllVideoLibraryTracks(): Promise<VideoLibraryTrack[]> {
  const path = vdjDatabasePath();
  const xml = await readFile(path, "utf8");
  const out: VideoLibraryTrack[] = [];
  const songRe = /<Song\s+FilePath="([^"]*)"[^>]*>([\s\S]*?)<\/Song>/g;
  let m: RegExpExecArray | null;

  while ((m = songRe.exec(xml)) !== null) {
    const filePath = decodeXmlAttr(m[1] ?? "").replace(/\\/g, "/");
    if (!isUnmatchedVideoTrackPath(filePath)) continue;

    const inner = m[2] ?? "";
    const tagsAttrs = inner.match(/<Tags([^>]*)\/?>/)?.[1] ?? "";
    const label = readAttr(tagsAttrs, "Label").trim();

    out.push({
      filePath,
      filePathNorm: normVdjPath(filePath),
      artist: readAttr(tagsAttrs, "Author").trim(),
      title: readAttr(tagsAttrs, "Title").trim(),
      rvtr: rvtrFromLabel(label),
    });
  }

  return out;
}
