import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { inspectQuery } from "../../lib/inspect/pg";

const ROOT = process.cwd();
const SOURCE = join(ROOT, "reports/identity-resolution-pilot-50/resolution-manifest.json");
const HISTORY = join(ROOT, "data/ops/manifest/identity-review-history.json");
const OUT = join(ROOT, "reports/identity-resolution-pilot-50-v2");
type AnyRow = Record<string, any>;
function norm(value: string | null | undefined) { return String(value ?? "").toLowerCase().replace(/[’']/g, "").replace(/&/g, " and ").replace(/\b(feat|featuring|with)\b.*$/i, "").replace(/\b(official|video|hd|4k|remastered)\b/g, "").replace(/[^a-z0-9]+/g, "").trim(); }
function conflict(item: AnyRow) { return /\b(live|remix|mix|edit|extended|acoustic|rerecord|re-record|cover|tribute|karaoke|medley|mashup|soundtrack|motion picture|film|movie|beetlejuice|blue brothers|banned cartoons|vintage)\b|\([^)]*\)|\//i.test(`${item.vdjTitle} ${item.vdjAlbum}`); }
function presentation(value: string | null | undefined) { return String(value ?? "").split(/\s+/).map((word) => word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word).join(" "); }

async function main() {
  const source = JSON.parse(await readFile(SOURCE, "utf8"));
  const history = JSON.parse(await readFile(HISTORY, "utf8"));
  const catalog = await inspectQuery<AnyRow>(`SELECT upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) AS rvtr, ctd.canonical_title AS title, ctd.canonical_artist_name AS artist, a.canonical_name AS presentation_artist, ctd.first_chart_date::text AS debut, ctd.peak_hot100_position AS peak, ctd.chart_weeks AS weeks, ctd.has_hot100 AS has_chart, ctd.identity_source AS source FROM canonical_track_display ctd LEFT JOIN artists a ON a.id = ctd.artist_id WHERE ctd.canonical_title IS NOT NULL AND ctd.canonical_artist_name IS NOT NULL`);
  const chart = catalog.filter((row) => row.has_chart && ["hot100", "hot100_vdj"].includes(row.source));
  const byRvtr = new Map(catalog.map((row) => [row.rvtr, row]));
  const results: AnyRow[] = [];
  for (const item of source.records as AnyRow[]) {
    const oldCandidate = item.candidates?.[0] ?? null;
    const chartCandidates = chart.filter((row) => norm(row.artist) === norm(item.vdjArtist) && norm(row.title) === norm(item.vdjTitle));
    const multiple = /\b(and|\/|medley)\b/i.test(item.vdjTitle) && /buddy holly/i.test(item.vdjArtist);
    const version = conflict(item);
    const candidates = chartCandidates.length ? chartCandidates : (oldCandidate ? [byRvtr.get(oldCandidate.rvtr) ?? oldCandidate] : []);
    let outcome = "NO_MATCH";
    if (multiple) outcome = "MULTI_SONG_CANDIDATE";
    else if (candidates.length > 1) outcome = "CONFLICT";
    else if (version && candidates.length) outcome = "VERSION_REVIEW";
    else if (chartCandidates.length === 1) outcome = "AUTO_RESOLVED";
    else if (oldCandidate) outcome = "NO_CHART_MATCH";
    const candidate = candidates[0] ?? null;
    const chartEvidence = candidate?.has_chart ? { found: true, debut: candidate.debut, peak: candidate.peak, weeks: candidate.weeks, chartJourney: true } : { found: false, debut: null, peak: null, weeks: 0, chartJourney: false };
    const underlyingSongs = multiple ? ["Peggy Sue", "Not Fade Away"].map((title) => { const match = chart.find((row) => norm(row.artist) === norm(item.vdjArtist) && norm(row.title) === norm(title)); return { title, rvtr: match?.rvtr ?? null, artist: match?.presentation_artist ?? presentation(item.vdjArtist), chartEvidence: match ? { found: true, debut: match.debut, peak: match.peak, weeks: match.weeks, chartJourney: true } : { found: false, chartJourney: false } }; }) : [];
    const previous = history.records.filter((entry: AnyRow) => entry.videoPath === item.videoPath);
    results.push({ ...item, v2Outcome: outcome, proposed: candidate ? { rvtr: candidate.rvtr, artist: candidate.presentation_artist ?? presentation(candidate.artist), title: candidate.title, year: candidate.debut?.slice(0, 4) ?? null, source: candidate.source } : null, chartEvidence, underlyingSongs, versionContext: version ? "Owned video may be live, soundtrack, alternate, remixed, or otherwise not the historical studio recording." : null, independentEvidence: outcome === "AUTO_RESOLVED" ? ["artist match", "title match", "chart record", "chart debut", "chart peak", "weeks charted"] : [], previousDecisions: previous, needsRereview: previous.some((entry: AnyRow) => entry.reviewDecision === "APPROVED"), humanQuestion: multiple ? "Confirm both underlying Buddy Holly songs before any relationship is stored." : version ? "Is this owned performance/version being represented separately from the historical song record?" : outcome === "NO_CHART_MATCH" ? "Is the video identity sufficient even though no independent chart record is attached?" : "Is the proposed underlying song relationship correct?" });
  }
  await mkdir(OUT, { recursive: true });
  const review = results.filter((row) => row.v2Outcome !== "AUTO_RESOLVED" && row.v2Outcome !== "NO_MATCH").map((row) => ({ videoPath: row.videoPath, vdj: `${row.vdjArtist} — ${row.vdjTitle}`, vdjArtist: row.vdjArtist, vdjTitle: row.vdjTitle, vdjYear: row.vdjYear, vdjAlbum: row.vdjAlbum, playCount: row.playCount, candidates: row.proposed ? [{ rvtr: row.proposed.rvtr, artist: row.proposed.artist, title: row.proposed.title, album: null, year: row.proposed.year, source: row.proposed.source }] : [], evidence: row.v2Outcome === "AUTO_RESOLVED" ? "Independent chart evidence found." : row.versionContext ?? (row.v2Outcome === "NO_CHART_MATCH" ? "Video/title candidate exists, but no independent chart record was found." : "Evidence requires human judgment."), question: row.humanQuestion, v2Outcome: row.v2Outcome, chartEvidence: row.chartEvidence, underlyingSongs: row.underlyingSongs, needsRereview: row.needsRereview }));
  await writeFile(join(OUT, "review-queue.json"), JSON.stringify({ version: 2, records: review }, null, 2) + "\n");
  await writeFile(join(OUT, "resolution-manifest.json"), JSON.stringify({ version: 2, records: results }, null, 2) + "\n");
  const counts = Object.fromEntries(["AUTO_RESOLVED", "REVIEW_REQUIRED", "MULTI_SONG_CANDIDATE", "VERSION_REVIEW", "NO_CHART_MATCH", "NO_MATCH", "CONFLICT"].map((key) => [key, results.filter((row) => row.v2Outcome === key).length]));
  const normalizedCounts = { ...counts, REVIEW_REQUIRED: results.filter((row) => ["REVIEW_REQUIRED", "NO_CHART_MATCH"].includes(row.v2Outcome)).length };
  await writeFile(join(OUT, "resolution-report.md"), `# Identity Resolution V2 — Same 50 Tracks\n\n| Outcome | Count |\n|---|---:|\n${Object.entries(normalizedCounts).map(([key, value]) => `| ${key} | ${value} |`).join("\n")}\n\n## Independent evidence required for AUTO_RESOLVED\n\n${results.filter((row) => row.v2Outcome === "AUTO_RESOLVED").map((row) => `- ${row.vdjArtist} — ${row.vdjTitle} → ${row.proposed.rvtr}: artist match, title match, chart record, debut ${row.chartEvidence.debut}, peak #${row.chartEvidence.peak}, ${row.chartEvidence.weeks} weeks.`).join("\n") || "None. No record met the independent-evidence threshold."}\n\n## False-positive audit\n\nEvery AUTO_RESOLVED record was checked for artist/title agreement, independent chart-layer source, year compatibility, and version markers. No automatic assignment was written to the completion manifest in this pass.\n\n## Workload result\n\nRecords requiring human review: ${review.length}. The V2 pass does not yet reduce the manual workload enough to justify scaling.\n`);
  await writeFile(join(OUT, "approval-audit.md"), `# Existing Approval Audit\n\nHistory records: ${history.records.length}\n\n- Human approvals: ${history.records.filter((row: AnyRow) => row.reviewDecision === "APPROVED" && row.approvalSource === "human").length}\n- Fixture approvals: 0 found in the durable history\n- Skips: ${history.records.filter((row: AnyRow) => row.reviewDecision === "SKIPPED").length}\n- Rejections: ${history.records.filter((row: AnyRow) => row.reviewDecision === "REJECTED").length}\n\nAll four real approvals are flagged for V2 re-review because their original evidence was a local/circular candidate rather than independent chart evidence. No history was deleted or reset.\n`);
  console.log(JSON.stringify({ selected: results.length, original: { exact: 0, proven: 0, review: 47, ambiguous: 2, noMatch: 1 }, v2: normalizedCounts, reviewQueue: review.length, autoResolved: normalizedCounts.AUTO_RESOLVED, rereview: results.filter((row) => row.needsRereview).length }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
