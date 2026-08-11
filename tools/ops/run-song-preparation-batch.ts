import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sampleFrames } from "@/lib/ops/issue-generation/sample-frames";

const ROOT = "/Users/bobhopp/DJ MEDIA/VIDEO/";
const INVENTORY = join(process.cwd(), "reports/vdj-library-coverage/inventory.json");
const OUT = join(process.cwd(), "reports/song-preparation-batch-250");
const ASSET_ROOT = join(process.cwd(), "data/ops/intelligence/research-department");
const LIMIT = 250;

type Row = Record<string, any>;
function eligible(r: Row) {
  return r.fileExists === true && String(r.vdjPath).toLowerCase().startsWith(ROOT.toLowerCase()) && r.canonicalStatus === "resolved" && r.storyStatus === "READY" && r.preparationStatus === "NEEDS_HERO" && r.heroStatus === "VIDEO_AVAILABLE_HERO_NOT_PREPARED";
}
function priority(a: Row, b: Row) {
  return (b.playCount ?? 0) - (a.playCount ?? 0) || (b.chartJourneyStatus === "AVAILABLE" ? 1 : 0) - (a.chartJourneyStatus === "AVAILABLE" ? 1 : 0) || String(a.vdjPath).localeCompare(String(b.vdjPath));
}
async function main() {
  const inventory = JSON.parse(await readFile(INVENTORY, "utf8"));
  const pool = inventory.records.filter(eligible).sort(priority);
  const byRvtr = new Map<string, Row>();
  for (const row of pool) if (!byRvtr.has(row.rvtr)) byRvtr.set(row.rvtr, row);
  const selected = [...byRvtr.values()].slice(0, LIMIT);
  if (selected.length !== LIMIT) throw new Error(`Expected ${LIMIT} eligible unique-RVTR tracks, found ${selected.length}`);
  await mkdir(OUT, { recursive: true });
  const selectionReport = `# Production Hero Batch — ${LIMIT}\n\nGenerated: ${new Date().toISOString()}\nEligibility: existing exact-resolved VIDEO-root files, Story READY, NEEDS_HERO, no prepared video hero.\n\n| # | Artist | Title | RVTR | Playcount | Year | Year source | Story | Chart Journey | Hero | VDJ path |\n|---:|---|---|---|---:|---:|---|---|---|---|---|\n${selected.map((r, i) => `| ${i + 1} | ${r.vdjArtist.replace(/\|/g, "\\|")} | ${r.vdjTitle.replace(/\|/g, "\\|")} | ${r.rvtr} | ${r.playCount ?? 0} | ${r.displayYear ?? "unknown"} | ${r.displayYearSource} | ${r.storyStatus} | ${r.chartJourneyStatus} | ${r.heroStatus} | ${r.vdjPath.replace(/\|/g, "\\|")} |`).join("\n")}\n`;
  await writeFile(join(OUT, "selection-report.md"), selectionReport);
  const started = Date.now();
  const records: Row[] = [];
  for (const row of selected) {
    const scratch = join(OUT, "candidates", row.rvtr);
    const sampled = await sampleFrames(row.vdjPath, scratch);
    const chosen = sampled.frames[0];
    if (!chosen) {
      records.push({ rvtr: row.rvtr, vdjPath: row.vdjPath, artist: row.vdjArtist, title: row.vdjTitle, storyStatus: row.storyStatus, preparationStatus: "FAILED_NO_USABLE_FRAME", frameSelection: sampled.selection });
      continue;
    }
    const assetDir = join(ASSET_ROOT, row.rvtr, "visual-assets");
    await mkdir(assetDir, { recursive: true });
    const heroPath = join(assetDir, "hero-video.jpg");
    try { await readFile(heroPath); } catch { await copyFile(chosen, heroPath); }
    const selectedTimestamp = sampled.selection.selectedTimestamps[0] ?? null;
    const metadata = { sourceVideo: row.vdjPath, selectedSeconds: selectedTimestamp, candidateCount: sampled.selection.candidateCount, selection: sampled.selection.selectedReasons[0] ?? "quality-ranked candidate", preparedAt: new Date().toISOString(), sourceType: "prepared-video-frame" };
    await writeFile(join(assetDir, "hero-video.json"), JSON.stringify(metadata, null, 2) + "\n");
    records.push({ rvtr: row.rvtr, vdjPath: row.vdjPath, artist: row.vdjArtist, title: row.vdjTitle, selectedHeroPath: heroPath, selectedFrameTimestamp: selectedTimestamp, heroSourceType: "prepared-video-frame", storyStatus: row.storyStatus, storySource: "existing-song-package", displayYear: row.displayYear, displayYearSource: row.displayYearSource, chartJourneyStatus: row.chartJourneyStatus, preparationStatus: "READY", preparationDate: new Date().toISOString(), frameSelection: sampled.selection });
  }
  const elapsed = (Date.now() - started) / 1000;
  const output = { version: 1, batch: "production-hero-250", generatedAt: new Date().toISOString(), batchSize: LIMIT, processingSeconds: elapsed, averageSecondsPerSong: elapsed / LIMIT, records };
  await writeFile(join(OUT, "preparation-manifest.json"), JSON.stringify(output, null, 2) + "\n");
  const successful = records.filter((r) => r.preparationStatus === "READY").length;
  const report = `# Production Hero Batch — ${LIMIT}\n\n- Selected: ${selected.length}\n- Successful video heroes: ${successful}\n- Fallback heroes: 0\n- Failed/rejected selections: ${selected.length - successful}\n- Chart Journey: ${records.filter((r) => r.chartJourneyStatus === "AVAILABLE").length}\n- Total processing time: ${elapsed.toFixed(2)} seconds\n- Average processing time/song: ${(elapsed / LIMIT).toFixed(2)} seconds\n\nAll selected records were Story READY and exact-resolved before processing. No story generation or runtime changes were performed.\n`;
  await writeFile(join(OUT, "batch-report.md"), report);
  console.log(JSON.stringify({ selected: selected.length, successful, failed: selected.length - successful, elapsed, average: elapsed / LIMIT }, null, 2));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
