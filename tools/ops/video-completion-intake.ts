import { access, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";

const ROOT = process.cwd();
const VIDEO_ROOT = "/Users/bobhopp/DJ MEDIA/VIDEO";
const DEFAULT_MANIFEST = join(ROOT, "data/ops/manifest/video-completion-manifest.json");
const DEFAULT_REPORT = join(ROOT, "reports/video-completion-lifecycle.md");
const VIDEO_EXTENSIONS = new Set([".mp4", ".mpg", ".mpeg", ".mov", ".m4v", ".avi", ".webm"]);
type AnyRow = Record<string, any>;

function arg(name: string, fallback: string) { const value = process.argv.find((item) => item.startsWith(`--${name}=`)); return value ? value.slice(name.length + 3) : fallback; }
function normalizePath(filePath: string) { return resolve(filePath); }
function videoExperienceId(filePath: string) { return `VDJ:${createHash("sha256").update(filePath.toLowerCase()).digest("hex").slice(0, 16)}`; }
function needsFor(record: AnyRow) {
  const needs: string[] = [];
  if (!record.videoExperienceId || !["RESOLVED", "MEDIA_RESOLVED", "EDITORIAL_SUBJECT"].includes(record.identityStatus)) needs.push("identity");
  if (!record.heroStatus.startsWith("PREPARED") && record.heroStatus !== "APPROVED_FALLBACK") needs.push("hero");
  if (record.collectorStatus !== "READY") needs.push("collector");
  if (record.editorialStatus !== "READY") needs.push(record.editorialStatus === "RESEARCH_REQUIRED" ? "editorial-research" : "editorial");
  if (record.relatedMusicStatus !== "READY") needs.push("relatedMusic");
  if (record.validationStatus !== "VALIDATED") needs.push("validation");
  return needs;
}

async function listVideos(root: string) {
  const output: string[] = [];
  async function visit(folder: string): Promise<void> {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const filePath = join(folder, entry.name);
      if (entry.isDirectory()) await visit(filePath);
      else if (VIDEO_EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase())) output.push(normalizePath(filePath));
    }
  }
  await visit(root);
  return output.sort();
}

async function readJson(path: string, fallback: any) { try { return JSON.parse(await readFile(path, "utf8")); } catch { return fallback; } }

async function main() {
  const videoRoot = normalizePath(arg("root", VIDEO_ROOT));
  const manifestPath = resolve(arg("manifest", DEFAULT_MANIFEST));
  const reportPath = resolve(arg("report", DEFAULT_REPORT));
  const hasPriorManifest = await access(manifestPath).then(() => true).catch(() => false);
  const inventory = await readJson(join(ROOT, "reports/vdj-library-coverage/inventory.json"), { records: [] });
  const prior = await readJson(manifestPath, { records: [] });
  const priorByPath = new Map<string, AnyRow>((prior.records ?? []).map((record: AnyRow) => [record.normalizedPath, record]));
  const inventoryByPath = new Map<string, AnyRow>();
  for (const row of inventory.records ?? []) if (row.physicalPath) inventoryByPath.set(normalizePath(row.physicalPath), row);
  const diversity = await readJson(join(ROOT, "data/ops/intelligence/editorial-diversity-25.json"), { records: [] });
  const production = await readJson(join(ROOT, "data/ops/intelligence/editorial-production-100.json"), { records: [] });
  const mediaClassification = await readJson(join(ROOT, "reports/media-aware-identity-50/media-classification-manifest.json"), { records: [] });
  const mediaByPath = new Map<string, AnyRow>((mediaClassification.records ?? []).map((record: AnyRow) => [normalizePath(record.videoPath), record]));
  const editorialByRvtr = new Map<string, AnyRow>([...(diversity.records ?? []), ...(production.records ?? [])].map((record: AnyRow) => [record.rvtr, record]));
  const videos = await listVideos(videoRoot);
  const records: AnyRow[] = [];
  for (const filePath of videos) {
    const file = await stat(filePath);
    const row = inventoryByPath.get(filePath);
    const priorRecord = priorByPath.get(filePath);
    const priorProvenRvtr = priorRecord?.identityStatus === "RESOLVED" ? priorRecord.rvtr : null;
    const rvtr = row?.canonicalStatus === "resolved" ? row.rvtr : priorProvenRvtr;
    const media = mediaByPath.get(filePath);
    const experienceId = rvtr ?? priorRecord?.videoExperienceId ?? videoExperienceId(filePath);
    const mediaResolved = Boolean(media?.identityOutcome?.startsWith("MEDIA_PROVEN_"));
    const editorialSubjectReady = Boolean((row?.vdjArtist ?? priorRecord?.vdjArtist ?? row?.vdjTitle ?? priorRecord?.vdjTitle) && (row?.vdjTitle ?? priorRecord?.vdjTitle));
    const editorial = rvtr ? editorialByRvtr.get(rvtr) : null;
    const changed = Boolean(priorRecord && (priorRecord.fileSize !== file.size || priorRecord.fileModifiedAt !== file.mtime.toISOString()));
    const heroPrepared = row?.heroStatus === "PREPARED_VIDEO_HERO" || Boolean(editorial?.heroSource === "prepared-video-frame");
    const collectorReady = row?.storyStatus === "READY" || Boolean(row?.packageStatus === "READY");
    const editorialReady = Boolean(editorial?.finalStatus === "READY" || editorial?.articleWordCount);
    const relatedReady = Boolean(editorial?.related?.length);
    const validated = Boolean(editorial && (diversity.records ?? []).some((record: AnyRow) => record.rvtr === rvtr) || editorial && (production.records ?? []).some((record: AnyRow) => record.rvtr === rvtr));
    const record: AnyRow = { vdjPath: row?.vdjPath ?? filePath, normalizedPath: filePath, fileSize: file.size, fileModifiedAt: file.mtime.toISOString(), rvtr, videoExperienceId: experienceId, canonicalRvtrs: rvtr ? [rvtr] : [], underlyingSongRelationships: media?.underlyingSongs ?? [], mediaClassification: media?.mediaClassification ?? null, performanceContext: media?.versionContext ?? null, chartRelationships: media?.chartRelationships ?? [], canonicalOptional: true, editorialSubject: editorialSubjectReady ? { artist: row?.vdjArtist ?? priorRecord?.vdjArtist ?? null, title: row?.vdjTitle ?? priorRecord?.vdjTitle ?? null, album: row?.vdjAlbum ?? priorRecord?.vdjAlbum ?? null, year: row?.vdjYear ?? priorRecord?.vdjYear ?? null } : null, vdjArtist: row?.vdjArtist ?? null, vdjTitle: row?.vdjTitle ?? null, vdjAlbum: row?.vdjAlbum ?? null, vdjYear: row?.vdjYear ?? null, artist: row?.canonicalStatus === "resolved" ? row.canonicalArtist : (priorRecord?.identityStatus === "RESOLVED" ? priorRecord.artist : row?.vdjArtist ?? null), title: row?.canonicalStatus === "resolved" ? row.canonicalTitle : (priorRecord?.identityStatus === "RESOLVED" ? priorRecord.title : row?.vdjTitle ?? null), album: row?.canonicalStatus === "resolved" ? row.canonicalAlbum : (priorRecord?.identityStatus === "RESOLVED" ? priorRecord.album : row?.vdjAlbum ?? null), displayYear: row?.canonicalStatus === "resolved" ? row.displayYear : (priorRecord?.identityStatus === "RESOLVED" ? priorRecord.displayYear : row?.vdjYear ?? null), displayYearSource: row?.canonicalStatus === "resolved" ? row.displayYearSource : (priorRecord?.identityStatus === "RESOLVED" ? priorRecord.displayYearSource : (row?.vdjYear ? "VDJ_FALLBACK" : "UNKNOWN")), identityStatus: rvtr ? "RESOLVED" : mediaResolved ? "MEDIA_RESOLVED" : editorialSubjectReady ? "EDITORIAL_SUBJECT" : "IDENTITY_REQUIRED", heroStatus: heroPrepared ? "PREPARED_VIDEO_HERO" : "PREPARATION_REQUIRED", collectorStatus: collectorReady ? "READY" : editorialSubjectReady ? "RESEARCH_REQUIRED" : "MISSING", editorialStatus: editorialReady ? "READY" : (editorialSubjectReady ? "RESEARCH_REQUIRED" : (row?.storyStatus === "PARTIAL" ? "RESEARCH_REQUIRED" : "MISSING")), relatedMusicStatus: relatedReady ? "READY" : "PREPARATION_REQUIRED", validationStatus: validated ? "VALIDATED" : "NOT_VALIDATED", chartJourneyStatus: row?.chartJourneyStatus === "AVAILABLE" ? "AVAILABLE" : "UNAVAILABLE", overallStatus: "NEW", preparationVersion: priorRecord?.preparationVersion ?? 2, lastPreparedAt: priorRecord?.lastPreparedAt ?? null, lastValidatedAt: validated ? (priorRecord?.lastValidatedAt ?? null) : null, blockingReason: null, preparationNeeds: [], changeStatus: priorRecord ? (changed ? "CHANGED_SINCE_PREPARATION" : "UNCHANGED") : (hasPriorManifest ? "NEW" : "NEW"), identityProvenance: priorRecord?.identityProvenance ?? null };
    if (!row) record.overallStatus = "IDENTITY_REQUIRED";
    else if (changed) record.overallStatus = priorRecord?.overallStatus === "COMPLETE" ? "PREPARATION_REQUIRED" : "PREPARATION_REQUIRED";
    else if (record.identityStatus === "IDENTITY_REQUIRED") record.overallStatus = "IDENTITY_REQUIRED";
    else if (record.identityStatus === "EDITORIAL_SUBJECT") record.overallStatus = "RESEARCH_REQUIRED";
    else if (record.editorialStatus === "RESEARCH_REQUIRED") record.overallStatus = "RESEARCH_REQUIRED";
    else if (record.heroStatus !== "PREPARED_VIDEO_HERO" || record.collectorStatus !== "READY" || record.relatedMusicStatus !== "READY") record.overallStatus = "PREPARATION_REQUIRED";
    else if (record.validationStatus !== "VALIDATED") record.overallStatus = "READY_FOR_VALIDATION";
    else record.overallStatus = "COMPLETE";
    record.preparationNeeds = needsFor(record);
    if (changed && priorRecord?.overallStatus === "COMPLETE") record.preparationNeeds = ["hero", "validation"];
    records.push(record);
  }
  const scanned = new Set(videos);
  for (const old of prior.records ?? []) if (!scanned.has(old.normalizedPath)) records.push({ ...old, fileExists: false, overallStatus: "BLOCKED", blockingReason: "MISSING_OR_REMOVED", preparationNeeds: [] , changeStatus: "MISSING_OR_REMOVED" });
  records.sort((a, b) => a.normalizedPath.localeCompare(b.normalizedPath));
  await mkdir(join(manifestPath, ".."), { recursive: true });
  await mkdir(join(reportPath, ".."), { recursive: true });
  const fresh = records.filter((record) => record.changeStatus === "NEW").length;
  const summary = (state: string) => state === "NEW" ? fresh : records.filter((record) => record.overallStatus === state).length;
  const changed = records.filter((record) => record.changeStatus === "CHANGED_SINCE_PREPARATION").length;
  const missing = records.filter((record) => record.changeStatus === "MISSING_OR_REMOVED").length;
  await writeFile(manifestPath, JSON.stringify({ version: 1, manifestAuthority: "video-completion-lifecycle", videoRoot, generatedAt: new Date().toISOString(), records }, null, 2) + "\n");
  await writeFile(reportPath, `# VIDEO Completion Lifecycle\n\nGenerated: ${new Date().toISOString()}\n\n| State | Count |\n|---|---:|\n| TOTAL VIDEO FILES | ${videos.length} |\n| COMPLETE | ${summary("COMPLETE")} |\n| NEW | ${summary("NEW")} |\n| IDENTITY_REQUIRED | ${summary("IDENTITY_REQUIRED")} |\n| PREPARATION_REQUIRED | ${summary("PREPARATION_REQUIRED")} |\n| RESEARCH_REQUIRED | ${summary("RESEARCH_REQUIRED")} |\n| READY_FOR_VALIDATION | ${summary("READY_FOR_VALIDATION")} |\n| BLOCKED | ${summary("BLOCKED")} |\n| CHANGED SINCE PREPARATION | ${changed} |\n| MISSING/REMOVED | ${missing} |\n\n## Preparation needs\n\n${["identity", "hero", "collector", "editorial", "editorial-research", "relatedMusic", "validation"].map((need) => `- ${need}: ${records.filter((record) => record.preparationNeeds.includes(need)).length}`).join("\n")}\n\nThe manifest is authoritative. Reruns match by normalized physical path, preserve existing provenance, and compare file size plus modification time. A changed COMPLETE file requeues only video-dependent hero work and validation; canonical identity, year, editorial, Chart Journey, and related provenance are retained.\n`);
  await writeFile(reportPath, (await readFile(reportPath, "utf8")) + "\n## Future design note\n\nAsk Arvey may eventually receive a more intentional visual identity, potentially a playful broadcast parrot or pirate/parrot badge. This sprint records the direction only; no Arvey design or copy was changed.\n");
  console.log(JSON.stringify({ totalVideoFiles: videos.length, complete: summary("COMPLETE"), new: summary("NEW"), identityRequired: summary("IDENTITY_REQUIRED"), preparationRequired: summary("PREPARATION_REQUIRED"), researchRequired: summary("RESEARCH_REQUIRED"), readyForValidation: summary("READY_FOR_VALIDATION"), blocked: summary("BLOCKED"), changed, missing }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
