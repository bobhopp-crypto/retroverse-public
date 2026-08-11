import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { scanVdjDatabase, type VdjLibraryEntry } from "@/lib/ops/intelligence/vdj-database";
import { loadSongPackage } from "@/lib/ops/intelligence/song-package-store";
import { resolveCanonicalTracksBatch } from "@/lib/public/canonical-public-resolver";
import { resolveVisualAssetPath } from "@/lib/ops/studio/collector/visual-extraction";

const OUT_DIR = join(process.cwd(), "reports", "vdj-library-coverage");
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
  // The inventory starts from VirtualDJ itself, so retain playable video in
  // VIDEO VAULT as well as the narrower ops-managed /VIDEO roots.
  const entries = scan.entries.filter((e) => VIDEO_EXTENSIONS.has(e.extension ?? ""));
  const packageIndex = new Map<string, RecordRow>();
  try {
    const raw = JSON.parse(await readFile(join(process.cwd(), "data/ops/intelligence/package-index.json"), "utf8"));
    for (const p of raw.packages ?? []) packageIndex.set(String(p.rvtr).toUpperCase(), p);
  } catch {}

  const exactRvtrs = [...new Set(entries.map((e) => e.label.trim().toUpperCase()).filter((v) => RVTR_RE.test(v)))];
  const canonical = await resolveCanonicalTracksBatch(exactRvtrs).catch(() => new Map());

  const rows: RecordRow[] = [];
  for (const entry of entries) {
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
  const summary = { total: rows.length, canonicalIdentity: count(rows, "canonicalStatus"), year: count(rows, "displayYearSource"), story: count(rows, "storyStatus"), hero: count(rows, "heroStatus"), chartJourney: count(rows, "chartJourneyStatus"), preparation: count(rows, "preparationStatus") };
  const sample = rows.filter((r) => ["RVTR285085", "RVTR461330", "RVTR251858", "RVTR009363"].includes(String(r.rvtr))).concat(rows.filter((r) => String(r.vdjTitle).toLowerCase().includes("best thing that ever"))).slice(0, 5);
  const validation = [...rows].sort((a, b) => String(a.vdjPath).localeCompare(String(b.vdjPath))).filter((r, i, all) => i === all.findIndex((x) => x.vdjPath === r.vdjPath)).slice(0, 20);
  const decades: Record<string, number> = {};
  for (const row of rows) { const match = String(row.vdjPath).match(/\/(\d{4})['’]s\//); const key = match ? `${match[1].slice(0, 3)}0s` : "other"; decades[key] = (decades[key] ?? 0) + 1; }
  const pct = (n: number) => `${((n / rows.length) * 100).toFixed(1)}%`;
  const report = `# VirtualDJ Library Coverage\n\nGenerated: ${new Date().toISOString()}\nSource: ${scan.path}\n\n## Totals\n\n- Total VDJ video tracks: **${rows.length}**\n- Canonical identity: ${JSON.stringify(summary.canonicalIdentity)}\n- Year source: ${JSON.stringify(summary.year)}\n- Story: ${JSON.stringify(summary.story)}\n- Hero: ${JSON.stringify(summary.hero)}\n- Chart Journey: ${JSON.stringify(summary.chartJourney)}\n- Preparation: ${JSON.stringify(summary.preparation)}\n\nPercentages use ${rows.length} as the denominator. Canonical/trusted year: ${summary.year["canonical/trusted"] ?? 0} (${pct(summary.year["canonical/trusted"] ?? 0)}); VDJ fallback: ${summary.year.vdj_fallback ?? 0} (${pct(summary.year.vdj_fallback ?? 0)}); unknown: ${summary.year.unknown ?? 0} (${pct(summary.year.unknown ?? 0)}).\n\n## Major library folders / decades\n\n${Object.entries(decades).sort().map(([k, v]) => `- ${k}: ${v}`).join("\n")}\n\n## Validation sample: 20 real tracks\n\n${validation.map((r) => `- ${r.vdjArtist} — ${r.vdjTitle}: ${r.rvtr ?? "unresolved"}; ${r.preparationStatus}; hero=${r.heroStatus}; story=${r.storyStatus}; year=${r.displayYear ?? "unknown"} (${r.displayYearSource}); chart=${r.chartJourneyStatus}`).join("\n")}\n\n## Approved prototype songs\n\n${sample.map((r) => `- ${r.vdjArtist} — ${r.vdjTitle}: ${r.rvtr ?? "unresolved"}; ${r.preparationStatus}; hero=${r.heroStatus}; story=${r.storyStatus}; year=${r.displayYear ?? "unknown"} (${r.displayYearSource}); chart=${r.chartJourneyStatus}`).join("\n")}\n\nIdentity resolution is exact-label-only in this inventory; unresolved records are not fuzzy matched. No stories or video frames were generated.\n`;
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, "inventory.json"), JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), source: scan, summary, records: rows }, null, 2) + "\n");
  await writeFile(join(OUT_DIR, "coverage-report.md"), report);
  console.log(JSON.stringify({ output: OUT_DIR, ...summary }, null, 2));
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
