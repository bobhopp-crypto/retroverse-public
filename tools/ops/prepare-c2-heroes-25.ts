import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { sampleFrames } from "@/lib/ops/issue-generation/sample-frames";
import { collectorVisualAssetsDir } from "@/lib/studio/package";

const root = join(process.cwd(), "reports/c2-production-proof-25");
const MOBILE_HERO_WIDTH = 390;
const MOBILE_HERO_HEIGHT = 608;

async function mobileCropScore(source: string, output: string) {
  const crop = await sharp(source)
    .resize(MOBILE_HERO_WIDTH, MOBILE_HERO_HEIGHT, { fit: "cover", position: "centre" })
    .jpeg({ quality: 88 })
    .toFile(output);
  const stats = await sharp(output).stats();
  const mean = stats.channels.reduce((sum, channel) => sum + channel.mean, 0) / stats.channels.length;
  const contrast = stats.channels.reduce((sum, channel) => sum + channel.stdev, 0) / stats.channels.length;
  return {
    width: crop.width,
    height: crop.height,
    score: Math.max(0, 100 - Math.abs(mean - 128) * 0.25) + Math.min(35, contrast),
    mean,
    contrast,
  };
}

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
  const oldMetadataPath = join(collectorVisualAssetsDir(identity), "hero-video.json");
  let oldMetadata:any = null;
  try { oldMetadata = JSON.parse(await readFile(oldMetadataPath, "utf8")); } catch {}
  const cropDir = join(root, "mobile-crops", identity);
  await mkdir(cropDir, { recursive: true });
  const mobileCandidates = [];
  for (let index = 0; index < sampled.frames.length; index += 1) {
    const frame = sampled.frames[index];
    const preview = join(cropDir, `candidate-${String(index + 1).padStart(2, "0")}.jpg`);
    const score = await mobileCropScore(frame, preview);
    mobileCandidates.push({ index, preview, score });
  }
  mobileCandidates.sort((a, b) => b.score.score - a.score.score);
  const selectedCandidate = mobileCandidates[0];
  const chosen = selectedCandidate ? sampled.frames[selectedCandidate.index] : null;
  if (!chosen) { records.push({ subject:item.subject, status:"failed-no-usable-frame", identity, path:item.vdjResearchBrief.path, selection:sampled.selection }); continue; }
  const dir = collectorVisualAssetsDir(identity);
  await mkdir(dir, { recursive:true });
  const hero = join(dir, "hero-video.jpg");
  await copyFile(chosen, hero);
  const timestamp = selectedCandidate ? sampled.selection.selectedTimestamps[selectedCandidate.index] ?? null : null;
  const metadata = { sourceVideo:item.vdjResearchBrief.path, selectedSeconds:timestamp, mobileCrop:{ width:MOBILE_HERO_WIDTH, height:MOBILE_HERO_HEIGHT, aspectRatio:Number((MOBILE_HERO_WIDTH/MOBILE_HERO_HEIGHT).toFixed(4)), position:"center" }, focalPosition:null, candidateCount:sampled.selection.candidateCount, viableCandidateCount:sampled.frames.length, selectionMethod:"two-stage-mobile-crop-aware-v1", selection:sampled.selection.selectedReasons[selectedCandidate?.index ?? 0] ?? "quality-ranked candidate", mobileCropScore:selectedCandidate?.score ?? null, preparedAt:new Date().toISOString(), sourceType:"prepared-video-frame", proofSubject:item.subject };
  await writeFile(join(dir,"hero-video.json"), JSON.stringify(metadata,null,2)+"\n");
  records.push({ subject:item.subject,status:"created",identity,path:item.vdjResearchBrief.path,heroPath:hero,selectedSeconds:timestamp,oldSelectedSeconds:oldMetadata?.selectedSeconds ?? null,selection:sampled.selection,mobileCrop:{ width:MOBILE_HERO_WIDTH, height:MOBILE_HERO_HEIGHT, position:"center", viableCandidates:mobileCandidates.length, selectedIndex:(selectedCandidate?.index ?? -1)+1, selectedScore:selectedCandidate?.score ?? null } });
}
const created=records.filter(r=>r.status==="created");
await writeFile(join(root,"hero-completion-manifest.json"), JSON.stringify({version:2,scope:"same-25-c2-assets",generatedAt:new Date().toISOString(),selectionMethod:"two-stage-mobile-crop-aware-v1",mobileCrop:{width:MOBILE_HERO_WIDTH,height:MOBILE_HERO_HEIGHT,position:"center",focalPositionImplemented:false},before:3,created:created.length,after:3+created.length,failures:records.filter(r=>r.status.startsWith("failed")).length,records},null,2)+"\n");
console.log(JSON.stringify({before:3,created:created.length,after:3+created.length,failures:records.filter(r=>r.status.startsWith("failed")).length},null,2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
