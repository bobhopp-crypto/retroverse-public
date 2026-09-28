import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const LABEL_RVTR = /RVTR\d{6}/i;
let cached: { dbPath: string; mtimeMs: number; byPath: Map<string, string> } | null = null;

function decode(value: string): string {
  return value.replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function xmlAttribute(text: string, name: string): string {
  return decode(text.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? "");
}

function pathKey(value: string): string {
  return value.replace(/\\/g, "/").trim().toLowerCase();
}

/** Read the authoritative RVTR label from the Mac's VirtualDJ library. */
export async function rvtrForVdjPath(filepath: string): Promise<string | null> {
  const dbPath = process.env.RETROVERSE_VDJ_DATABASE?.trim() ||
    join(homedir(), "Library/Application Support/VirtualDJ/database.xml");
  const info = await stat(dbPath).catch(() => null);
  if (!info) return null;
  if (!cached || cached.dbPath !== dbPath || cached.mtimeMs !== info.mtimeMs) {
    const xml = await readFile(dbPath, "utf8");
    const byPath = new Map<string, string>();
    const song = /<Song\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/Song>)/g;
    let match: RegExpExecArray | null;
    while ((match = song.exec(xml))) {
      const path = xmlAttribute(` ${match[1] ?? ""}`, "FilePath");
      const tags = match[2]?.match(/<Tags([^>]*)\/?\s*>/)?.[1] ?? "";
      const rvtr = xmlAttribute(` ${tags}`, "Label").match(LABEL_RVTR)?.[0]?.toUpperCase();
      if (path && rvtr) byPath.set(pathKey(path), rvtr);
    }
    cached = { dbPath, mtimeMs: info.mtimeMs, byPath };
  }
  return cached.byPath.get(pathKey(filepath)) ?? null;
}
