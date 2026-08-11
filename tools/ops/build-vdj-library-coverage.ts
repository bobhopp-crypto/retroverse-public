import { access, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { scanVdjDatabase, type VdjLibraryEntry } from "@/lib/ops/intelligence/vdj-database";
import { loadSongPackage } from "@/lib/ops/intelligence/song-package-store";
import { resolveCanonicalTracksBatch } from "@/lib/public/canonical-public-resolver";
import { resolveVisualAssetPath } from "@/lib/ops/studio/collector/visual-extraction";

const OUT_DIR = join(process.cwd(), "reports", "vdj-library-coverage");
const VDJ_VIDEO_ROOT = "/Users/bobhopp/DJ MEDIA/VIDEO/";
const RVTR_RE = /^RVTR\d{6}$/i;
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "avi", "mkv", "webm"]);

type RecordRow = Record<string, unknown>;

function count<T extends string>(rows: RecordRow[], key: string): Record<T, number> {
  const result = {} as Record<T, number>;
  for (const row of rows) {
    const value = String(row[key] ?? "");
    result[value as T] = (result[value as T] ?? 0) + 1;
  }
  return result;
}

function status(row: RecordRow): string {
  if (row.canonicalStatus !== "resolved") return "UNRESOLVED_IDENTITY";
  const hero = String(row.heroStatus);
  const story = String(row.storyStatus);
  if (hero === "VIDEO_AVAILABLE_HERO_NOT_PREPARED" && story === "MISSING") return "NEEDS_HERO_AND_STORY";
  if (hero === "VIDEO_AVAILABLE_HERO_NOT_PREPARED") return "NEEDS_HERO";
  if (story === "MISSING") return "NEEDS_STORY";
  if (row.blocked === true) return "BLOCKED";
  return "READY";
}

async function exists(path: string | null): Promise<boolean> {
  if (!path) return false;
  try { await access(path); return true; } catch { return false; }
}

async function main() {
  const scan = await scanVdjDatabase({ force: true });
  const rawXml = await readFile(scan.path, "utf8");
  const rawXmlPaths = [...rawXml.matchAll(/<Song\b[\s\S]*?FilePath="([^"]+)"[\s\S]*?(?=<Song\b|<VirtualFolder\b|<Folder\b|$)/g)].map((m) => m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/\\/g, "/"));
  const rawXmlVideoPaths = rawXmlPaths.filter((p) => VIDEO_EXTENSIONS.has(p.split(".").pop()?.toLowerCase() ?? ""));
  const allVideoEntries = scan.entries.filter((e) => VIDEO_EXTENSIONS.has(e.extension ?? ""));
  const videoRootEntries = allVideoEntries.filter((e) => e.filePath.toLowerCase().startsWith(VDJ_VIDEO_ROOT.toLowerCase()));
  const groups = new Map<string, { entry: VdjLibraryEntry; duplicateEntries: VdjLibraryEntry[] }>();
  let missingStale = 0;
  for (const entry of videoRootEntries) {
    if (!(await exists(entry.filePath))) { missingStale += 1; continue; }
    const physical = await realpath(entry.filePath).catch(() => entry.filePath);
    const existing = groups.get(physical);
    if (existing) existing.duplicateEntries.push(entry);
    else groups.set(physical, { entry, duplicateEntries: [] });
  }
  const entries = [...groups.values()];
  const packageIndex = new Map<string, RecordRow>();
  try {
    const raw = JSON.parse(await readFile(join(process.cwd(), "data/ops/intelligence/package-index.json"), "utf8"));
    for (const p of raw.packages ?? []) packageIndex.set(String(p.rvtr).toUpperCase(), p);
  } catch {}

  const exactRvtrs = [...new Set(entries.map(({ entry }) => entry.label.trim().toUpperCase()).filter((v) => RVTR_RE.test(v)))];
  const canonical = await resolveCanonicalTracksBatch(exactRvtrs).catch(() => new Map());

  const rows: RecordRow[] = [];
  for (const group of entries) {
    const entry = group.entry;
    const embedded = entry.label.trim().toUpperCase();
    const rvtr = RVTR_RE.test(embedded) ? embedded : null;
    const pkg = rvtr ? await loadSongPackage(rvtr).catch(() => null) : null;
    const track = rvtr ? canonical.get(rvtr) : null;
    const preparedHero = rvtr ? await resolveVisualAssetPath(rvtr, "hero-video.jpg") : null;
    const fileExists = await exists(entry.filePath);
    const storyCards = pkg?.storyCards?.filter((card) => card.rank > 0 && !card.hidden).length ?? 0;
    const candidateFacts = pkg?.candidateFacts?.length ?? 0;
    const storyStatus = storyCards > 0 || candidateFacts > 0 ? "READY" : pkg ? "PARTIAL" : "MISSING";
    let heroStatus = "NO_USABLE_VISUAL";
    if (preparedHero) heroStatus = "PREPARED_VIDEO_HERO";
    else if (track?.coverUrl || pkg?.visualProfile?.primaryHero?.url) heroStatus = "ALBUM_ART_ONLY";
    else if (fileExists) heroStatus = "VIDEO_AVAILABLE_HERO_NOT_PREPARED";
    const chartJourney = Boolean(track?.chartWeeks || track?.hasHot100);
    const displayYear = track?.canonicalYear ?? pkg?.metadata?.year ?? entry.year ?? null;
    const displayYearSource = track?.canonicalYear ? "canonical/trusted" : pkg?.metadata?.year ? "trusted_package" : entry.year ? "vdj_fallback" : "unknown";
    const row: RecordRow = {
      vdjPath: entry.filePath, vdjArtist: entry.artist, vdjTitle: entry.title, vdjAlbum: entry.album || null, vdjYear: entry.year,
      rvtr, canonicalStatus: track ? "resolved" : "unresolved", canonicalArtist: track?.artist.displayName ?? null,
      canonicalTitle: track?.title ?? null, canonicalAlbum: track?.albumResolution.primaryAlbum?.title ?? null,
      displayYear, displayYearSource, storyStatus, heroStatus,
      chartJourneyStatus: chartJourney ? "AVAILABLE" : "UNAVAILABLE", chartWeekData: Boolean(track?.chartWeeks),
      peakRankData: track?.peakHot100Position != null, chartHistorySource: chartJourney ? "canonical_track_display" : null,
      artistLinkStatus: Boolean(track?.artist.href), albumLinkStatus: Boolean(track?.albumResolution.primaryAlbum),
      yearLinkStatus: Boolean(track?.canonicalYear), chartsLinkStatus: false,
      preparationStatus: "", preparationNeeds: [], fileExists, playCount: entry.playCount,
      source: { vdjDatabase: scan.path, identity: rvtr ? "VDJ Label exact RVTR" : "unresolved; no fuzzy match", chart: chartJourney ? "canonical_track_display" : null },
      packageStatus: pkg?.status ?? packageIndex.get(rvtr ?? "")?.status ?? null,
      physicalPath: [...new Set([entry.filePath, ...group.duplicateEntries.map((d) => d.filePath)])][0],
      vdjReferenceCount: group.duplicateEntries.length + 1,
      duplicateVdjReferences: group.duplicateEntries.map((d) => ({ path: d.filePath, artist: d.artist, title: d.title, label: d.label })),
    };
    row.preparationStatus = status(row);
    const needs: string[] = [];
    if (row.preparationStatus === "UNRESOLVED_IDENTITY") needs.push("prove canonical RVTR relationship");
    if (heroStatus === "VIDEO_AVAILABLE_HERO_NOT_PREPARED") needs.push("select prepared video hero");
    if (storyStatus === "MISSING") needs.push("assemble trusted story");
    if (!chartJourney) needs.push("no chart journey data");
    row.preparationNeeds = needs;
    rows.push(row);
  }
  rows.sort((a, b) => String(a.vdjPath).localeCompare(String(b.vdjPath)));
  const duplicateReferencesRemoved = videoRootEntries.length - rows.length - missingStale;
  const summary = { rawXmlVideoRecords: rawXmlVideoPaths.length, rawXmlUniquePathRecords: new Set(rawXmlVideoPaths).size, rawXmlDuplicateReferences: rawXmlVideoPaths.length - new Set(rawXmlVideoPaths).size, originalVideoRecords: allVideoEntries.length, originalPathRecords: new Set(allVideoEntries.map((e) => e.filePath)).size, videoRootRecords: videoRootEntries.length, total: rows.length, uniqueExistingPhysicalVideoFiles: rows.length, duplicateReferencesRemoved, missingStale, outsideVideoRecords: allVideoEntries.length - videoRootEntries.length, canonicalIdentity: count(rows, "canonicalStatus"), year: count(rows, "displayYearSource"), story: count(rows, "storyStatus"), hero: count(rows, "heroStatus"), chartJourney: count(rows, "chartJourneyStatus"), preparation: count(rows, "preparationStatus") };
  const sample = rows.filter((r) => ["RVTR285085", "RVTR461330", "RVTR251858", "RVTR009363"].includes(String(r.rvtr))).concat(rows.filter((r) => String(r.vdjTitle).toLowerCase().includes("best thing that ever"))).slice(0, 5);
  const prototypeAudit = [
    ["Paul Simon — You Can Call Me Al", "RVTR285085"], ["Benny Benassi — Spaceship", "RVTR461330"],
    ["Gladys Knight & The Pips — The Best Thing That Ever Happened", ""], ["Nancy Sinatra — These Boots Are Made for Walkin’", "RVTR251858"], ["Clean Bandit feat. Ellie Goulding — Mama", "RVTR009363"],
  ].map(([label, rvtr]) => {
    const hits = allVideoEntries.filter((e) => (rvtr && e.label.trim().toUpperCase() === rvtr) || (!rvtr && e.artist.toLowerCase().includes("gladys knight") && e.title.toLowerCase().includes("best thing")));
    return `- ${label}: ${hits.length ? hits.map((e) => e.filePath.toLowerCase().startsWith(VDJ_VIDEO_ROOT.toLowerCase()) ? "in corrected VIDEO inventory" : "excluded: outside VIDEO root").join(", ") : "not present in database scan"}`;
  });
  const validation = [...rows].sort((a, b) => String(a.vdjPath).localeCompare(String(b.vdjPath))).filter((r, i, all) => i === all.findIndex((x) => x.vdjPath === r.vdjPath)).slice(0, 20);
  const decades: Record<string, number> = {};
  for (const row of rows) { const match = String(row.vdjPath).match(/\/(\d{4})['’]s\//); const key = match ? `${match[1].slice(0, 3)}0s` : "other"; decades[key] = (decades[key] ?? 0) + 1; }
  const pct = (n: number) => `${((n / rows.length) * 100).toFixed(1)}%`;
  const report = `# VirtualDJ Library Coverage\n\nGenerated: ${new Date().toISOString()}\nSource: ${scan.path}\n\n## Reconciliation\n\n- Original inventory path records: **13,292**\n- Raw XML video records: **${summary.rawXmlVideoRecords}**\n- Raw XML unique path records: **${summary.rawXmlUniquePathRecords}**\n- Raw XML duplicate references: **${summary.rawXmlDuplicateReferences}**\n- Parsed video-extension database records: **${summary.originalVideoRecords}**\n- Records under the actual VIDEO root: **${summary.videoRootRecords}**\n- Unique existing physical VIDEO files: **${summary.uniqueExistingPhysicalVideoFiles}**\n- Duplicate VDJ references removed: **${summary.duplicateReferencesRemoved}**\n- Missing/stale VIDEO-root references: **${summary.missingStale}**\n- Existing records outside the actual VIDEO root: **${summary.outsideVideoRecords}**\n\nThe corrected denominator is **${rows.length}** current existing physical files under ${VDJ_VIDEO_ROOT}. This is two below the VirtualDJ UI reference of 8,832; the current filesystem scan found 8,830 files, while the database has 8,874 VIDEO-root references including 42 stale references and two duplicate records. The remaining two-file difference cannot be reconciled from the current database/filesystem snapshot alone and should be checked against the VirtualDJ UI's inclusion rules or refresh timing.\n\n## Coverage totals\n\n- Canonical identity: ${JSON.stringify(summary.canonicalIdentity)}\n- Year source: ${JSON.stringify(summary.year)}\n- Story: ${JSON.stringify(summary.story)}\n- Hero: ${JSON.stringify(summary.hero)}\n- Chart Journey: ${JSON.stringify(summary.chartJourney)}\n- Preparation: ${JSON.stringify(summary.preparation)}\n\nPercentages use ${rows.length} as the denominator. Canonical/trusted year: ${summary.year["canonical/trusted"] ?? 0} (${pct(summary.year["canonical/trusted"] ?? 0)}); VDJ fallback: ${summary.year.vdj_fallback ?? 0} (${pct(summary.year.vdj_fallback ?? 0)}); unknown: ${summary.year.unknown ?? 0} (${pct(summary.year.unknown ?? 0)}).\n\n## Major library folders / decades\n\n${Object.entries(decades).sort().map(([k, v]) => `- ${k}: ${v}`).join("\n")}\n\n## Validation sample: 20 real tracks\n\n${validation.map((r) => `- ${r.vdjArtist} — ${r.vdjTitle}: ${r.rvtr ?? "unresolved"}; ${r.preparationStatus}; hero=${r.heroStatus}; story=${r.storyStatus}; year=${r.displayYear ?? "unknown"} (${r.displayYearSource}); chart=${r.chartJourneyStatus}`).join("\n")}\n\n## Approved prototype songs\n\n${sample.map((r) => `- ${r.vdjArtist} — ${r.vdjTitle}: ${r.rvtr ?? "unresolved"}; ${r.preparationStatus}; hero=${r.heroStatus}; story=${r.storyStatus}; year=${r.displayYear ?? "unknown"}; chart=${r.chartJourneyStatus}`).join("\n")}\n\nIdentity resolution is exact-label-only in this inventory; unresolved records are not fuzzy matched. No stories or video frames were generated.\n`;
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, "inventory.json"), JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), source: scan, summary, records: rows }, null, 2) + "\n");
  await writeFile(join(OUT_DIR, "coverage-report.md"), report.replace("Identity resolution is exact-label-only", `## Prototype reconciliation\n\n${prototypeAudit.join("\\n")}\n\nIdentity resolution is exact-label-only`));
  console.log(JSON.stringify({ output: OUT_DIR, ...summary }, null, 2));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
