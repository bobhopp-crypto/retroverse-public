import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sampleFrames } from "@/lib/ops/issue-generation/sample-frames";

const ROOT = "/Users/bobhopp/DJ MEDIA/VIDEO/";
const INVENTORY = join(process.cwd(), "reports/vdj-library-coverage/inventory.json");
const OUT = join(process.cwd(), "reports/song-preparation-pilot-25");
const ASSET_ROOT = join(process.cwd(), "data/ops/intelligence/research-department");

type Row = Record<string, any>;
function eligible(r: Row) {
  return r.fileExists === true && String(r.vdjPath).toLowerCase().startsWith(ROOT.toLowerCase()) && r.canonicalStatus === "resolved" && ["READY", "PARTIAL"].includes(r.storyStatus) && r.heroStatus === "VIDEO_AVAILABLE_HERO_NOT_PREPARED";
}
function priority(a: Row, b: Row) {
  return (b.playCount ?? 0) - (a.playCount ?? 0) || (b.chartJourneyStatus === "AVAILABLE" ? 1 : 0) - (a.chartJourneyStatus === "AVAILABLE" ? 1 : 0) || (a.storyStatus === "READY" ? -1 : 1) - (b.storyStatus === "READY" ? -1 : 1);
}
async function main() {
  const inventory = JSON.parse(await readFile(INVENTORY, "utf8"));
  const selected = inventory.records.filter(eligible).sort(priority).slice(0, 25);
  if (selected.length !== 25) throw new Error(`Expected 25 eligible tracks, found ${selected.length}`);
  await mkdir(OUT, { recursive: true });
  const manifest: Row[] = [];
  const started = Date.now();
  for (const row of selected) {
    const scratch = join(OUT, "candidates", row.rvtr);
    const sampled = await sampleFrames(row.vdjPath, scratch);
    const chosen = sampled.frames[0];
    if (!chosen) {
      manifest.push({ rvtr: row.rvtr, vdjPath: row.vdjPath, artist: row.vdjArtist, title: row.vdjTitle, preparationStatus: "FAILED_NO_USABLE_FRAME", frameSelection: sampled.selection });
      continue;
    }
    const assetDir = join(ASSET_ROOT, row.rvtr, "visual-assets");
    await mkdir(assetDir, { recursive: true });
    const heroPath = join(assetDir, "hero-video.jpg");
    await copyFile(chosen, heroPath);
    const selectedTimestamp = sampled.selection.selectedTimestamps[0] ?? null;
    const metadata = { sourceVideo: row.vdjPath, selectedSeconds: selectedTimestamp, candidateCount: sampled.selection.candidateCount, selection: sampled.selection.selectedReasons[0] ?? "quality-ranked candidate", preparedAt: new Date().toISOString(), sourceType: "prepared-video-frame" };
    await writeFile(join(assetDir, "hero-video.json"), JSON.stringify(metadata, null, 2) + "\n");
    manifest.push({ rvtr: row.rvtr, vdjPath: row.vdjPath, artist: row.vdjArtist, title: row.vdjTitle, selectedHeroPath: heroPath, selectedFrameTimestamp: selectedTimestamp, heroSourceType: "prepared-video-frame", storyStatus: row.storyStatus, storySource: row.storyStatus === "READY" ? "existing-song-package" : "existing-package-material", displayYear: row.displayYear, displayYearSource: row.displayYearSource, chartJourneyStatus: row.chartJourneyStatus, preparationStatus: "READY", preparationDate: new Date().toISOString(), frameSelection: sampled.selection });
  }
  const finished = Date.now();
  const output = { version: 1, pilot: "song-preparation-25", generatedAt: new Date().toISOString(), batchSize: 25, processingSeconds: (finished - started) / 1000, averageSecondsPerSong: (finished - started) / 1000 / 25, records: manifest };
  await writeFile(join(OUT, "preparation-manifest.json"), JSON.stringify(output, null, 2) + "\n");
  console.log(JSON.stringify({ selected: selected.length, prepared: manifest.filter((r) => r.preparationStatus === "READY").length, failed: manifest.filter((r) => r.preparationStatus !== "READY").length, averageSecondsPerSong: output.averageSecondsPerSong }, null, 2));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
