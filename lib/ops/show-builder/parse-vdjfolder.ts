import { readFile } from "fs/promises";
import { join } from "path";

import type { VdjPoolSong } from "./types";
import { vdjMyListsDir } from "./vdj-paths";

function decodeVdjXml(value: string): string {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseAttrs(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([\w:-]+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag))) {
    attrs[m[1]] = decodeVdjXml(m[2]);
  }
  return attrs;
}

export function songKey(year: number, sourceIdx: number): string {
  return `${year}#${sourceIdx}`;
}

export function parseVdjFolderXml(xml: string, year: number): VdjPoolSong[] {
  const songs: VdjPoolSong[] = [];
  const re = /<song\b([^>]*)\/?>/gi;
  let m: RegExpExecArray | null;
  let row = 0;
  while ((m = re.exec(xml))) {
    const attrs = parseAttrs(m[1]);
    const path = attrs.path?.trim();
    if (!path) continue;
    const parsedIdx = attrs.idx != null && attrs.idx !== "" ? Number(attrs.idx) : NaN;
    const sourceIdx = Number.isFinite(parsedIdx) ? parsedIdx : row;
    const key = songKey(year, sourceIdx);
    songs.push({
      key,
      year,
      path,
      artist: attrs.artist?.trim() || "Unknown artist",
      title: attrs.title?.trim() || "Untitled",
      remix: attrs.remix?.trim() || null,
      size: attrs.size ? Number(attrs.size) : null,
      songlength: attrs.songlength ? Number(attrs.songlength) : null,
      bpm: attrs.bpm?.trim() || null,
      musicalKey: attrs.key?.trim() || null,
      sourceIdx,
    });
    row += 1;
  }
  return songs;
}

export async function loadYearPool(year: number): Promise<VdjPoolSong[]> {
  const filePath = join(vdjMyListsDir(), `${year}.vdjfolder`);
  const xml = await readFile(filePath, "utf8");
  return parseVdjFolderXml(xml, year);
}
