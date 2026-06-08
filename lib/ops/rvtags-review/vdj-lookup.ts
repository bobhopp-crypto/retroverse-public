import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

export type VdjTrackMeta = {
  user2: string;
  /** Manually adjusted rotation signal from VDJ Infos PlayCount — not a factual play total. */
  playCount: number | null;
};

function normPath(p: string): string {
  return p
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\\/g, "/")
    .trim();
}

const VDJ_DB = join(homedir(), "Library/Application Support/VirtualDJ/database.xml");

/** Index User2 + rotation signal (PlayCount) for requested paths from VirtualDJ database.xml. */
export async function loadVdjMetaForPaths(
  filePaths: string[],
): Promise<Map<string, VdjTrackMeta>> {
  const wanted = new Set(filePaths.map(normPath));
  const out = new Map<string, VdjTrackMeta>();
  if (wanted.size === 0) return out;

  let xml: string;
  try {
    xml = await readFile(VDJ_DB, "utf8");
  } catch {
    return out;
  }

  const songRe =
    /<Song FilePath="([^"]*)"[^>]*>[\s\S]*?<Tags([^>]*?)\s*\/>[\s\S]*?<Infos([^>]*)\/>/g;
  let m: RegExpExecArray | null;
  while ((m = songRe.exec(xml)) !== null) {
    const rawPath = m[1]!.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    const key = normPath(rawPath);
    if (!wanted.has(key)) continue;

    const tagsAttrs = m[2] ?? "";
    const infosAttrs = m[3] ?? "";
    const user2M = tagsAttrs.match(/\sUser2="([^"]*)"/);
    const playM = infosAttrs.match(/\sPlayCount="(\d+)"/);

    out.set(key, {
      user2: user2M
        ? user2M[1]!.replace(/&quot;/g, '"').replace(/&amp;/g, "&")
        : "",
      playCount: playM ? Number(playM[1]) : null,
    });
  }

  return out;
}
