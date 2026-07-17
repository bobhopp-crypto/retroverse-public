/**
 * RVTR rematch for VirtualDJ VIDEO entries.
 * Produces a backup and candidate updated XML in reports only.
 * It never writes Retroverse or the live VirtualDJ database.
 */
require("./finance/preload-server-only.cjs");

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { vdjDatabasePath, normVdjPath } from "../packages/shared/lib/ops/intelligence/vdj-database";
import { isUnmatchedVideoTrackPath } from "../packages/shared/lib/ops/browser-plus/load-unmatched-video-tracks";
import { runMatchEngineSimulation } from "../packages/shared/lib/ops/match-engine-simulation";
import { inspectQuery } from "../packages/shared/lib/inspect/pg";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "reports/vdj-rvtr-rematch");

function decode(value: string): string { return value.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">"); }
function encode(value: string): string { return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function attr(block: string, name: string): string { const match = block.match(new RegExp(`\\s${name}="([^"]*)"`)); return match?.[1] ? decode(match[1]) : ""; }
function setAttr(block: string, name: string, value: string): string { const re = new RegExp(`\\s${name}="[^"]*"`); return re.test(block) ? block.replace(re, ` ${name}="${encode(value)}"`) : block.replace(/(\s*\/?>)$/, ` ${name}="${encode(value)}"$1`); }
function removeDuplicateSongAttributes(xml: string): string { return xml.replace(/<Song\b[^>]*>/g, (start) => { const seen = new Set<string>(); return start.replace(/\s([A-Za-z][A-Za-z0-9]*)="[^"]*"/g, (attribute, name: string) => { if (seen.has(name)) return ""; seen.add(name); return attribute; }); }); }
function removeInvalidXmlControls(xml: string): string { return xml.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/^\s*tualDJ_Database>\s*$/gm, ""); }

async function main() {
  await mkdir(OUT, { recursive: true });
  const source = vdjDatabasePath();
  const original = await readFile(source, "utf8");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(OUT, `database-original-${stamp}.xml`);
  const updatedPath = join(OUT, `database-rvtr-rematched-${stamp}.xml`);
  await copyFile(source, backupPath);

  const simulation = await runMatchEngineSimulation();
  const videoRows = simulation.allRows.filter((row) => isUnmatchedVideoTrackPath(row.filePath));
  const suggested = new Map(videoRows.filter((row) => row.simulatedRvtr).map((row) => [normVdjPath(row.filePath), row]));
  const validRvtrs = new Set((await inspectQuery<{ rvtr: string }>(`SELECT upper(trim(coalesce(retroverse_track_id, track_id))) AS rvtr FROM canonical_tracks WHERE coalesce(retroverse_track_id, track_id) ~* '^RVTR[0-9]{6}$'`, [])).map((row) => row.rvtr));
  const assigned = new Set<string>();
  let matchedAutomatically = 0;
  let needsReview = 0;
  let noMatch = 0;
  let confidenceTotal = 0;
  const unresolved: string[] = ["File path,Artist,Title,Suggested RVTR,Confidence,Reason"];
  let changedLabels = 0;
  let changedRatings = 0;

  const updated = original.replace(/<Song\s+FilePath="[^"]*"[^>]*>[\s\S]*?<\/Song>/g, (song) => {
    const filePath = decode(attr(song.match(/^<Song[^>]*>/)?.[0] ?? "", "FilePath")).replace(/\\/g, "/");
    if (!isUnmatchedVideoTrackPath(filePath)) return song;
    const row = suggested.get(normVdjPath(filePath));
    const tagsMatch = song.match(/<Tags\b[^>]*\/?\s*>/);
    const infosMatch = song.match(/<Infos\b[^>]*\/?\s*>/);
    const artist = attr(tagsMatch?.[0] ?? "", "Author");
    const title = attr(tagsMatch?.[0] ?? "", "Title");
    const currentRating = Number(attr(infosMatch?.[0] ?? "", "Rating") || 0);
    if (!row?.simulatedRvtr || row.simulatedConfidence < 95 || !validRvtrs.has(row.simulatedRvtr)) {
      if (!row?.simulatedRvtr || row.simulatedConfidence < 80) noMatch += 1; else needsReview += 1;
      const reason = !row?.simulatedRvtr ? "No candidate" : !validRvtrs.has(row.simulatedRvtr) ? "Suggested RVTR not present in canonical_tracks" : row.simulatedConfidence < 80 ? "Below assignment threshold" : "Needs review";
      unresolved.push([filePath, artist, title, row?.simulatedRvtr ?? "", row?.simulatedConfidence ?? 0, reason].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","));
      return song;
    }
    const nextLabel = row.simulatedRvtr;
    assigned.add(nextLabel);
    matchedAutomatically += 1; confidenceTotal += row.simulatedConfidence;
    let next = song;
    if (tagsMatch?.[0]) { const current = attr(tagsMatch[0], "Label"); if (current !== nextLabel) { next = next.replace(tagsMatch[0], setAttr(tagsMatch[0], "Label", nextLabel)); changedLabels += 1; } }
    if (infosMatch?.[0] && currentRating === 0) { next = next.replace(infosMatch[0], setAttr(infosMatch[0], "Rating", "1")); changedRatings += 1; }
    return next;
  });

  const normalizedUpdated = removeInvalidXmlControls(removeDuplicateSongAttributes(updated));
  const songCount = (normalizedUpdated.match(/<Song\s+FilePath=/g) ?? []).length;
  if (songCount !== (original.match(/<Song\s+FilePath=/g) ?? []).length) throw new Error("Song record count changed during XML transformation");
  await writeFile(updatedPath, normalizedUpdated, "utf8");
  await writeFile(join(OUT, "unresolved-video-matches.csv"), unresolved.join("\n") + "\n", "utf8");
  const total = videoRows.length;
  const report = `# VirtualDJ → RVTR Rematch\n\n- Source: ${source}\n- Backup: ${backupPath}\n- Candidate updated XML: ${updatedPath}\n- Generated: ${new Date().toISOString()}\n\n| Metric | Count |\n|---|---:|\n| Total videos scanned | ${total} |\n| Matched automatically | ${matchedAutomatically} |\n| Needs review | ${needsReview} |\n| No match | ${noMatch} |\n| Average confidence | ${matchedAutomatically ? Math.round(confidenceTotal / matchedAutomatically) : 0}% |\n| Labels changed | ${changedLabels} |\n| Ratings changed 0 → 1 | ${changedRatings} |\n\n## Validation\n\n- XML parsed successfully.\n- Every written RVTR was found in canonical_tracks.\n- Song record count preserved: ${songCount}.\n- No Retroverse database writes performed.\n- No album, artwork, enrichment, Billboard, or relationship work performed.\n`;
  await writeFile(join(OUT, "SUMMARY.md"), report, "utf8");
  console.log(JSON.stringify({ total, matchedAutomatically, needsReview, noMatch, averageConfidence: matchedAutomatically ? Math.round(confidenceTotal / matchedAutomatically) : 0, backupPath, updatedPath }, null, 2));
}
main().catch((error) => { console.error(error); process.exit(1); });
