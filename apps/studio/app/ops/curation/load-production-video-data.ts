import { existsSync, readFileSync, statSync } from "node:fs";

const ROOT = "/Users/bobhopp/DJ MEDIA/VIDEO";
const XML = "/Users/bobhopp/Library/Application Support/VirtualDJ/database.xml";

export type ProductionVideo = {
  filepath: string; filename: string; artist: string | null; title: string | null; album: string | null;
  year: string | null; rvtr: string | null; exists: boolean; playCount: number; lastPlayed: string | null;
  fingerprint: { chart: "complete" | "missing"; artist: "complete" | "missing"; album: "complete" | "missing"; performance: "complete"; transition: "partial"; package: "complete" | "missing"; experience: "complete" | "partial" | "missing"; futureAi: "future" };
  candidate: "ready_to_assign" | "candidate_match" | "needs_research" | "no_candidate" | "none";
  packageStatus: string | null;
};

function value(block: string, name: string) { return block.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null; }

export function loadProductionVideoData(): { generatedAt: string; items: ProductionVideo[] } {
  const snapshotPath = "/Users/bobhopp/RETROVERSE_DATA/generated/production-readiness-snapshot.json";
  if (existsSync(snapshotPath)) {
    const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as { generatedAt: string; records: any[] };
    return { generatedAt: snapshot.generatedAt, items: snapshot.records.map((r) => ({ filepath: r.activePath, filename: r.filename, artist: r.vdjArtist ?? null, title: r.vdjTitle ?? null, album: r.primaryAlbumTitle ?? r.vdjAlbum ?? null, year: r.canonicalYear ?? r.vdjYear ?? null, rvtr: r.canonicalRvtr ?? r.rvtrLabel ?? null, exists: true, playCount: Number(r.xmlEvidence?.[0]?.playCount ?? 0), lastPlayed: r.xmlEvidence?.[0]?.lastPlayed ?? null, packageStatus: r.packageAvailable ? "available" : null, candidate: "none", fingerprint: { chart: r.chartRelationship ? "complete" : "missing", artist: r.canonicalArtistId ? "complete" : "missing", album: r.primaryAlbumId ? "complete" : "missing", performance: "complete", transition: "partial", package: r.packageAvailable ? "complete" : "missing", experience: r.highestEarnedStar === "★★★★" ? "complete" : "partial", futureAi: "future" } })) };
  }
  const xml = readFileSync(XML, "utf8");
  const packageIndex = JSON.parse(readFileSync("data/ops/intelligence/package-index.json", "utf8")) as { packages: Array<{ rvtr: string; title?: string; artist?: string; status?: string }> };
  const packages = new Map(packageIndex.packages.map((p) => [p.rvtr, p]));
  const byPath = new Map<string, ProductionVideo>();
  for (const match of xml.matchAll(/FilePath="([^"]*)"/g)) {
    const filepath = match[1].replaceAll("&amp;", "&").replaceAll("&apos;", "'");
    if (!filepath.startsWith(ROOT + "/")) continue;
    const start = xml.lastIndexOf("<Song", match.index);
    const end = xml.indexOf("</Song>", match.index);
    const block = xml.slice(start, end >= 0 ? end + 7 : match.index! + match[0].length);
    const rvtr = block.match(/RVTR\d{6}/)?.[0] ?? null;
    const artist = value(block, "Author") ?? value(block, "Artist");
    const title = value(block, "Title");
    const album = value(block, "Album");
    const year = value(block, "Year");
    const exists = existsSync(filepath);
    const pkg = rvtr ? packages.get(rvtr) : undefined;
    const packageReady = Boolean(pkg);
    const candidate = rvtr ? "none" : artist && title ? "candidate_match" : "no_candidate";
    byPath.set(filepath, { filepath, filename: filepath.split("/").pop() ?? filepath, artist, title, album, year, rvtr, exists, playCount: Number(value(block, "PlayCount") ?? 0), lastPlayed: value(block, "LastPlay"), fingerprint: { chart: rvtr ? "complete" : "missing", artist: artist ? "complete" : "missing", album: album ? "complete" : "missing", performance: "complete", transition: "partial", package: packageReady ? "complete" : "missing", experience: rvtr ? "partial" : "missing", futureAi: "future" }, candidate, packageStatus: pkg?.status ?? null });
  }
  return { generatedAt: new Date().toISOString(), items: [...byPath.values()] };
}
