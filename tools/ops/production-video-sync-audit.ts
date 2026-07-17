/**
 * Read-only production video synchronizer.
 *
 * Scope is intentionally permanent: /Users/bobhopp/DJ MEDIA/VIDEO/ only.
 * It never opens database.xml for writing and never writes VirtualDJ metadata.
 * By default the snapshot is printed to stdout. Use --out only to persist a
 * review snapshot outside VirtualDJ.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const PRODUCTION_ROOT = "/Users/bobhopp/DJ MEDIA/VIDEO";
const VDJ_XML = "/Users/bobhopp/Library/Application Support/VirtualDJ/database.xml";

type ReviewItem = {
  filepath: string; filename: string; artist: string | null; title: string | null;
  year: string | null; rvtr: string | null; status: string; confidence: number;
  reason: string; changed: boolean;
};

function attr(xml: string, name: string) {
  const m = xml.match(new RegExp(`${name}="([^"]*)"`));
  return m?.[1]?.replaceAll("&amp;", "&").replaceAll("&apos;", "'") ?? null;
}

function main() {
  const xml = readFileSync(VDJ_XML, "utf8");
  const items: ReviewItem[] = [];
  for (const match of xml.matchAll(/FilePath="([^"]*)"/g)) {
    const filepath = match[1].replaceAll("&amp;", "&").replaceAll("&apos;", "'");
    if (!filepath.startsWith(PRODUCTION_ROOT + "/")) continue;
    const start = xml.lastIndexOf("<Song", match.index);
    const end = xml.indexOf("</Song>", match.index);
    const block = xml.slice(start, end >= 0 ? end + 7 : match.index! + match[0].length);
    const rvtr = block.match(/RVTR\d{6}/)?.[0] ?? null;
    const artist = attr(block, "Author") ?? attr(block, "Artist");
    const title = attr(block, "Title");
    const year = attr(block, "Year");
    const exists = existsSync(filepath);
    const status = !exists ? "missing_path" : rvtr ? "labeled" : "new_media";
    const confidence = rvtr ? 1 : artist && title ? 0.55 : 0.1;
    const reason = !exists ? "VirtualDJ path is missing" : rvtr ? "Existing RVTR label" : artist && title ? "Metadata candidate; needs review" : "No reliable candidate metadata";
    items.push({ filepath, filename: basename(filepath), artist, title, year, rvtr, status, confidence, reason, changed: false });
  }
  const existing = items.filter((x) => existsSync(x.filepath));
  const rvtrs = new Set(existing.flatMap((x) => x.rvtr ? [x.rvtr] : []));
  const byRvtr = new Map<string, number>();
  for (const x of existing) if (x.rvtr) byRvtr.set(x.rvtr, (byRvtr.get(x.rvtr) ?? 0) + 1);
  const snapshot = {
    schema: "retroverse.production-video-sync.v1", generatedAt: new Date().toISOString(),
    scope: { root: PRODUCTION_ROOT, excludedRoots: ["VIDEO VAULT", "Assets", "Concerts", "Loops", "Backgrounds", "Pop-Up Video archive", "Experiments", "Replacement media"] },
    scan: { xmlEntries: items.length, existingFiles: existing.length, missingPaths: items.length - existing.length, rvtrLabeled: existing.filter((x) => x.rvtr).length, distinctRvtrs: rvtrs.size, unmatched: existing.filter((x) => !x.rvtr).length, duplicateRvtrClusters: [...byRvtr.values()].filter((n) => n > 1).length, duplicateRvtrExcess: [...byRvtr.values()].reduce((n, x) => n + Math.max(0, x - 1), 0) },
    reviewQueue: existing.filter((x) => !x.rvtr).sort((a, b) => b.confidence - a.confidence), items,
    safety: { virtualDjWrites: 0, xmlWrites: 0, catalogWrites: 0, deployment: 0 },
  };
  const out = process.argv.find((x) => x.startsWith("--out="))?.slice(6);
  if (out) writeFileSync(resolve(out), JSON.stringify(snapshot, null, 2));
  else process.stdout.write(JSON.stringify(snapshot, null, 2) + "\n");
}

main();
