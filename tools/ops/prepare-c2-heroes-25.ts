import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sampleFrames } from "@/lib/ops/issue-generation/sample-frames";
import { collectorVisualAssetsDir } from "@/lib/studio/package";

const root = join(process.cwd(), "reports/c2-production-proof-25");
async function main() {
const proof = JSON.parse(await readFile(join(root, "c2-editorial-manifest.json"), "utf8"));
const inventory = JSON.parse(await readFile(join(process.cwd(), "data/ops/manifest/video-completion-manifest.json"), "utf8"));
const existing = new Set(proof.filter((r:any) => r.heroSource === "PREPARED_VIDEO_HERO").map((r:any) => r.subject));
const records:any[] = [];
for (const item of proof) {
  if (existing.has(item.subject)) { records.push({ subject:item.subject, status:"preserved-existing", rvtr:item.rvtr, path:item.vdjResearchBrief.path }); continue; }
  const match = inventory.records.find((r:any) => r.vdjPath === item.vdjResearchBrief.path);
  const identity = (item.rvtr ?? String(match?.videoExperienceId ?? "").replace(/^VDJ:/i, "VDJ-")).toUpperCase();
  if (!identity) { records.push({ subject:item.subject, status:"failed-no-identity", path:item.vdjResearchBrief.path }); continue; }
  const scratch = join(root, "hero-candidates", identity);
  const sampled = await sampleFrames(item.vdjResearchBrief.path, scratch);
  const chosen = sampled.frames[0];
  if (!chosen) { records.push({ subject:item.subject, status:"failed-no-usable-frame", identity, path:item.vdjResearchBrief.path, selection:sampled.selection }); continue; }
  const dir = collectorVisualAssetsDir(identity);
  await mkdir(dir, { recursive:true });
  const hero = join(dir, "hero-video.jpg");
  await copyFile(chosen, hero);
  const timestamp = sampled.selection.selectedTimestamps[0] ?? null;
  const metadata = { sourceVideo:item.vdjResearchBrief.path, selectedSeconds:timestamp, candidateCount:sampled.selection.candidateCount, selection:sampled.selection.selectedReasons[0] ?? "quality-ranked candidate", preparedAt:new Date().toISOString(), sourceType:"prepared-video-frame", proofSubject:item.subject };
  await writeFile(join(dir,"hero-video.json"), JSON.stringify(metadata,null,2)+"\n");
  records.push({ subject:item.subject,status:"created",identity,path:item.vdjResearchBrief.path,heroPath:hero,selectedSeconds:timestamp,selection:sampled.selection });
}
const created=records.filter(r=>r.status==="created");
await writeFile(join(root,"hero-completion-manifest.json"), JSON.stringify({version:1,scope:"same-25-c2-assets",generatedAt:new Date().toISOString(),before:3,created:created.length,after:3+created.length,failures:records.filter(r=>r.status.startsWith("failed")).length,records},null,2)+"\n");
console.log(JSON.stringify({before:3,created:created.length,after:3+created.length,failures:records.filter(r=>r.status.startsWith("failed")).length},null,2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
