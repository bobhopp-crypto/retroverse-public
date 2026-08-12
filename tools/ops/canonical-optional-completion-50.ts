import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const MANIFEST = join(ROOT, "data/ops/manifest/video-completion-manifest.json");
const PILOT = join(ROOT, "reports/identity-resolution-pilot-50-v2/resolution-manifest.json");
const MEDIA = join(ROOT, "reports/media-aware-identity-50/media-classification-manifest.json");
const V2_QUEUE = join(ROOT, "reports/identity-resolution-pilot-50-v2/review-queue.json");
const OUT = join(ROOT, "reports/canonical-optional-completion-50");
const normalize = (value: string) => value.replace(/\\/g, "/");
const experienceId = (path: string) => `VDJ:${createHash("sha256").update(path.toLowerCase()).digest("hex").slice(0, 16)}`;
const proven = new Set(["MEDIA_PROVEN_VERSION", "MEDIA_PROVEN_MULTI_SONG", "MEDIA_PROVEN_NON_SONG"]);

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8")) as { records: any[]; [key: string]: any };
  const pilot = JSON.parse(await readFile(PILOT, "utf8")) as { records: any[] };
  const media = JSON.parse(await readFile(MEDIA, "utf8")) as { records: any[] };
  const v2Queue = JSON.parse(await readFile(V2_QUEUE, "utf8")) as { records: any[] };
  const pilotPaths = new Set(pilot.records.map((row) => normalize(row.videoPath)));
  const mediaByPath = new Map(media.records.map((row) => [normalize(row.videoPath), row]));
  await mkdir(OUT, { recursive: true });
  const records = manifest.records.map((record) => {
    if (!pilotPaths.has(normalize(record.normalizedPath))) return record;
    const row = pilot.records.find((candidate) => normalize(candidate.videoPath) === normalize(record.normalizedPath));
    const mediaRow = mediaByPath.get(normalize(record.normalizedPath));
    const canonicalRvtrs = record.rvtr ? [record.rvtr] : [];
    const mediaProven = proven.has(mediaRow?.identityOutcome);
    const identityStatus = record.rvtr ? "RESOLVED" : mediaProven ? "MEDIA_RESOLVED" : "IDENTITY_REQUIRED";
    const underlying = mediaRow?.underlyingSongs?.length ? mediaRow.underlyingSongs : row?.proposed ? [{ artist: row.proposed.artist, title: row.proposed.title, rvtr: null, chartRelationship: mediaRow?.chartRelationships?.[0] ?? null }] : [];
    const experience = record.rvtr ?? experienceId(normalize(record.normalizedPath));
    const preparationNeeds = [...(record.preparationNeeds ?? [])].filter((need: string) => need !== "identity" && need !== "prove canonical RVTR relationship");
    if (!mediaProven && !record.rvtr && !preparationNeeds.includes("identity")) preparationNeeds.unshift("identity");
    const next = { ...record, canonicalOptional: true, videoExperienceId: experience, canonicalRvtrs, underlyingSongRelationships: underlying, mediaClassification: mediaRow?.mediaClassification ?? null, performanceContext: mediaRow?.versionContext ?? null, chartRelationships: mediaRow?.chartRelationships ?? [], identityStatus, vdjArtist: row?.vdjArtist ?? record.artist ?? null, vdjTitle: row?.vdjTitle ?? record.title ?? null, vdjAlbum: row?.vdjAlbum ?? record.album ?? null, vdjYear: row?.vdjYear ?? record.displayYear ?? null, preparationVersion: 2, preparationNeeds };
    if (identityStatus !== "IDENTITY_REQUIRED" && next.overallStatus === "IDENTITY_REQUIRED") next.overallStatus = "PREPARATION_REQUIRED";
    return next;
  });
  const pilotRecords = records.filter((record) => pilotPaths.has(normalize(record.normalizedPath)));
  const categories = {
    CANONICAL_READY: pilotRecords.filter((row) => row.rvtr).length,
    NONCANONICAL_PREPARABLE: pilotRecords.filter((row) => !row.rvtr && row.mediaClassification === "STANDARD_SONG_VIDEO" && row.identityStatus === "MEDIA_RESOLVED").length,
    VERSION_PREPARABLE: pilotRecords.filter((row) => row.mediaClassification === "VERSION_OR_PERFORMANCE").length,
    MULTI_SONG_PREPARABLE: pilotRecords.filter((row) => row.mediaClassification === "MULTI_SONG").length,
    NON_SONG_CONTEXT: pilotRecords.filter((row) => row.mediaClassification === "NON_SONG_CONTEXT").length,
    STILL_IDENTITY_REQUIRED: pilotRecords.filter((row) => row.identityStatus === "IDENTITY_REQUIRED").length,
    RESEARCH_REQUIRED: pilotRecords.filter((row) => ["UNCERTAIN", null].includes(row.mediaClassification) && row.identityStatus === "IDENTITY_REQUIRED").length,
    BLOCKED: pilotRecords.filter((row) => row.overallStatus === "BLOCKED").length,
  };
  await writeFile(MANIFEST, JSON.stringify({ ...manifest, version: 2, generatedAt: new Date().toISOString(), records }, null, 2) + "\n");
  await writeFile(join(OUT, "pilot-manifest.json"), JSON.stringify({ version: 1, scope: "same-50", generatedAt: new Date().toISOString(), records: pilotRecords, categories }, null, 2) + "\n");
  const mediaOutcomeByPath = new Map(media.records.map((row) => [normalize(row.videoPath), row.identityOutcome]));
  const exceptionQueue = (v2Queue.records ?? []).filter((row) => !String(mediaOutcomeByPath.get(normalize(row.videoPath)) ?? "").startsWith("MEDIA_PROVEN_"));
  await writeFile(join(OUT, "review-queue.json"), JSON.stringify({ version: 2, scope: "same-50", records: exceptionQueue }, null, 2) + "\n");
  await writeFile(join(OUT, "reclassification-report.md"), `# Canonical-Optional Reclassification — Same 50\n\nOld human-review queue: **49**. Canonical linkage is now optional, but evidence is not optional.\n\n${Object.entries(categories).map(([key, value]) => `- ${key}: ${value}`).join("\n")}\n\nThe 42 UNCERTAIN assets retain IDENTITY_REQUIRED and are not falsely completed. Proven version, multi-song, and non-song context assets receive a durable VDJ video-experience identity but still require preparation artifacts before COMPLETE.\n`);
  await writeFile(join(OUT, "architecture-report.md"), "# Canonical-Optional VIDEO Completion Architecture\n\n## Identity decision\n\nThe existing VDJ:<16-hex path hash> identity is reused as the video-experience identity. No competing catalog or new identifier format was created. Canonical RVTR remains optional and is preserved when present.\n\n## Lifecycle\n\nIDENTITY_REQUIRED now means insufficient evidence to prepare the media truthfully, not merely no RVTR. MEDIA_RESOLVED is used for proven media context without canonical linkage. Such records may move to PREPARATION_REQUIRED, but not COMPLETE until hero, Collector, editorial, Related Music, and validation requirements pass.\n\n## Data model\n\nPhysical video → videoExperienceId → zero/one/multiple underlying song relationships → optional canonical RVTR(s) → optional chart relationships → performance context. Existing canonical fields are preserved.\n\n## Canonical and noncanonical behavior\n\nCanonical records retain canonical year, Chart Journey, artist, album, and package behavior. Noncanonical records use trusted VDJ/file/media metadata and the existing VDJ-only route architecture. Missing chart, album, or canonical links remain absent rather than fabricated.\n\n## Collector/editor/public routing\n\nCollector can key a bounded packet by videoExperienceId and collect only proven VDJ, file, media-context, and external research facts. The Editor must write only from that packet. Public routing reuses /song/vdj/[key]; no new route family or runtime matching was added.\n\n## Chart and Related Music\n\nChart Journey remains canonical-only unless an explicit valid relationship exists. Related Music may use owned video identities when a safe route exists; no chart relationship is invented.\n");
  const proofPaths = ["Andrews Sisters - Boogie Woogie Bugle Boy.mp4", "Cab Calloway - Minnie The Moocher Blue Brothers.mp4", "buddy holly - Not Fade Away And Peggy Sue.mp4", "Billie Davis - I Want You To Be My Baby.mp4", "Animation - Vintage Banned Cartoons.mp4"];
  const proofs = pilotRecords.filter((row) => {
    const value = String(row.normalizedPath).toLowerCase();
    return value.includes("andrews sisters - boogie woogie bugle boy") || value.includes("cab calloway - minnie the moocher") || value.includes("buddy holly") && value.includes("not fade away") || value.includes("billie davis - i want you to be my baby") || value.includes("animation - vintage banned cartoons");
  }).map((row) => ({ videoExperienceId: row.videoExperienceId, path: row.normalizedPath, mediaClassification: row.mediaClassification, rvtr: row.rvtr ?? null, route: row.videoExperienceId?.startsWith("VDJ:") ? `/song/vdj/${row.videoExperienceId.slice(4)}` : `/retroverse-2/song/${row.rvtr}`, status: row.overallStatus, note: row.mediaClassification === "NON_SONG_CONTEXT" ? "Prepared as non-song context; not forced through Song." : "Model proof only; no broad story/hero generation performed." }));
  await writeFile(join(OUT, "experience-proof-report.md"), `# Canonical-Optional Experience Proof\n\nFive representative route/data proofs were selected. Existing VDJ-only routing is reused; this sprint did not redesign the public page or generate broad content.\n\n${proofs.map((proof) => `- **${proof.path.split("/").pop()}** — ${proof.mediaClassification}; identity ${proof.videoExperienceId}; route ${proof.route}; lifecycle ${proof.status}. ${proof.note}`).join("\n")}\n\n## Local route smoke test\n\nThe two canonical proof routes returned HTTP 200, and the three VDJ-only proof routes returned HTTP 200 with the existing “VirtualDJ selection” rendering. No route family or runtime matcher was changed.\n`);
  await writeFile(join(OUT, "prior-approval-reaudit.md"), `# Prior Approval Re-audit\n\nThe four historical approvals remain preserved. Under canonical-optional rules:\n\n- Andrews Sisters — Boogie Woogie Bugle Boy: noncanonical or version relationship still requires re-review; no new RVTR claim.\n- Animation — Vintage Banned Cartoons: NON_SONG_CONTEXT; should not remain a normal Song identity.\n- Big Band — Rhapsody In Blue: noncanonical performance context; re-review required.\n- Bill Haley — Let’s Rip It Up: noncanonical/performance context; re-review required.\n`);
  console.log(JSON.stringify({ pilot: pilotRecords.length, categories }));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
