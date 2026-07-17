require("./finance/preload-server-only.cjs");

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runMatchEngineSimulation, type SimulationRow } from "../packages/shared/lib/ops/match-engine-simulation";

const OUT = join(import.meta.dirname, "../reports/vdj-rvtr-rematch-phase2");
const esc = (value: unknown) => { const raw = value == null ? "" : String(value); return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw; };

function classify(row: SimulationRow): string {
  const title = row.fileTitle;
  if (/\b(karaoke|instrumental)\b/i.test(title)) return "Karaoke";
  if (/\b(live|concert|unplugged)\b/i.test(title)) return "Live";
  if (/\b(remix|mix|version)\b/i.test(title)) return "Remix";
  if (/\b(radio\s*(edit|version)|edit)\b/i.test(title)) return "Radio edit";
  if (/\b(extended|12["″]?|club)\b/i.test(title)) return "Extended mix";
  if (/\b(clean|dirty)\b/i.test(title)) return "Clean/Dirty";
  if (/\b(feat\.?|featuring|ft\.?)\b/i.test(title)) return "feat./featuring";
  if (/[()\[\]{}]/.test(title)) return "Parentheses";
  if (/[&'’–—,:!?./]/.test(title)) return "Title punctuation";
  if (row.simulatedRvtr && row.simulatedConfidence >= 80) return "Version differences";
  if (row.simulatedIdentity && !/^hot100(_vdj)?$/.test(row.simulatedIdentity)) return "No Billboard candidate";
  if (row.fileArtist.trim().length < 2) return "Artist normalization";
  return row.simulatedRvtr ? "Spelling variation" : "Other";
}

function reviewReason(row: SimulationRow): string {
  if (!row.simulatedRvtr) return "No safe canonical candidate";
  if (row.simulatedConfidence < 80) return "Below 80% precision threshold";
  if (row.simulatedConfidence < 95) return `Candidate confidence ${row.simulatedConfidence}%`; 
  return "Candidate requires review due to conflicting evidence";
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = await runMatchEngineSimulation();
  const unresolved = report.allRows.filter((row) => !row.currentRvtr);
  const accepted = unresolved.filter((row) => row.simulatedRvtr && row.simulatedConfidence >= 95);
  const review = unresolved.filter((row) => row.simulatedRvtr && row.simulatedConfidence < 95);
  const noMatch = unresolved.filter((row) => !row.simulatedRvtr);
  const categories = new Map<string, number>();
  for (const row of unresolved) categories.set(classify(row), (categories.get(classify(row)) ?? 0) + 1);
  const confidence = (rows: SimulationRow[]) => rows.length ? Math.round(rows.reduce((sum, row) => sum + row.simulatedConfidence, 0) / rows.length) : 0;
  const buckets = {
    "100%": accepted.filter((r) => r.simulatedConfidence === 100).length,
    "99%": accepted.filter((r) => r.simulatedConfidence === 99).length,
    "95–98%": accepted.filter((r) => r.simulatedConfidence >= 95 && r.simulatedConfidence <= 98).length,
    "90–94%": review.filter((r) => r.simulatedConfidence >= 90).length,
    "Below 90%": unresolved.filter((r) => r.simulatedConfidence < 90).length,
  };
  const classificationCsv = ["File path,Artist,Title,Suggested RVTR,Confidence,Primary reason", ...unresolved.map((row) => [row.filePath, row.fileArtist, row.fileTitle, row.simulatedRvtr ?? "", row.simulatedConfidence, classify(row)].map(esc).join(","))].join("\n") + "\n";
  const reviewCsv = ["File path,Artist,Title,Suggested RVTR,Confidence,Reason for review", ...review.map((row) => [row.filePath, row.fileArtist, row.fileTitle, row.simulatedRvtr ?? "", row.simulatedConfidence, reviewReason(row)].map(esc).join(","))].join("\n") + "\n";
  const sampleCsv = ["File path,Artist,Title,Suggested RVTR,Confidence,Reason for review", ...review.slice(0, 100).map((row) => [row.filePath, row.fileArtist, row.fileTitle, row.simulatedRvtr ?? "", row.simulatedConfidence, reviewReason(row)].map(esc).join(","))].join("\n") + "\n";
  await Promise.all([
    writeFile(join(OUT, "failure-classification.csv"), classificationCsv),
    writeFile(join(OUT, "remaining-review-queue.csv"), reviewCsv),
    writeFile(join(OUT, "top-100-review-sample.csv"), sampleCsv),
    writeFile(join(OUT, "simulation.json"), JSON.stringify(report, null, 2)),
  ]);
  const classificationTable = [...categories.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `| ${name} | ${count} |`).join("\n");
  const summary = `# VirtualDJ → RVTR Rematch Phase 2\n\nRead-only analysis. No XML, PostgreSQL, Retroverse, Billboard, album, artwork, or enrichment writes were performed.\n\n## Improvement\n\n| Metric | Count |\n|---|---:|\n| Original automatic matches | 4,864 |\n| New automatic matches after deterministic normalization | ${accepted.length} |\n| Improvement | ${accepted.length - 4864} |\n| Remaining review queue | ${review.length} |\n| Remaining no-match queue | ${noMatch.length} |\n| Average accepted confidence | ${confidence(accepted)}% |\n| Average review confidence | ${confidence(review)}% |\n| Highest rejected confidence | ${review.length ? Math.max(...review.map((row) => row.simulatedConfidence)) : 0}% |\n| Lowest accepted confidence | ${accepted.length ? Math.min(...accepted.map((row) => row.simulatedConfidence)) : 0}% |\n\n## Failure classification\n\n| Primary reason | Count |\n|---|---:|\n${classificationTable}\n\n## Confidence distribution\n\n| Bucket | Count |\n|---|---:|\n| 100% | ${buckets["100%"]} |\n| 99% | ${buckets["99%"]} |\n| 95–98% | ${buckets["95–98%"]} |\n| 90–94% | ${buckets["90–94%"]} |\n| Below 90% | ${buckets["Below 90%"]} |\n\n## Review queue assessment\n\n- Deterministic normalization candidates: ${accepted.length}\n- Alias candidates: Requires targeted alias evidence; not auto-assigned by this run.\n- Track-family candidates: Existing matcher evidence is retained in the review CSV; no new relationship inference was added.\n- Human review required: ${review.length + noMatch.length}\n\n## Recommendation\n\nUse only the ${accepted.length} accepted candidates for a later, separately approved XML write-back. Keep the ${review.length + noMatch.length} remaining records out of the XML until reviewed.\n\nOutputs: failure-classification.csv, remaining-review-queue.csv, top-100-review-sample.csv, and simulation.json.\n`;
  await writeFile(join(OUT, "SUMMARY.md"), summary);
  console.log(JSON.stringify({ originalAutomatic: 4864, newAutomatic: accepted.length, improvement: accepted.length - 4864, review: review.length, noMatch: noMatch.length, categories: Object.fromEntries(categories), averageAccepted: confidence(accepted), averageReview: confidence(review) }, null, 2));
}
main().catch((error) => { console.error(error); process.exit(1); });
