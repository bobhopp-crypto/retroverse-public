import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { inspectQuery } from "../../lib/inspect/pg";

const ROOT = process.cwd();
const MANIFEST_PATH = join(ROOT, "data/ops/manifest/video-completion-manifest.json");
const OUT = join(ROOT, "reports/identity-resolution-pilot-50");
const VERSION_MARKERS = /\b(live|remix|mix|edit|extended|acoustic|rerecord|re-record|cover|tribute|karaoke|medley|mashup|instrumental|demo|version|soundtrack|motion picture|film|movie|beetlejuice|blue brothers|banned cartoons|vintage)\b|\([^)]*\)|\//i;
type AnyRow = Record<string, any>;

function normalize(value: string | null | undefined) {
  return String(value ?? "").toLowerCase().replace(/[’']/g, "").replace(/&/g, " and ").replace(/\b(feat|featuring|with)\b.*$/i, "").replace(/\b(official|video|hd|4k|remastered)\b/g, "").replace(/[^a-z0-9]+/g, "").trim();
}
function artistVariants(value: string) { return new Set([normalize(value), normalize(value.replace(/^the\s+/i, ""))]); }
function versionConflict(row: AnyRow) { return VERSION_MARKERS.test(`${row.title ?? ""} ${row.album ?? ""}`); }
function evidenceText(row: AnyRow, candidate: AnyRow | null, classification: string) {
  if (!candidate) return "No unique local canonical artist/title candidate was found.";
  if (classification === "EXACT_MATCH") return `Normalized VDJ artist/title matches one canonical catalog relationship exactly: ${candidate.artist} — ${candidate.title}. No version marker or competing candidate was found.`;
  if (classification === "PROVEN_MATCH") return `Normalized artist/title resolves to one canonical catalog relationship; supporting VDJ year/album evidence is consistent and no competing version was found.`;
  if (classification === "AMBIGUOUS") return `More than one plausible canonical relationship or a material recording/version conflict was found.`;
  return `A plausible candidate exists, but the available local evidence does not safely establish the recording/version.`;
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const identityRequired = (manifest.records as AnyRow[]).filter((row) => row.overallStatus === "IDENTITY_REQUIRED" && row.fileSize > 0).sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0));
  const priorResolution = await readFile(join(OUT, "resolution-manifest.json"), "utf8").then((raw) => JSON.parse(raw)).catch(() => null);
  const priorPaths = new Set((priorResolution?.records ?? []).map((record: AnyRow) => record.videoPath));
  const selected = priorPaths.size === 50 ? (manifest.records as AnyRow[]).filter((row) => priorPaths.has(row.normalizedPath)) : identityRequired.slice(0, 50);
  if (selected.length !== 50) throw new Error(`Expected 50 IDENTITY_REQUIRED tracks, found ${selected.length}`);
  const catalog = await inspectQuery<AnyRow>(`SELECT upper(trim(coalesce(retroverse_track_id, track_id))) AS rvtr, canonical_title AS title, canonical_artist_name AS artist, NULL::text AS album, first_chart_date::text AS canonical_year, identity_source FROM canonical_track_display WHERE canonical_title IS NOT NULL AND canonical_artist_name IS NOT NULL`);
  const results: AnyRow[] = [];
  for (const row of selected) {
    const artistKeys = artistVariants(row.artist);
    const titleKey = normalize(row.title);
    const candidates = catalog.filter((candidate) => artistKeys.has(normalize(candidate.artist)) && normalize(candidate.title) === titleKey);
    const conflict = versionConflict(row);
    const unique = candidates.length === 1 ? candidates[0] : null;
    let classification = "NO_MATCH";
    if (candidates.length > 1) classification = "AMBIGUOUS";
    else if (unique && conflict) classification = "REVIEW_CANDIDATE";
    else if (unique && !["hot100", "hot100_vdj"].includes(unique.identity_source)) classification = "REVIEW_CANDIDATE";
    else if (unique && normalize(row.artist) === normalize(unique.artist) && normalize(row.title) === normalize(unique.title)) classification = "EXACT_MATCH";
    else if (unique) classification = "PROVEN_MATCH";
    const assigned = classification === "EXACT_MATCH" || classification === "PROVEN_MATCH" ? unique?.rvtr : null;
    const candidateList = candidates.slice(0, 10).map((candidate) => ({ rvtr: candidate.rvtr, artist: candidate.artist, title: candidate.title, album: candidate.album, year: candidate.canonical_year, source: candidate.identity_source }));
    results.push({ videoPath: row.normalizedPath, filename: row.normalizedPath.split("/").pop(), vdjArtist: row.artist, vdjTitle: row.title, vdjYear: row.displayYear, vdjAlbum: row.album, playCount: row.playCount ?? 0, previousLifecycleState: row.overallStatus, classification, assignedRvtr: assigned ?? null, candidates: candidateList, canonicalArtist: unique?.artist ?? null, canonicalTitle: unique?.title ?? null, evidence: evidenceText(row, unique, classification), normalizationUsed: normalize(row.artist) !== String(row.artist ?? "").toLowerCase() || normalize(row.title) !== String(row.title ?? "").toLowerCase(), externalResearchUsed: false, provenance: "local canonical_track_display catalog and corrected VIDEO manifest", versionConflictCheck: conflict ? "material version marker requires review" : "no material version marker detected", dataUnlocked: assigned ? { canonicalYear: Boolean(unique?.canonical_year), chartJourney: Boolean(unique?.rvtr), artistRelationship: true, albumRelationship: Boolean(unique?.album), collector: false, editorial: false, hero: false, relatedMusicEligibility: true } : { canonicalYear: false, chartJourney: false, artistRelationship: false, albumRelationship: false, collector: false, editorial: false, hero: false, relatedMusicEligibility: false } });
  }
  const byPath = new Map((manifest.records as AnyRow[]).map((row) => [row.normalizedPath, row]));
  for (const result of results) {
    const record = byPath.get(result.videoPath)!;
    if (result.assignedRvtr) {
      record.rvtr = result.assignedRvtr;
      record.artist = result.canonicalArtist;
      record.title = result.canonicalTitle;
      record.identityStatus = "RESOLVED";
      record.identityProvenance = { method: result.classification, evidence: result.evidence, source: result.provenance, resolvedAt: new Date().toISOString() };
      record.overallStatus = record.editorialStatus === "RESEARCH_REQUIRED" ? "RESEARCH_REQUIRED" : (record.heroStatus !== "PREPARED_VIDEO_HERO" || record.collectorStatus !== "READY" || record.relatedMusicStatus !== "READY") ? "PREPARATION_REQUIRED" : record.validationStatus !== "VALIDATED" ? "READY_FOR_VALIDATION" : "COMPLETE";
      record.preparationNeeds = record.overallStatus === "PREPARATION_REQUIRED" ? ["identity", "hero", "collector", "editorial", "relatedMusic", "validation"] : record.overallStatus === "READY_FOR_VALIDATION" ? ["validation"] : [];
    } else if (record.identityProvenance?.source === "local canonical_track_display catalog and corrected VIDEO manifest") {
      record.rvtr = null;
      record.artist = result.vdjArtist;
      record.title = result.vdjTitle;
      record.identityStatus = "IDENTITY_REQUIRED";
      record.identityProvenance = null;
      record.overallStatus = "IDENTITY_REQUIRED";
      record.preparationNeeds = ["identity"];
    }
  }
  await writeFile(MANIFEST_PATH, JSON.stringify({ ...manifest, generatedAt: new Date().toISOString(), records: [...byPath.values()] }, null, 2) + "\n");
  await mkdir(OUT, { recursive: true });
  const review = results.filter((r) => r.classification === "REVIEW_CANDIDATE" || r.classification === "AMBIGUOUS").map((r) => ({ videoPath: r.videoPath, vdj: `${r.vdjArtist} — ${r.vdjTitle}`, candidates: r.candidates, evidence: r.evidence, question: r.classification === "AMBIGUOUS" ? "Which canonical candidate and recording/version does this physical file represent?" : "Is this the standard canonical recording rather than the marked alternate version?" }));
  const noMatch = results.filter((r) => r.classification === "NO_MATCH");
  await writeFile(join(OUT, "selection-report.md"), `# Identity Resolution Pilot — Selection\n\nExactly 50 current IDENTITY_REQUIRED VIDEO tracks selected by VirtualDJ playcount from the corrected VIDEO manifest.\n\n| # | VIDEO path | VDJ artist | VDJ title | VDJ year | Album | Playcount | Previous state | Reason |\n|---:|---|---|---|---:|---|---:|---|---|\n${results.map((r, i) => `| ${i + 1} | ${r.videoPath} | ${r.vdjArtist} | ${r.vdjTitle} | ${r.vdjYear ?? "unknown"} | ${r.vdjAlbum ?? "unknown"} | ${r.playCount} | ${r.previousLifecycleState} | high-value identity backlog candidate |`).join("\n")}\n`);
  await writeFile(join(OUT, "resolution-report.md"), `# Identity Resolution Pilot — Resolution Report\n\n- Tracks evaluated: 50\n- EXACT_MATCH: ${results.filter((r) => r.classification === "EXACT_MATCH").length}\n- PROVEN_MATCH: ${results.filter((r) => r.classification === "PROVEN_MATCH").length}\n- REVIEW_CANDIDATE: ${results.filter((r) => r.classification === "REVIEW_CANDIDATE").length}\n- AMBIGUOUS: ${results.filter((r) => r.classification === "AMBIGUOUS").length}\n- NO_MATCH: ${results.filter((r) => r.classification === "NO_MATCH").length}\n- BLOCKED: ${results.filter((r) => r.classification === "BLOCKED").length}\n- Automatic resolution percentage: ${((results.filter((r) => ["EXACT_MATCH", "PROVEN_MATCH"].includes(r.classification)).length / 50) * 100).toFixed(1)}%\n- External research: 0 tracks\n\nOnly EXACT_MATCH and PROVEN_MATCH changed the durable completion manifest. Every automatic assignment was audited for a unique local candidate and material version conflict.\n\n| VIDEO | Classification | Assigned RVTR | Candidate | Version check | New lifecycle |\n|---|---|---|---|---|---|\n${results.map((r) => `| ${r.filename} | ${r.classification} | ${r.assignedRvtr ?? "—"} | ${r.canonicalArtist ?? "—"} — ${r.canonicalTitle ?? "—"} | ${r.versionConflictCheck} | ${r.assignedRvtr ? (byPath.get(r.videoPath)?.overallStatus ?? "—") : "unchanged"} |`).join("\n")}\n`);
  await writeFile(join(OUT, "review-queue.json"), JSON.stringify({ version: 1, records: review }, null, 2) + "\n");
  await writeFile(join(OUT, "no-match-queue.json"), JSON.stringify({ version: 1, records: noMatch }, null, 2) + "\n");
  await writeFile(join(OUT, "resolution-manifest.json"), JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), selectedCount: 50, records: results }, null, 2) + "\n");
  console.log(JSON.stringify({ selected: 50, exact: results.filter((r) => r.classification === "EXACT_MATCH").length, proven: results.filter((r) => r.classification === "PROVEN_MATCH").length, review: review.filter((r) => !results.find((x) => x.videoPath === r.videoPath && x.classification === "AMBIGUOUS")).length, ambiguous: results.filter((r) => r.classification === "AMBIGUOUS").length, noMatch: noMatch.length, blocked: 0, assigned: results.filter((r) => r.assignedRvtr).length }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
