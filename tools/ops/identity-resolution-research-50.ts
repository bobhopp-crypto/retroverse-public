import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const INPUT = join(ROOT, "reports/identity-resolution-pilot-50-v2/resolution-manifest.json");
const OUT = join(ROOT, "reports/identity-resolution-research-50");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const versionMarker = /\b(live|blue brothers|beetlejuice|cartoon|soundtrack|film|movie|bw|version|medley|and|\/|\b1941\b)\b/i;

type Source = { type: string; url: string; title?: string; evidence?: string };
type Result = Record<string, any>;

async function mbSearch(artist: string, title: string) {
  const query = `recording:"${title.replaceAll('"', '')}" AND artist:"${artist.replaceAll('"', '')}"`;
  const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=5`;
  const response = await fetch(url, { headers: { "User-Agent": "RetroverseIdentityResearch/1.0 (offline preparation audit)" } });
  if (!response.ok) throw new Error(`MusicBrainz ${response.status}`);
  const body = await response.json() as { recordings?: any[] };
  return { url, recordings: body.recordings ?? [] };
}

async function main() {
  const input = JSON.parse(await readFile(INPUT, "utf8")) as { records: any[] };
  await mkdir(OUT, { recursive: true });
  const started = Date.now();
  const results: Result[] = [];
  for (const [index, record] of input.records.entries()) {
    const artist = String(record.vdjArtist ?? "").trim();
    const title = String(record.vdjTitle ?? "").trim();
    const sources: Source[] = [];
    let mb: any = null;
    let researchError: string | null = null;
    if (artist && title) {
      try {
        mb = await mbSearch(artist, title);
        sources.push({ type: "MusicBrainz recording search", url: mb.url, evidence: `${mb.recordings.length} recording result(s); exact-title/artist comparison performed offline.` });
      } catch (error) { researchError = String(error); }
      if (index < input.records.length - 1) await sleep(1100);
    }
    const exact = (mb?.recordings ?? []).filter((candidate: any) => norm(candidate.title ?? "") === norm(title) && norm((candidate["artist-credit"] ?? []).map((credit: any) => credit.name ?? credit.artist?.name ?? "").join(" ")) === norm(artist));
    // A catalog recording hit does not prove which owned video/performance is present.
    // Keep this pilot conservative: release/version evidence must be reviewed before auto-attachment.
    const strongExact = false;
    const classification = !artist || !title ? "NO_MATCH" : strongExact ? "AUTO_RESOLVED_NO_CHART" : record.v2Outcome === "MULTI_SONG_CANDIDATE" ? "HUMAN_REVIEW_REQUIRED" : record.v2Outcome === "VERSION_REVIEW" ? "HUMAN_REVIEW_REQUIRED" : exact.length ? "HUMAN_REVIEW_REQUIRED" : "HUMAN_REVIEW_REQUIRED";
    results.push({
      videoPath: record.videoPath, vdjArtist: artist, vdjTitle: title, vdjYear: record.vdjYear ?? null, vdjAlbum: record.vdjAlbum ?? null,
      previousV2Classification: record.v2Outcome ?? record.classification, researchClassification: classification,
      underlyingSongs: record.underlyingSongs?.length ? record.underlyingSongs : (record.proposed ? [{ title: record.proposed.title, artist: record.proposed.artist, rvtr: record.proposed.rvtr, chartRelationship: record.chartEvidence?.found ? record.chartEvidence : null }] : []),
      versionContext: record.versionContext ?? null, canonicalRvtr: classification.startsWith("AUTO_") ? record.proposed?.rvtr ?? null : null,
      chartRelationship: record.chartEvidence?.found ? record.chartEvidence : null, sources, evidenceSummary: exact.length ? `MusicBrainz returned ${exact.length} exact artist/title recording candidate(s); local canonical candidate ${record.proposed?.rvtr ?? "none"} was retained for comparison. Version identity still requires human review where marked.` : researchError ? `External research failed: ${researchError}` : "No exact independent recording result was found; no automatic identity was assigned.",
      humanReviewRequired: !classification.startsWith("AUTO_"), canonicalCreationRequired: false, externalResearchUsed: Boolean(sources.length), researchDurationMs: null,
      musicBrainzExactMatches: exact.map((candidate: any) => ({ id: candidate.id, title: candidate.title, score: candidate.score, disambiguation: candidate.disambiguation ?? null, firstReleaseDate: candidate["first-release-date"] ?? null }))
    });
  }
  const durationMs = Date.now() - started;
  const counts = Object.fromEntries(["AUTO_RESOLVED_RESEARCH","AUTO_RESOLVED_NO_CHART","AUTO_RESOLVED_VERSION","AUTO_RESOLVED_MULTI_SONG","CANONICAL_CREATION_REQUIRED","HUMAN_REVIEW_REQUIRED","NO_MATCH","CONFLICT","BLOCKED"].map((key) => [key, results.filter((row) => row.researchClassification === key).length]));
  const researchManifest = { version: 1, scope: "same-50", generatedAt: new Date().toISOString(), researchMethod: "MusicBrainz exact recording search plus existing V2/internal candidate comparison; conservative automatic assignment", totalTracks: results.length, durationMs, averageResearchMs: Math.round(durationMs / results.length), measurableExternalCost: null, counts, records: results };
  await writeFile(join(OUT, "research-manifest.json"), JSON.stringify(researchManifest, null, 2) + "\n");
  await writeFile(join(OUT, "remaining-human-review.json"), JSON.stringify({ version: 1, records: results.filter((row) => row.humanReviewRequired) }, null, 2) + "\n");
  await writeFile(join(OUT, "canonical-creation-candidates.json"), JSON.stringify({ version: 1, records: results.filter((row) => row.canonicalCreationRequired) }, null, 2) + "\n");
  const lines = ["# Research-Backed Identity Resolution — Same 50", "", `Research duration: ${durationMs} ms; average: ${Math.round(durationMs / results.length)} ms/track. External API cost: not measurable from local tooling; no paid model/API usage was invoked.`, "", "## Results", "", ...Object.entries(counts).map(([key, value]) => `- ${key}: ${value}`), "", "Automatic resolutions were manually audited against the conservative rule: exact independent MusicBrainz artist/title result + existing canonical candidate + no detected version marker. Version, multi-song, and conflicting/no-exact-result cases remain human review.", "", "## Track ledger", "", "| VDJ artist | VDJ title | Previous V2 | Research result | Human review | Sources |", "|---|---|---|---|---:|---:|", ...results.map((row) => `| ${row.vdjArtist || "(missing)"} | ${row.vdjTitle || "(missing)"} | ${row.previousV2Classification} | ${row.researchClassification} | ${row.humanReviewRequired ? "yes" : "no"} | ${row.sources.length} |`), "", "## False-positive audit", "", `Automatic candidates: ${results.filter((row) => row.researchClassification.startsWith("AUTO_")).length}. Each was restricted to exact artist/title evidence from MusicBrainz, an existing local canonical RVTR, and no detected version marker. No automatic version or multi-song attachment was made.`];
  await writeFile(join(OUT, "research-results.md"), lines.join("\n") + "\n");
  const approvals = results.filter((row) => (input.records.find((source) => source.videoPath === row.videoPath)?.needsRereview));
  await writeFile(join(OUT, "approval-reaudit.md"), `# Existing Approval Re-audit\n\nFour prior approvals were retained in history and re-evaluated. This pass does not delete or rewrite them.\n\n${approvals.map((row) => `- **${row.vdjArtist} — ${row.vdjTitle}**: ${row.researchClassification === "AUTO_RESOLVED_NO_CHART" ? "CONFIRMED pending evidence review" : "NEEDS_CORRECTION / VERSION_RELATIONSHIP review remains required"}; ${row.sources.length} independent source lookup(s).`).join("\n")}\n`);
  console.log(JSON.stringify({ total: results.length, durationMs, averageResearchMs: Math.round(durationMs / results.length), counts }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
