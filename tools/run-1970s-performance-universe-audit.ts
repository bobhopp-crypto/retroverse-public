/**
 * 1970s Performance Universe enrichment audit.
 * Source: VirtualDJ VIDEO/1970's folder (Postgres media_assets + VDJ PlayCount).
 *
 * Run: npx tsx tools/run-1970s-performance-universe-audit.ts
 */
import { writeFile } from "fs/promises";
import { join } from "path";

import { inspectPing, inspectQuery } from "../lib/inspect/pg";
import { opsVideoMediaAndClause } from "../lib/ops/ops-video-media";
import { loadVdjMetaForPaths } from "../lib/ops/rvtags-review/vdj-lookup";
import {
  loadRetroverseTagsStore,
  tagsForRvtr,
} from "../lib/ops/retroverse-tags/store";
import type { RvTagId } from "../lib/ops/rvtags-review/vocabulary";
import { loadYearWorkspaceState } from "../lib/ops/year-workspace/state";
import { reviewForVideoRow } from "../lib/ops/year-workspace/review-state";
import { effectiveClassification } from "../lib/ops/year-workspace/review-types";
import { videoUniverseWorkspaceKey } from "../lib/ops/year-workspace/keys";

const DECADE_FOLDER_SQL = `
  (
    coalesce(ma.source_path, ma.directory_path, '') ~* '/1970s(/|$)'
    OR coalesce(ma.source_path, ma.directory_path, '') ~* '/1970''s(/|$)'
  )
`;

const TV_TAG_IDS = new Set<RvTagId>(["TVTheme", "TVFavorite"]);
const MOVIE_PATH_RE =
  /\b(movie|film|soundtrack|cinema|trailer|feature|bollywood)\b|from the film|from the movie/i;
const TV_PATH_RE =
  /\b(tv|television|midnight special|soul train|bandstand|totp|top of the pops|american bandstand|snl|saturday night live|carson|sullivan)\b/i;

type DbRow = {
  media_id: number;
  artist_text: string | null;
  title_text: string | null;
  filename: string | null;
  source_path: string | null;
  directory_path: string | null;
  year_text: string | null;
  graph_track_id: number | null;
  rvtr: string | null;
  peak_hot100: number | null;
  chart_weeks: number | null;
  has_hot100: boolean | null;
  has_vdj_media: boolean | null;
  album_count: number;
  album_with_cover: number;
  chart_point_count: number;
  related_track_count: number;
};

type AuditRow = {
  mediaId: number;
  artist: string;
  title: string;
  path: string;
  performanceYear: number | null;
  playCount: number | null;
  rvtr: string | null;
  peakHot100: number | null;
  coverScore: number;
  chartScore: number;
  albumScore: number;
  commentaryScore: number;
  movieLinkage: boolean;
  tvLinkage: boolean;
  completenessPct: number;
  enrichmentPriority: number;
  canonicalTags: RvTagId[];
  classification: string;
  tagSource: string;
};

function normPath(p: string | null): string | null {
  if (!p?.trim()) return null;
  return p
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\\/g, "/")
    .trim();
}

function parsePerformanceYear(yearText: string | null, path: string | null): number | null {
  const raw = yearText?.trim() ?? "";
  if (/^\d{4}$/.test(raw)) {
    const y = Number(raw);
    if (y >= 1970 && y <= 1979) return y;
  }
  const m = path?.match(/\/(197[0-9])(?:\/|$)/);
  if (m) return Number(m[1]);
  return null;
}

function scoreCover(row: DbRow): number {
  if (row.album_with_cover > 0) return 1;
  if (row.album_count > 0) return 0.5;
  return 0;
}

function scoreChart(row: DbRow): number {
  let s = 0;
  if (row.has_hot100) s += 0.35;
  if (row.peak_hot100 != null) s += 0.25;
  if ((row.chart_weeks ?? 0) > 0) s += 0.2;
  if (row.chart_point_count >= 4) s += 0.2;
  else if (row.chart_point_count > 0) s += 0.1;
  return Math.min(1, s);
}

function scoreAlbum(row: DbRow): number {
  if (row.album_count === 0) return 0;
  if (row.album_count >= 2 && row.album_with_cover > 0) return 1;
  if (row.album_with_cover > 0) return 0.75;
  return 0.4;
}

function scoreCommentary(
  canonicalTags: RvTagId[],
  classification: string,
  classificationLocked: boolean,
  vdjUser2: string | null,
): number {
  const editorialTags = canonicalTags.filter(
    (t) => !["SingAlong", "CrowdFavorite", "DanceFloor", "PartyStarter", "SlowDance", "TVFavorite"].includes(t),
  );
  if (editorialTags.length >= 2) return 1;
  if (editorialTags.length === 1) return 0.65;
  if (canonicalTags.length > 0) return 0.5;
  if (classificationLocked && classification !== "Fill") return 0.45;
  if (vdjUser2?.trim()) return 0.25;
  return 0;
}

function detectMovieTv(path: string, tags: RvTagId[]): { movie: boolean; tv: boolean } {
  const movie = MOVIE_PATH_RE.test(path) || tags.includes("Novelty");
  const tv =
    tags.some((t) => TV_TAG_IDS.has(t)) || TV_PATH_RE.test(path) || tags.includes("TVTheme");
  return { movie, tv };
}

function completenessPct(row: Pick<AuditRow, "coverScore" | "chartScore" | "albumScore" | "commentaryScore">): number {
  const avg = (row.coverScore + row.chartScore + row.albumScore + row.commentaryScore) / 4;
  return Math.round(avg * 100);
}

async function loadMatched1970sRows(): Promise<DbRow[]> {
  return inspectQuery<DbRow>(
    `
    SELECT
      ma.id AS media_id,
      ma.artist_text,
      ma.title_text,
      ma.filename,
      ma.source_path,
      ma.directory_path,
      ma.year_text,
      link.graph_track_id,
      ctd.track_id AS rvtr,
      ctd.peak_hot100_position AS peak_hot100,
      ctd.chart_weeks,
      ctd.has_hot100,
      ctd.has_vdj_media,
      coalesce(albums.album_count, 0)::int AS album_count,
      coalesce(albums.album_with_cover, 0)::int AS album_with_cover,
      coalesce(charts.chart_point_count, 0)::int AS chart_point_count,
      coalesce(related.related_track_count, 0)::int AS related_track_count
    FROM media_assets ma
    INNER JOIN LATERAL (
      SELECT mtl.track_id::int AS graph_track_id
      FROM media_track_links mtl
      WHERE mtl.media_asset_id = ma.id
      ORDER BY mtl.confidence_score DESC NULLS LAST
      LIMIT 1
    ) link ON true
    LEFT JOIN tracks t ON t.id = link.graph_track_id
    LEFT JOIN canonical_track_versions ctv
      ON ctv.graph_track_id = t.id AND ctv.is_primary IS TRUE
    LEFT JOIN canonical_tracks ct ON ct.id = ctv.canonical_track_id
    LEFT JOIN canonical_track_display ctd ON ctd.id = ct.id
    LEFT JOIN LATERAL (
      SELECT
        count(DISTINCT al.id)::int AS album_count,
        count(DISTINCT al.id) FILTER (
          WHERE coalesce(al.canonical_cover_path, '') <> ''
             OR EXISTS (
               SELECT 1 FROM album_artwork_links aal
               WHERE aal.album_id = al.id
                 AND (coalesce(aal.canonical_cover_path, '') <> '' OR coalesce(aal.r2_cover_key, '') <> '')
             )
        )::int AS album_with_cover
      FROM canonical_album_tracks cat
      JOIN albums al ON al.id = cat.album_id
      WHERE upper(trim(cat.canonical_track_key)) = upper(trim(coalesce(ctd.track_id, '')))
    ) albums ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS chart_point_count
      FROM chart_appearances ca
      WHERE ca.track_id = link.graph_track_id
        AND ca.chart_name ILIKE '%Hot 100%'
    ) charts ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS related_track_count
      FROM canonical_track_display c2
      WHERE lower(regexp_replace(trim(c2.canonical_artist_name), '^the\\s+', '', 'i'))
          = lower(regexp_replace(trim(coalesce(ctd.canonical_artist_name, ma.artist_text, '')), '^the\\s+', '', 'i'))
        AND upper(trim(c2.track_id)) <> upper(trim(coalesce(ctd.track_id, '')))
    ) related ON true
    WHERE ${DECADE_FOLDER_SQL}
    ${opsVideoMediaAndClause("ma")}
    ORDER BY lower(coalesce(ma.artist_text, ma.filename)), lower(coalesce(ma.title_text, ma.filename))
    `,
  );
}

function mdTable(headers: string[], rows: string[][]): string {
  const esc = (s: string) => s.replace(/\|/g, "\\|");
  const lines = [
    `| ${headers.map(esc).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((r) => `| ${r.map((c) => esc(String(c))).join(" | ")} |`),
  ];
  return lines.join("\n");
}

async function main() {
  const ping = await inspectPing();
  if (!ping.ok) {
    console.error("Postgres offline:", ping.error);
    process.exit(1);
  }

  const [dbRows, tagStore] = await Promise.all([
    loadMatched1970sRows(),
    loadRetroverseTagsStore(),
  ]);

  const paths = dbRows.map((r) => normPath(r.source_path ?? r.directory_path)).filter(Boolean) as string[];
  const vdjMeta = await loadVdjMetaForPaths(paths);

  const reviewStates = new Map<number, Awaited<ReturnType<typeof loadYearWorkspaceState>>>();
  for (let y = 1970; y <= 1979; y++) {
    reviewStates.set(y, await loadYearWorkspaceState(y));
  }

  const auditRows: AuditRow[] = [];

  for (const row of dbRows) {
    const path = normPath(row.source_path ?? row.directory_path) ?? "";
    const vdj = path ? vdjMeta.get(path) : undefined;
    const playCount = vdj?.playCount ?? null;
    const perfYear = parsePerformanceYear(row.year_text, path);
    const reviewState = reviewStates.get(perfYear ?? 1970) ?? reviewStates.get(1970)!;

    const workspaceKey = videoUniverseWorkspaceKey(row.media_id);
    const reviewRecord =
      reviewForVideoRow(reviewState, {
        workspaceKey,
        graphTrackId: row.graph_track_id,
      }) ?? null;
    const classification = effectiveClassification(reviewRecord, playCount);
    const canonicalTags = tagsForRvtr(tagStore, row.rvtr);
    const { movie, tv } = detectMovieTv(path, canonicalTags);

    const coverScore = scoreCover(row);
    const chartScore = scoreChart(row);
    const albumScore = scoreAlbum(row);
    const commentaryScore = scoreCommentary(
      canonicalTags,
      classification,
      reviewRecord?.classificationLocked === true,
      vdj?.user2 ?? null,
    );
    const completeness = completenessPct({ coverScore, chartScore, albumScore, commentaryScore });
    const gap = (100 - completeness) / 100;
    const playWeight = playCount != null ? Math.max(playCount, 1) : 0.5;
    const enrichmentPriority = Math.round(playWeight * gap * 100) / 100;

    auditRows.push({
      mediaId: row.media_id,
      artist: row.artist_text?.trim() || "Unknown",
      title: row.title_text?.trim() || row.filename?.trim() || "Untitled",
      path,
      performanceYear: perfYear,
      playCount,
      rvtr: row.rvtr?.trim().toUpperCase() ?? null,
      peakHot100: row.peak_hot100,
      coverScore,
      chartScore,
      albumScore,
      commentaryScore,
      movieLinkage: movie,
      tvLinkage: tv,
      completenessPct: completeness,
      enrichmentPriority,
      canonicalTags,
      classification,
      tagSource: canonicalTags.length ? "canonical" : vdj?.user2?.trim() ? "vdj_hint" : "none",
    });
  }

  const withRvtr = auditRows.filter((r) => r.rvtr);
  const playKnown = auditRows.filter((r) => r.playCount != null);
  const avgCompleteness =
    auditRows.length > 0
      ? Math.round(auditRows.reduce((s, r) => s + r.completenessPct, 0) / auditRows.length)
      : 0;

  const mostPlayedLeastComplete = [...auditRows]
    .filter((r) => r.playCount != null && r.playCount >= 3)
    .sort((a, b) => {
      const pri = (b.enrichmentPriority ?? 0) - (a.enrichmentPriority ?? 0);
      if (pri !== 0) return pri;
      return (b.playCount ?? 0) - (a.playCount ?? 0);
    })
    .slice(0, 25);

  const top100Candidates = [...auditRows]
    .sort((a, b) => {
      const pri = (b.enrichmentPriority ?? 0) - (a.enrichmentPriority ?? 0);
      if (pri !== 0) return pri;
      return (b.playCount ?? 0) - (a.playCount ?? 0);
    })
    .slice(0, 100);

  const byRvtr = new Map<string, AuditRow>();
  for (const row of auditRows) {
    if (!row.rvtr) continue;
    const prev = byRvtr.get(row.rvtr);
    if (!prev || (row.playCount ?? 0) > (prev.playCount ?? 0)) byRvtr.set(row.rvtr, row);
  }
  const uniqueRvtrCount = byRvtr.size;

  const completenessBuckets = {
    high: auditRows.filter((r) => r.completenessPct >= 75).length,
    mid: auditRows.filter((r) => r.completenessPct >= 40 && r.completenessPct < 75).length,
    low: auditRows.filter((r) => r.completenessPct < 40).length,
  };

  const report = `# 1970s Performance Universe Audit

**Date:** ${new Date().toISOString().slice(0, 10)}  
**Source:** VirtualDJ \`VIDEO/1970's\` folder (Postgres \`media_assets\` + VDJ \`database.xml\` PlayCount)  
**Grain:** One row per **matched** video file (graph link present)  
**Method:** \`tools/run-1970s-performance-universe-audit.ts\`

---

## Executive summary

| Metric | Value |
|--------|------:|
| Matched videos in 1970's folder | ${auditRows.length} |
| Distinct RVTR identities | ${uniqueRvtrCount} |
| Play count known (VDJ) | ${playKnown.length} (${auditRows.length ? Math.round((playKnown.length / auditRows.length) * 100) : 0}%) |
| RVTR resolved on graph link | ${withRvtr.length} |
| Average exhibit completeness | ${avgCompleteness}% |
| High completeness (≥75%) | ${completenessBuckets.high} |
| Low completeness (<40%) | ${completenessBuckets.low} |
| Movie linkage (proxy) | ${auditRows.filter((r) => r.movieLinkage).length} |
| TV linkage (proxy) | ${auditRows.filter((r) => r.tvLinkage).length} |

**Queue thesis:** Rank by **DJ rotation (PlayCount) × enrichment gap** — prioritize tracks you actually play that still lack exhibit depth.

---

## Scoring methodology

| Dimension | 0 | 0.5–0.75 | 1 |
|-----------|---|----------|---|
| **Cover** | No linked album | Albums without cover art | Album with resolved cover |
| **Chart** | No Hot 100 | Peak or weeks only | Hot 100 + peak + multi-week run |
| **Album** | No album graph link | Album without cover | Multiple albums + cover |
| **Commentary** | No tags / class | VDJ User2 hint or 1 tag | 2+ canonical Retroverse Tags |

**Completeness %** = average of four dimension scores × 100.

**Enrichment priority** = \`max(playCount, 0.5) × (100 − completeness%) / 100\`

**Movie / TV linkage** (boolean proxies — no graph edge yet):
- **TV:** \`TVTheme\` / \`TVFavorite\` tag, or path keywords (Soul Train, Bandstand, Midnight Special, etc.)
- **Movie:** path keywords (movie, film, soundtrack, trailer), or \`Novelty\` tag

---

## Most played / least complete (top 25)

Tracks with **PlayCount ≥ 3** ranked by enrichment priority.

${mdTable(
  ["Play", "Complete", "Priority", "Artist", "Title", "RVTR", "Peak", "Cover", "Chart", "Album", "Tags"],
  mostPlayedLeastComplete.map((r) => [
    String(r.playCount ?? "—"),
    `${r.completenessPct}%`,
    r.enrichmentPriority.toFixed(1),
    r.artist,
    r.title,
    r.rvtr ?? "—",
    r.peakHot100 != null ? String(r.peakHot100) : "—",
    String(r.coverScore),
    String(r.chartScore),
    String(r.albumScore),
    r.canonicalTags.length ? r.canonicalTags.join(", ") : r.tagSource,
  ]),
)}

---

## Top 100 enrichment candidates

Full queue for decade-based enrichment (all matched rows).

${mdTable(
  ["#", "Priority", "Play", "Complete", "RVTR", "Artist", "Title", "Peak", "Movie", "TV"],
  top100Candidates.map((r, i) => [
    String(i + 1),
    r.enrichmentPriority.toFixed(1),
    String(r.playCount ?? "—"),
    `${r.completenessPct}%`,
    r.rvtr ?? "—",
    r.artist,
    r.title,
    r.peakHot100 != null ? String(r.peakHot100) : "—",
    r.movieLinkage ? "Y" : "",
    r.tvLinkage ? "Y" : "",
  ]),
)}

---

## Completeness distribution

| Bucket | Count | % of matched |
|--------|------:|-------------:|
| High (≥75%) | ${completenessBuckets.high} | ${auditRows.length ? ((completenessBuckets.high / auditRows.length) * 100).toFixed(1) : 0}% |
| Mid (40–74%) | ${completenessBuckets.mid} | ${auditRows.length ? ((completenessBuckets.mid / auditRows.length) * 100).toFixed(1) : 0}% |
| Low (<40%) | ${completenessBuckets.low} | ${auditRows.length ? ((completenessBuckets.low / auditRows.length) * 100).toFixed(1) : 0}% |

---

## Dimension averages

| Dimension | Avg score (0–1) |
|-----------|----------------:|
| Cover | ${auditRows.length ? (auditRows.reduce((s, r) => s + r.coverScore, 0) / auditRows.length).toFixed(2) : "—"} |
| Chart | ${auditRows.length ? (auditRows.reduce((s, r) => s + r.chartScore, 0) / auditRows.length).toFixed(2) : "—"} |
| Album | ${auditRows.length ? (auditRows.reduce((s, r) => s + r.albumScore, 0) / auditRows.length).toFixed(2) : "—"} |
| Commentary | ${auditRows.length ? (auditRows.reduce((s, r) => s + r.commentaryScore, 0) / auditRows.length).toFixed(2) : "—"} |

---

## Operational notes

1. **PlayCount** is VDJ's rotation signal (\`Infos PlayCount\` in \`database.xml\`) — DJ usage proxy, not literal spins.
2. **Matched** = \`media_track_links\` present; RVTR from \`canonical_track_display\`.
3. **Commentary** uses canonical Retroverse Tags (\`ops/retroverse-tags-by-rvtr.json\`) + year-workspace classification — no standalone commentary field in graph yet.
4. **Movie/TV linkage** are path/tag proxies until media-graph edges exist.
5. Re-run after VDJ sync or tag passes: \`npx tsx tools/run-1970s-performance-universe-audit.ts\`

---

## JSON artifact

Machine-readable queue: \`reports/1970s-performance-universe-audit.json\`
`;

  const outDir = join(process.cwd(), "reports");
  await writeFile(join(outDir, "1970s-performance-universe-audit.md"), report, "utf8");
  await writeFile(
    join(outDir, "1970s-performance-universe-audit.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary: {
          matchedVideos: auditRows.length,
          uniqueRvtr: uniqueRvtrCount,
          playCountKnown: playKnown.length,
          avgCompletenessPct: avgCompleteness,
          completenessBuckets,
        },
        top100: top100Candidates,
        mostPlayedLeastComplete,
        rows: auditRows,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`Wrote reports/1970s-performance-universe-audit.md (${auditRows.length} matched rows)`);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
