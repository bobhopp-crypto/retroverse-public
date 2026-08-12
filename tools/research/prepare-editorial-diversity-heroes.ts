import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sampleFrames } from "@/lib/ops/issue-generation/sample-frames";

const ROOT = process.cwd();
const OUT = join(ROOT, "reports/editorial-song-diversity-25");
const ASSET_ROOT = join(ROOT, "data/ops/intelligence/research-department");

async function main() {
  const manifest = JSON.parse(await readFile(join(OUT, "preparation-manifest.json"), "utf8"));
  const pending = manifest.records.filter((record: any) => record.heroSource === "pending-video-frame");
  const records = [];
  for (const record of pending) {
    const scratch = join(OUT, "candidates", record.rvtr);
    const sampled = await sampleFrames(record.physicalPath, scratch);
    const chosen = sampled.frames[0];
    if (!chosen) throw new Error(`No usable frame for ${record.rvtr}`);
    const assetDir = join(ASSET_ROOT, record.rvtr, "visual-assets");
    await mkdir(assetDir, { recursive: true });
    const heroPath = join(assetDir, "hero-video.jpg");
    await copyFile(chosen, heroPath);
    const selectedSeconds = sampled.selection.selectedTimestamps[0] ?? null;
    await writeFile(join(assetDir, "hero-video.json"), JSON.stringify({ sourceVideo: record.physicalPath, selectedSeconds, candidateCount: sampled.selection.candidateCount, selection: sampled.selection.selectedReasons[0] ?? "quality-ranked candidate", preparedAt: new Date().toISOString(), sourceType: "prepared-video-frame" }, null, 2) + "\n");
    records.push({ rvtr: record.rvtr, sourceVideo: record.physicalPath, selectedHeroPath: heroPath, selectedFrameTimestamp: selectedSeconds, heroSource: "prepared-video-frame", preparationStatus: "READY" });
  }
  await writeFile(join(OUT, "hero-preparation-manifest.json"), JSON.stringify({ version: 1, batch: "editorial-song-diversity-25-heroes", generatedAt: new Date().toISOString(), records }, null, 2) + "\n");
  console.log(JSON.stringify({ selected: pending.length, successful: records.length }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
