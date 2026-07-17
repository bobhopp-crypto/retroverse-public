require("./finance/preload-server-only.cjs");

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { normalizeArtistKey, normalizeVideoTitleKey } from "../packages/shared/lib/ops/match-engine-scoring";

const OUT = join(import.meta.dirname, "../reports/vdj-rvtr-rematch-phase3");
const INPUT = join(import.meta.dirname, "../reports/vdj-rvtr-rematch/unresolved-video-matches.csv");
const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
type Row = { path: string; artist: string; title: string; rvtr: string; disposition: string; evidence: string; safe: boolean; count: number };

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) { const c = text[i]; if (quoted) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c; } else if (c === '"') quoted = true; else if (c === ",") { row.push(cell); cell = ""; } else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; } else if (c !== "\r") cell += c; }
  if (cell || row.length) { row.push(cell); rows.push(row); } return rows;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const input = parseCsv(await readFile(INPUT, "utf8")).slice(1).filter((r) => r.length >= 6 && r[5] === "Needs review");
  const simulation = JSON.parse(await readFile(join(import.meta.dirname, "../reports/vdj-rvtr-rematch-phase2/simulation.json"), "utf8")) as { allRows: Array<{ filePath:string; simulatedRvtr:string|null; simulatedConfidence:number; simulatedIdentity:string|null }> };
  const byPath = new Map(simulation.allRows.map((r) => [r.filePath, r]));
  const rows: Row[] = input.map(([path, artist, title, rvtr]) => {
    const sim = byPath.get(path); const tk = normalizeVideoTitleKey(title);
    const candidates = sim?.simulatedRvtr ? [sim.simulatedRvtr] : [];
    const titleCandidates = sim?.simulatedIdentity ? [sim.simulatedIdentity] : [];
    const distinct = /\b(remix|extended mix|radio edit|radio version|acoustic|re-?record|rerecord|duet|cover|karaoke|clean|dirty)\b/i.test(title);
    const alternate = /\b(live aid|live|concert|performance|television|tv show|alternate video|music video)\b/i.test(title);
    const noise = /\b(official( music)?( video| audio)?|lyric video|hd|hq|4k|uhd|remastered|remaster|vevo|youtube|\d{4})\b|[()[\]{},.!?'’:&–—]/i.test(title);
    let disposition: string, evidence: string, safe = false;
    if (distinct) { disposition = "DISTINCT RECORDING"; evidence = "Recording/version wording may identify a different recording."; }
    else if (candidates.length === 1 && noise) { disposition = "SAFE TITLE NOISE"; evidence = `Existing simulation selected one canonical candidate (${candidates[0]}); deterministic filename/tag noise.`; safe = true; }
    else if (candidates.length === 1 && alternate) { disposition = "SAME SONG — ALTERNATE MEDIA"; evidence = `Existing simulation selected one canonical candidate (${candidates[0]}); alternate-media wording.`; safe = true; }
    else if (candidates.length === 1) { disposition = "HUMAN REVIEW REQUIRED"; evidence = `Existing simulation selected one candidate (${candidates[0]}), but no safe disposition signal.`; }
    else if (titleCandidates.length > 0) { disposition = "ARTIST CONFLICT"; evidence = "Simulation found a title identity but no selected RVTR candidate for this row."; }
    else { disposition = "NO CANONICAL CANDIDATE"; evidence = "No canonical candidate selected by the existing simulation."; }
    return { path, artist, title, rvtr, disposition, evidence, safe, count: candidates.length };
  });
  const header = "VirtualDJ file path,Artist,Title,proposed RVTR,candidate count,disposition,exact evidence,safe-to-auto-assign";
  const csv = (subset: Row[]) => [header, ...subset.map((r) => [r.path,r.artist,r.title,r.rvtr,r.count,r.disposition,r.evidence,r.safe].map(esc).join(","))].join("\n") + "\n";
  await writeFile(join(OUT, "exclusive-dispositions.csv"), csv(rows));
  const files: Record<string,string> = { "SAFE TITLE NOISE":"safe-title-noise.csv", "SAME SONG — ALTERNATE MEDIA":"same-song-alternate-media.csv", "DISTINCT RECORDING":"distinct-recording.csv", "MULTIPLE RVTR CANDIDATES":"multiple-rvtr-candidates.csv", "ARTIST CONFLICT":"artist-conflicts.csv", "NO CANONICAL CANDIDATE":"no-canonical-candidate.csv", "HUMAN REVIEW REQUIRED":"human-review-required.csv" };
  for (const [d, file] of Object.entries(files)) await writeFile(join(OUT, file), csv(rows.filter((r) => r.disposition === d)));
  const counts = Object.fromEntries(Object.keys(files).map((d) => [d, rows.filter((r) => r.disposition === d).length]));
  const summary = `# VirtualDJ → RVTR Rematch Phase 3\n\nRead-only analysis of the original Phase 1 review queue. The 4,864 Phase 1 automatic matches were not reprocessed or changed. No XML or database writes occurred.\n\nOriginal review records: ${rows.length}\nDisposition total: ${Object.values(counts).reduce((a,b)=>a+b,0)}\nAdditional safe automatic candidates: ${rows.filter((r)=>r.safe).length}\n\n| Disposition | Count |\n|---|---:|\n${Object.entries(counts).map(([d,n])=>`| ${d} | ${n} |`).join("\n")}\n\nRecommendation: only the SAFE TITLE NOISE and SAME SONG — ALTERNATE MEDIA rows marked true should be considered for a separately approved write-back; retain all others for review.\n`;
  await writeFile(join(OUT, "summary.md"), summary);
  console.log(JSON.stringify({ analyzed: rows.length, dispositionTotal: Object.values(counts).reduce((a,b)=>a+b,0), safeAdditional: rows.filter((r)=>r.safe).length, counts }, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
