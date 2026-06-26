/**
 * SQL call graph audit for /retroverse-2/song/[rvtr] — temporary instrumentation only.
 * Patches pool.query for the duration of this CLI run; no production code changes.
 *
 * Usage: NODE_OPTIONS='--require ./tools/finance/preload-server-only.cjs' \
 *   npx tsx tools/experience/audit-song-page-queries.ts RVTR025701
 */
require("../finance/preload-server-only.cjs");

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const RVTR = (process.argv[2] ?? "RVTR025701").trim().toUpperCase();

type QueryRecord = {
  normalizedSql: string;
  rawSql: string;
  params: unknown[];
  caller: string;
  seq: number;
};

const queryLog: QueryRecord[] = [];
let seq = 0;

function normalizeSql(sql: string): string {
  return sql
    .replace(/\$\d+/g, "$?")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function callerFromStack(): string {
  const stack = new Error().stack ?? "";
  const lines = stack.split("\n").slice(3);
  for (const line of lines) {
    if (line.includes("node_modules")) continue;
    if (line.includes("audit-song-page-queries")) continue;
    if (line.includes("/lib/inspect/pg")) continue;
    const m = line.match(/at (?:async )?(?:Object\.)?(\w+)?.*?(\/lib\/[^:)]+|\/app\/[^:)]+)/);
    if (m) {
      const fn = m[1] ?? "(anonymous)";
      const file = m[2]!.replace(process.cwd(), "").replace(/^\//, "");
      return `${fn} ← ${file}`;
    }
  }
  return "unknown";
}

async function installQueryHook() {
  const pg = await import("../../lib/inspect/pg.ts");
  const pool = pg.getInspectPool();
  const originalQuery = pool.query.bind(pool);

  pool.query = ((...args: Parameters<typeof originalQuery>) => {
    const text = typeof args[0] === "string" ? args[0] : (args[0] as { text?: string }).text ?? "";
    const params = typeof args[0] === "string" ? args[1] : (args[0] as { values?: unknown[] }).values;
    queryLog.push({
      normalizedSql: normalizeSql(text),
      rawSql: text.trim(),
      params: (params as unknown[]) ?? [],
      caller: callerFromStack(),
      seq: ++seq,
    });
    return originalQuery(...args);
  }) as typeof pool.query;
}

async function simulatePageLoad(includeMetadataPass: boolean) {
  queryLog.length = 0;
  seq = 0;

  const { loadTrackPage } = await import("../../lib/track/load-track-page.ts");
  const { loadArtistPage } = await import("../../lib/artist/load-artist-page.ts");
  const { loadRvYearChartHistoryCore } = await import("../../lib/artist/load-chart-history.ts");
  const { isUsableChartHistory } = await import("../../lib/artist/chart-history.ts");
  const { buildRvYearDestination, enrichRvYearDestination } = await import(
    "../../lib/rv-year/enrich-rv-year-destination.ts"
  );
  const { resolveTrackPlayback } = await import("../../lib/playback/resolve-track-playback.ts");
  const { loadSongControlPackage, songControlData } = await import(
    "../../lib/retroverse-2/song-control.ts"
  );
  const { loadPatronSongExperience } = await import(
    "../../lib/retroverse/experience/load-patron-experience.ts"
  );

  if (includeMetadataPass) {
    await loadTrackPage(RVTR);
  }

  const track = await loadTrackPage(RVTR);
  if (!track) throw new Error(`Track not found: ${RVTR}`);

  const year =
    track.releaseYear ??
    (track.firstChartDate ? Number(track.firstChartDate.slice(0, 4)) : null) ??
    track.albums[0]?.releaseYear ??
    null;

  async function yearDestination() {
    if (!year) return null;
    const history = await loadRvYearChartHistoryCore(year, new Map(), null);
    if (!history || !isUsableChartHistory(history)) return null;
    return enrichRvYearDestination(buildRvYearDestination(history, year));
  }

  const [artist, destination, playback, controlPackage] = await Promise.all([
    loadArtistPage(track.artistSlug),
    yearDestination(),
    resolveTrackPlayback(track.rvtr, { title: track.title, artist: track.artistName }),
    loadSongControlPackage(track),
  ]);

  const control = songControlData(controlPackage);

  await loadPatronSongExperience({
    track,
    pkg: controlPackage,
    control,
    artist,
    destination,
    releaseYear: year,
    lengthHint: control.facts?.length ?? null,
  });

  return { track, year, artistSlug: track.artistSlug };
}

type QueryGroup = {
  normalizedSql: string;
  rawSql: string;
  count: number;
  callers: Map<string, number>;
  sampleParams: unknown[][];
  firstSeq: number;
};

function groupQueries(records: QueryRecord[]): QueryGroup[] {
  const groups = new Map<string, QueryGroup>();

  for (const rec of records) {
    const key = rec.normalizedSql;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.callers.set(rec.caller, (existing.callers.get(rec.caller) ?? 0) + 1);
      if (existing.sampleParams.length < 2) existing.sampleParams.push(rec.params);
    } else {
      groups.set(key, {
        normalizedSql: rec.normalizedSql,
        rawSql: rec.rawSql,
        count: 1,
        callers: new Map([[rec.caller, 1]]),
        sampleParams: [rec.params],
        firstSeq: rec.seq,
      });
    }
  }

  return [...groups.values()].sort((a, b) => a.firstSeq - b.firstSeq);
}

function sqlPurpose(normalized: string): string {
  if (normalized.startsWith("select 1::int")) return "Postgres connectivity ping";
  if (normalized.includes("from canonical_track_display") && normalized.includes("<> upper(trim($?))"))
    return "Related tracks by same artist";
  if (normalized.includes("from canonical_track_display") && normalized.includes("peak_hot100_position"))
    return "Resolve track by RVTR";
  if (
    normalized.includes("from canonical_track_display") &&
    normalized.includes("limit 1") &&
    normalized.includes("canonical_title, canonical_artist_name") &&
    !normalized.includes("peak_hot100")
  )
    return "Playback track title/artist confirm";
  if (normalized.includes("from canonical_track_display") && normalized.includes("limit 1"))
    return "Resolve track by RVTR";
  if (normalized.includes("from canonical_album_tracks") && normalized.includes("album_artwork_links"))
    return "Track album links + cover artwork";
  if (normalized.includes("from chart_appearances") && normalized.includes("canonical_tracks"))
    return "Track chart trajectory (canonical join)";
  if (normalized.includes("from canonical_track_display") && normalized.includes("<> upper(trim($?))"))
    return "Related tracks by same artist";
  if (normalized.includes("with rvtr_list as") && normalized.includes("has_owned_video"))
    return "Video coverage batch (owned VIDEO + YouTube)";
  if (normalized.includes("from artists where lower(trim(canonical_name))"))
    return "Artist lookup by exact name";
  if (normalized.includes("from artists where") && normalized.includes("like '%'"))
    return "Artist lookup fuzzy fallback";
  if (normalized.includes("from artists") && normalized.includes("regexp_replace"))
    return "Artist lookup by slug";
  if (normalized.includes("from albums al") && normalized.includes("group by al.id") && normalized.includes("b200_peak"))
    return "Artist essential albums";
  if (normalized.includes("from canonical_track_display") && normalized.includes("has_vdj_media"))
    return "Artist signature tracks";
  if (normalized.includes("extract(year from ca.chart_date)") && normalized.includes("limit 8"))
    return "Artist dominant chart years";
  if (normalized.includes("/ 10) * 10") && normalized.includes("group by 1"))
    return "Artist chart decades";
  if (normalized.includes("hot100_rows") && normalized.includes("top10_hits"))
    return "Artist chart/library stats aggregate";
  if (normalized.includes("canonical_album_tracks cat") && normalized.includes("any($?::text[])"))
    return "Track→album RVAL for artist signature track covers";
  if (normalized.includes("chart_appearances ca1") && normalized.includes("co_weeks"))
    return "Related artists via chart co-occurrence";
  if (normalized.includes("from youtube_video_tracks"))
    return "YouTube playback link lookup";
  if (normalized.includes("from media_track_links"))
    return "Owned media asset lookup for playback";
  if (normalized.includes("union all") && normalized.includes("billboard hot 100"))
    return "RV year chart history (Hot 100 + Album 200 union)";
  return "Other SQL";
}

function moduleFromCaller(caller: string): string {
  const m = caller.match(/← (.+)$/);
  return m?.[1] ?? caller;
}

function pagePathFromCaller(caller: string): string {
  const mod = moduleFromCaller(caller);
  if (mod.includes("load-track-page")) return "page.tsx → loadTrackPage → hero section";
  if (mod.includes("load-artist-page")) return "page.tsx → loadArtistPage → AttractTour / LivingSong discovery";
  if (mod.includes("load-chart-history")) return "page.tsx → yearDestination → year discovery shelf";
  if (mod.includes("enrich-rv-year-destination")) return "page.tsx → enrichRvYearDestination → year destination cards";
  if (mod.includes("resolve-track-playback")) return "page.tsx → resolveTrackPlayback → RetroverseVideoPlayer";
  if (mod.includes("load-related-artists")) return "page.tsx → loadArtistPage → discovery shelves";
  if (mod.includes("resolve-artist")) return "page.tsx → resolveArtistFromSlug (artist/year enrichment)";
  if (mod.includes("load-track-coverage")) return "page.tsx → coverage badge (hero + year singles)";
  return "page.tsx (server render chain)";
}

function consumptionTags(purpose: string, normalized: string): string[] {
  const tags: string[] = [];
  if (purpose.includes("ping")) tags.push("fallback/debug");
  if (purpose.includes("Resolve track by RVTR") || purpose.includes("Playback track title"))
    tags.push("hero");
  if (purpose.includes("album links") || purpose.includes("RVAL for artist")) tags.push("artwork");
  if (purpose.includes("chart trajectory") || purpose.includes("RV year chart")) tags.push("chart journey");
  if (purpose.includes("Related tracks") || purpose.includes("Related artists")) tags.push("related songs");
  if (
    purpose.includes("Artist essential") ||
    purpose.includes("Artist signature") ||
    purpose.includes("dominant chart") ||
    purpose.includes("chart decades") ||
    purpose.includes("stats aggregate") ||
    purpose.includes("RV year") ||
    purpose.includes("Artist lookup by slug")
  )
    tags.push("discovery shelves");
  if (purpose.includes("coverage") || purpose.includes("YouTube") || purpose.includes("media asset"))
    tags.push("hero");
  if (tags.length === 0) tags.push("discovery shelves");
  return [...new Set(tags)];
}

function tableHits(normalized: string): string[] {
  const tables = [
    "canonical_track_display",
    "canonical_track_versions",
    "canonical_tracks",
    "canonical_album_tracks",
    "media_track_links",
    "media_assets",
    "chart_appearances",
    "tracks",
    "artists",
    "albums",
    "album_artwork_links",
    "album_external_keys",
    "youtube_video_tracks",
    "youtube_videos",
  ];
  return tables.filter((t) => normalized.includes(t));
}

function experienceJsonGone(purpose: string, tags: string[]): boolean {
  if (purpose.includes("ping")) return false;
  if (tags.includes("hero") && !tags.includes("discovery shelves")) {
    if (purpose.includes("Resolve track by RVTR")) return false;
    if (purpose.includes("album links")) return false;
    if (purpose.includes("YouTube") || purpose.includes("media asset")) return false;
    if (purpose.includes("coverage")) return false;
  }
  if (tags.includes("chart journey")) return true;
  if (tags.includes("related songs")) return true;
  if (tags.includes("discovery shelves")) return true;
  if (purpose.includes("Artist lookup")) return true;
  if (purpose.includes("Playback track title")) return true; // redundant if hero already loaded track
  return false;
}

function precomputeCandidate(purpose: string, count: number): string | null {
  if (count >= 2) return `Runs ${count}× — batch or cache at package build time`;
  if (purpose.includes("RV year chart")) return "Precompute per RV year during experience refresh";
  if (purpose.includes("Artist essential") || purpose.includes("Artist signature"))
    return "Embed in experience.json discovery shelf payload";
  if (purpose.includes("chart trajectory")) return "Embed trajectory in experience.json chart chapter";
  if (purpose.includes("Related tracks")) return "Embed related shelf items in experience.json";
  if (purpose.includes("enrich") || purpose.includes("Artist lookup by slug"))
    return "Resolve defining-artist hrefs at experience build, not page load";
  if (purpose.includes("Resolve track by RVTR") && purpose.includes("Playback"))
    return "Dedupe with loadTrackPage track row (same table, 2× today)";
  return null;
}

function buildReport(meta: {
  rvtr: string;
  trackTitle: string;
  artist: string;
  year: number | null;
  singleLog: QueryRecord[];
  metaLog: QueryRecord[];
  singleGroups: QueryGroup[];
}) {
  const lines: string[] = [];
  const total = meta.singleLog.length;
  const goneCount = meta.singleGroups
    .filter((g) => experienceJsonGone(sqlPurpose(g.normalizedSql), consumptionTags(sqlPurpose(g.normalizedSql), g.normalizedSql)))
    .reduce((n, g) => n + g.count, 0);

  lines.push(`# SQL Call Graph — /retroverse-2/song/${meta.rvtr}`);
  lines.push("");
  lines.push("Instrumentation: temporary pool.query hook in `tools/experience/audit-song-page-queries.ts` (CLI only, no production changes).");
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("|-------|-------|");
  lines.push(`| Route | \`/retroverse-2/song/${meta.rvtr}\` |`);
  lines.push(`| Track | ${meta.trackTitle} — ${meta.artist} |`);
  lines.push(`| Year | ${meta.year ?? "unknown"} |`);
  lines.push(`| Captured | ${new Date().toISOString()} |`);
  lines.push(`| **Total SQL executions (single request)** | **${total}** |`);
  lines.push(`| Distinct query shapes | ${meta.singleGroups.length} |`);
  lines.push(`| With separate generateMetadata pass | ${meta.metaLog.length} (+${meta.metaLog.length - total}) |`);
  lines.push(`| Package/research SQL | 0 (JSON file read only) |`);
  lines.push(`| buildPatronSongExperience SQL | 0 |`);
  lines.push("");

  lines.push("## 1. Call graph");
  lines.push("");
  lines.push("```");
  lines.push("GET /retroverse-2/song/RVTR025701");
  lines.push("│");
  lines.push("├─ generateMetadata()                    [optional separate pass, +6 SQL if uncached]");
  lines.push("│  └─ loadTrackPage(rvtr)                lib/track/load-track-page.ts");
  lines.push("│");
  lines.push("└─ Retroverse2SongPage                   app/retroverse-2/song/[rvtr]/page.tsx");
  lines.push("   │");
  lines.push("   ├─ loadTrackPage(rvtr)                → hero: title, artist, year, coverUrl, chart meta");
  lines.push("   │  ├─ inspectPing");
  lines.push("   │  ├─ canonical_track_display          (track resolve)");
  lines.push("   │  ├─ canonical_album_tracks + artwork  (album/cover)");
  lines.push("   │  ├─ chart_appearances + canonical_tracks (trajectory)");
  lines.push("   │  ├─ canonical_track_display          (related tracks)");
  lines.push("   │  └─ loadTrackCoverageByRvtr          (hasVdjMedia flag)");
  lines.push("   │");
  lines.push("   ├─ Promise.all");
  lines.push("   │  ├─ loadArtistPage(slug)            → AttractTourExperience / LivingSongExperience shelves");
  lines.push("   │  │  ├─ resolveArtistFromSlug");
  lines.push("   │  │  ├─ 6× parallel artist/chart queries");
  lines.push("   │  │  ├─ track→album RVAL cover batch");
  lines.push("   │  │  └─ loadRelatedArtistsFromGraph   (home-search HTTP unavailable)");
  lines.push("   │  │");
  lines.push("   │  ├─ yearDestination()               → year discovery + defining artists");
  lines.push("   │  │  ├─ loadRvYearChartHistoryCore     (1969 Hot100 ∪ Album200)");
  lines.push("   │  │  └─ enrichRvYearDestination");
  lines.push("   │  │     ├─ resolveArtistFromSlug ×N   (defining artists for year)");
  lines.push("   │  │     └─ loadTrackCoverageByRvtr   (year top singles coverage)");
  lines.push("   │  │");
  lines.push("   │  ├─ resolveTrackPlayback(rvtr)      → RetroverseVideoPlayer");
  lines.push("   │  │  ├─ canonical_track_display      (redundant title/artist)");
  lines.push("   │  │  ├─ youtube_video_tracks");
  lines.push("   │  │  └─ media_track_links + media_assets");
  lines.push("   │  │");
  lines.push("   │  └─ loadSongControlPackage          → JSON only, no SQL");
  lines.push("   │");
  lines.push("   └─ loadPatronSongExperience           → AttractTour + LivingSong (no SQL)");
  lines.push("      └─ buildPatronSongExperience OR experience.json hydrate");
  lines.push("");
  lines.push("Client (post-hydration, not counted):");
  lines.push("├─ LiveChannelFollower → fetch /api/sunday-nights/current");
  lines.push("└─ RetroverseVideoPlayer → SSR playback manifest only");
  lines.push("```");
  lines.push("");

  lines.push("## 2. Grouped query table");
  lines.push("");
  lines.push("| # | × | Purpose | Module | Page/component path | Consumption | Tables hit | Gone w/ experience.json |");
  lines.push("|--:|--:|---------|--------|----------------------|-------------|------------|-------------------------|");

  meta.singleGroups.forEach((g, i) => {
    const purpose = sqlPurpose(g.normalizedSql);
    const tags = consumptionTags(purpose, g.normalizedSql);
    const topCaller = [...g.callers.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "?";
    const mod = moduleFromCaller(topCaller);
    const path = pagePathFromCaller(topCaller);
    const tables = tableHits(g.normalizedSql).join(", ") || "—";
    const gone = experienceJsonGone(purpose, tags) ? "yes" : "no";
    lines.push(
      `| ${i + 1} | ${g.count} | ${purpose} | \`${mod}\` | ${path} | ${tags.join(", ")} | ${tables} | ${gone} |`,
    );
  });

  lines.push("");
  lines.push("## 3. Execution timeline (first occurrence order)");
  lines.push("");
  for (const rec of meta.singleLog) {
    const purpose = sqlPurpose(rec.normalizedSql);
    lines.push(`${rec.seq}. \`${rec.caller.split(" ← ")[0]}\` — ${purpose}`);
  }
  lines.push("");

  lines.push("## 4. Suspected hot paths");
  lines.push("");
  lines.push("1. **Year enrichment loop** — `enrichRvYearDestination` calls `resolveArtistFromSlug` once per defining artist (~6–7× identical slug-query shape). Highest duplicate pattern on this page.");
  lines.push("2. **Dual track resolve** — `canonical_track_display` hit 3× with different column sets: `loadTrackPage` (full row), `resolveTrackPlayback` (title/artist only), `loadArtistPage` (signature tracks batch).");
  lines.push("3. **Dual coverage batch** — `loadTrackCoverageByRvtr` runs from both `loadTrackPage` (hero badge) and `enrichRvYearDestination` (year top singles). Same CTE shape, different RVTR sets.");
  lines.push("4. **Full artist page fetch for one song** — `loadArtistPage` pulls albums, tracks, year/decade aggregates, stats, and related artists even though song page only needs discovery shelf cards.");
  lines.push("5. **RV year chart union** — large Hot 100 ∪ Album 200 scan for 1969; feeds year destination shelf only.");
  lines.push("");

  lines.push("## 5. Duplicate / repeated queries (precompute candidates)");
  lines.push("");
  lines.push("| Query | × | Recommendation |");
  lines.push("|-------|--:|------------------|");
  for (const g of [...meta.singleGroups].sort((a, b) => b.count - a.count)) {
    const purpose = sqlPurpose(g.normalizedSql);
    const hint = precomputeCandidate(purpose, g.count);
    if (hint) lines.push(`| ${purpose} | ${g.count} | ${hint} |`);
  }
  lines.push("");

  lines.push("## 6. experience.json-only load estimate");
  lines.push("");
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Current single-request SQL | ${total} |`);
  lines.push(`| Would disappear with prebuilt experience.json | ~${goneCount} |`);
  lines.push(`| Likely remain (hero + playback shell) | ~${total - goneCount} |`);
  lines.push("");
  lines.push("**Remain at page time:** track resolve (1), album/cover (1), playback media/youtube (2–3), coverage ping (1), optional coverage batch (1).");
  lines.push("");
  lines.push("**Move to package/experience generation:** chart trajectory, related tracks, full artist page queries, RV year union, defining-artist slug resolves, discovery shelf assembly, era exhibit inputs.");
  lines.push("");

  lines.push("## 7. Table hit summary");
  lines.push("");
  const tableCounts = new Map<string, number>();
  for (const rec of meta.singleLog) {
    for (const t of tableHits(rec.normalizedSql)) {
      tableCounts.set(t, (tableCounts.get(t) ?? 0) + 1);
    }
  }
  lines.push("| Table | Query executions touching it |");
  lines.push("|-------|------------------------------:|");
  for (const [t, c] of [...tableCounts.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`| \`${t}\` | ${c} |`);
  }
  lines.push("");
  lines.push("Note: `canonical_track_versions` appears inside coverage subquery only. No package/research tables queried — package loaded from filesystem JSON.");
  lines.push("");

  lines.push("## 8. What should move into package/experience generation");
  lines.push("");
  lines.push("| Data need | Current source | Move to |");
  lines.push("|-----------|----------------|---------|");
  lines.push("| Chart journey chapter | chart_appearances + canonical_tracks | experience.json `chart` chapter |");
  lines.push("| Story chapters | song package JSON (already) | experience.json (already planned) |");
  lines.push("| Discovery shelves (artist/related/year/album) | loadArtistPage + yearDestination + related tracks | experience.json `discoveryShelves` |");
  lines.push("| Timeline events | package intel (JSON) | experience.json |");
  lines.push("| Related songs cards | canonical_track_display same-artist | experience.json shelf items |");
  lines.push("| Year destination defining artists | enrichRvYearDestination slug loop | experience build-time href resolution |");
  lines.push("| Hero title/artist/year/cover | loadTrackPage | **stay on page** (or slim hero DTO in experience.json) |");
  lines.push("| Video playback URL | resolveTrackPlayback | **stay on page** (playback is runtime/media) |");
  lines.push("");

  lines.push("## 9. Query details (SQL shapes)");
  lines.push("");
  meta.singleGroups.forEach((g, i) => {
    const purpose = sqlPurpose(g.normalizedSql);
    lines.push(`### ${i + 1}. ${purpose} (${g.count}×)`);
    lines.push("");
    for (const [caller, count] of [...g.callers.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${count}× \`${caller}\``);
    }
    lines.push("");
    lines.push("```sql");
    lines.push(g.rawSql.slice(0, 1400) + (g.rawSql.length > 1400 ? "\n-- … truncated …" : ""));
    lines.push("```");
    lines.push("");
  });

  return lines.join("\n");
}

async function main() {
  await installQueryHook();

  const { inspectPing } = await import("../../lib/inspect/pg.ts");
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error("Postgres unavailable:", ping.error);
    process.exit(1);
  }

  queryLog.length = 0;
  seq = 0;
  const singleResult = await simulatePageLoad(false);
  const singleLog = [...queryLog];
  const singleGroups = groupQueries(singleLog);

  queryLog.length = 0;
  seq = 0;
  await simulatePageLoad(true);
  const metaLog = [...queryLog];

  const report = buildReport({
    rvtr: RVTR,
    trackTitle: singleResult.track.title,
    artist: singleResult.track.artistName,
    year: singleResult.year,
    singleLog,
    metaLog,
    singleGroups,
  });

  const outDir = join(process.cwd(), "reports", "experience-2.0");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `SQL-CALL-GRAPH-${RVTR}.md`);
  await writeFile(outPath, report + "\n", "utf8");

  console.log(`Total SQL: ${singleLog.length} (${singleGroups.length} distinct shapes)`);
  console.log(`Report: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
