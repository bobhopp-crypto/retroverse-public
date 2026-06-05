import { writeFile } from "fs/promises";
import { join } from "path";

import { loadShowBuilderProject } from "./load";
import type { VdjPoolSong } from "./types";
import { vdjExportDir } from "./vdj-paths";

function encodeVdjXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&apos;")
    .replace(/"/g, "&quot;");
}

function songXml(song: VdjPoolSong, idx: number): string {
  const attrs = [`path="${encodeVdjXml(song.path)}"`];
  if (song.size != null && Number.isFinite(song.size)) attrs.push(`size="${song.size}"`);
  if (song.songlength != null && Number.isFinite(song.songlength)) {
    attrs.push(`songlength="${song.songlength}"`);
  }
  if (song.bpm) attrs.push(`bpm="${encodeVdjXml(song.bpm)}"`);
  if (song.musicalKey) attrs.push(`key="${encodeVdjXml(song.musicalKey)}"`);
  attrs.push(`artist="${encodeVdjXml(song.artist)}"`);
  attrs.push(`title="${encodeVdjXml(song.title)}"`);
  if (song.remix) attrs.push(`remix="${encodeVdjXml(song.remix)}"`);
  attrs.push(`idx="${idx}"`);
  return `\t<song ${attrs.join(" ")} />`;
}

export async function buildVdjPlaylistXml(): Promise<string> {
  const data = await loadShowBuilderProject();
  const catalog = new Map<string, VdjPoolSong>();
  for (const list of Object.values(data.pools)) {
    for (const song of list) catalog.set(song.key, song);
  }

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<VirtualFolder noDuplicates="no" ordered="yes">',
  ];

  let idx = 0;
  for (const entry of data.flow) {
    if (entry.type !== "set") continue;
    const order = data.songOrder[entry.setId] ?? [];
    for (const key of order) {
      const song = catalog.get(key);
      if (!song) continue;
      lines.push(songXml(song, idx));
      idx += 1;
    }
  }

  lines.push("</VirtualFolder>");
  return `${lines.join("\n")}\n`;
}

export function sanitizeExportName(name: string): string {
  const trimmed = name.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, "-");
  return trimmed || "Show";
}

export async function writeVdjPlaylistExport(filename: string): Promise<string> {
  const safe = sanitizeExportName(filename);
  const xml = await buildVdjPlaylistXml();
  const outPath = join(vdjExportDir(), `${safe}.vdjplaylist`);
  await writeFile(outPath, xml, "utf8");
  return outPath;
}
