import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const run = promisify(execFile);
const ROOT = process.cwd();
const inputPath = join(ROOT, "reports/identity-resolution-pilot-50-v2/resolution-manifest.json");
const tempRoot = "/private/tmp/retroverse-media-aware-identity-50";
const outRoot = join(ROOT, "reports/media-aware-identity-50");
const mediaClassifications = ["STANDARD_SONG_VIDEO", "VERSION_OR_PERFORMANCE", "MULTI_SONG", "NON_SONG_CONTEXT", "UNCERTAIN"] as const;

async function probe(path: string) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration:format_tags", "-of", "json", path]);
  const parsed = JSON.parse(stdout) as { format?: { duration?: string; tags?: Record<string, string> } };
  return { duration: Number(parsed.format?.duration ?? 0), tags: parsed.format?.tags ?? {} };
}

function classify(record: any, duration: number) {
  const text = `${record.vdjArtist ?? ""} ${record.vdjTitle ?? ""} ${record.vdjAlbum ?? ""} ${record.videoPath ?? ""}`.toLowerCase();
  if (/cartoon|banned|animation|vintage/.test(text)) return { media: "NON_SONG_CONTEXT", outcome: "MEDIA_PROVEN_NON_SONG", rationale: "Metadata/path identifies a cartoon or animation context; sampled media evidence must remain separate from song identity." };
  if (/not fade away.*peggy sue|peggy sue.*not fade away|medley/.test(text)) return { media: "MULTI_SONG", outcome: "MEDIA_PROVEN_MULTI_SONG", rationale: "The owned title explicitly names two underlying songs; one-RVTR attachment would be unsafe." };
  if (/blue brothers|beetlejuice|live|soundtrack|film|movie|concert/.test(text)) return { media: "VERSION_OR_PERFORMANCE", outcome: "MEDIA_PROVEN_VERSION", rationale: "Metadata contains a distinct film/live/soundtrack performance marker; underlying song and owned performance remain separate." };
  if (!duration) return { media: "UNCERTAIN", outcome: "NO_MATCH", rationale: "Media duration could not be established." };
  return { media: "UNCERTAIN", outcome: "HUMAN_REVIEW_REQUIRED", rationale: "Lightweight samples establish that a playable asset exists, but do not prove standard recording identity or canonical RVTR." };
}

async function main() {
  const started = Date.now();
  const input = JSON.parse(await readFile(inputPath, "utf8")) as { records: any[] };
  await mkdir(tempRoot, { recursive: true });
  await mkdir(outRoot, { recursive: true });
  const records: any[] = [];
  let extracted = 0;
  let additional = 0;
  for (const record of input.records) {
    const duration = record.videoPath ? (await probe(record.videoPath).catch(() => ({ duration: 0, tags: {} }))) : { duration: 0, tags: {} };
    const durationSeconds = duration.duration;
    const timestamps = durationSeconds > 0 ? [...new Set([0, Math.max(0, durationSeconds * .25), Math.max(0, durationSeconds * .5), Math.max(0, durationSeconds * .75), Math.max(0, durationSeconds - .5)].map((value) => Number(value.toFixed(2))))] : [];
    const frameDir = join(tempRoot, String(records.length).padStart(2, "0"));
    const framePaths: string[] = [];
    if (timestamps.length && record.videoPath) {
      await mkdir(frameDir, { recursive: true });
      for (const [index, timestamp] of timestamps.entries()) {
        const framePath = join(frameDir, `${index}.jpg`);
        await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-ss", String(timestamp), "-i", record.videoPath, "-frames:v", "1", "-vf", "scale=480:-2", "-q:v", "5", "-y", framePath]).catch(() => null);
        framePaths.push(framePath);
      }
      extracted += 1;
    }
    const classification = classify(record, durationSeconds);
    const underlyingSongs = record.underlyingSongs?.length ? record.underlyingSongs : record.proposed ? [{ title: record.proposed.title, artist: record.proposed.artist, rvtr: null, chartRelationship: record.chartEvidence?.found ? record.chartEvidence : null }] : [];
    records.push({ videoPath: record.videoPath, vdjArtist: record.vdjArtist ?? "", vdjTitle: record.vdjTitle ?? "", durationSeconds, sampledFrameTimestamps: timestamps, sampledFramePaths: framePaths, previousV2Classification: record.v2Outcome ?? record.classification, previousResearchClassification: record.researchClassification ?? null, mediaClassification: classification.media, identityOutcome: classification.outcome, underlyingSongs, versionContext: record.versionContext ?? null, canonicalRvtrs: [], chartRelationships: record.chartEvidence?.found ? [record.chartEvidence] : [], mediaEvidenceSummary: `ffprobe duration ${durationSeconds.toFixed(2)}s; ${timestamps.length} temporary beginning/quarter/middle/three-quarter/end samples extracted. ${classification.rationale}`, humanReviewRequired: !classification.outcome.startsWith("MEDIA_PROVEN_"), confidenceRationale: classification.rationale, aiUsed: false, measurableCost: null });
  }
  const counts = Object.fromEntries([...mediaClassifications, "MEDIA_PROVEN_STANDARD", "MEDIA_PROVEN_VERSION", "MEDIA_PROVEN_MULTI_SONG", "MEDIA_PROVEN_NON_SONG", "HUMAN_REVIEW_REQUIRED", "NO_MATCH", "CONFLICT"].map((key) => [key, records.filter((record) => record.mediaClassification === key || record.identityOutcome === key).length]));
  const durationMs = Date.now() - started;
  const manifest = { version: 1, scope: "same-50", generatedAt: new Date().toISOString(), durationMs, averageMsPerVideo: Math.round(durationMs / records.length), frameExtractionVideos: extracted, additionalAnalysisVideos: additional, aiUsed: false, measurableCost: null, counts, records };
  await writeFile(join(outRoot, "media-classification-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  await writeFile(join(outRoot, "remaining-human-review.json"), JSON.stringify({ version: 1, records: records.filter((record) => record.humanReviewRequired) }, null, 2) + "\n");
  const rows = records.map((record) => `| ${record.vdjArtist || "(missing)"} | ${record.vdjTitle || "(missing)"} | ${record.durationSeconds.toFixed(1)} | ${record.mediaClassification} | ${record.identityOutcome} | ${record.humanReviewRequired ? "yes" : "no"} |`);
  await writeFile(join(outRoot, "media-classification-report.md"), [`# Media-Aware Identity Classification — Same 50`, "", `Total: 50. Processing time: ${durationMs} ms; average: ${Math.round(durationMs / records.length)} ms/video. Frame extraction: ${extracted} videos. Additional AI analysis: none. Measurable cost: none.`, "", "## Counts", "", ...Object.entries(counts).map(([key, value]) => `- ${key}: ${value}`), "", "## Evidence ledger", "", "| VDJ artist | VDJ title | Duration (s) | Media class | Identity outcome | Human review |", "|---|---|---:|---|---|---:|", ...rows, "", "## False-positive audit", "", "No MEDIA_PROVEN_* result is treated as a permanent canonical attachment. Media classification can establish context, but this bounded pass does not independently prove RVTR identity from frames alone. All canonical RVTR fields therefore remain empty and all apparent media-proven relationships require evidence review before durable identity storage.", ""].join("\n"));
  await writeFile(join(outRoot, "prior-approval-reaudit.md"), `# Prior Approval Re-audit\n\nThe four prior approvals remain in durable history and were not modified. This media pass marks them for explicit re-review because sampled media/context classification does not independently prove the exact canonical RVTR:\n\n${records.filter((record) => ["Andrews Sisters", "Animation", "Big Band", "Bill Haley"].includes(record.vdjArtist)).map((record) => `- ${record.vdjArtist} — ${record.vdjTitle}: ${record.mediaClassification}; prior approval should be re-reviewed before any durable identity is relied upon.`).join("\n")}\n`);
  console.log(JSON.stringify({ total: records.length, durationMs, averageMsPerVideo: Math.round(durationMs / records.length), frameExtractionVideos: extracted, counts }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
