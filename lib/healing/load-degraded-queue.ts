import { inspectQuery } from "@/lib/inspect/pg";
import { loadStandByMeClusterRvtrs } from "@/lib/healing/clusters/stand-by-me";
import type {
  HealingCoverStatus,
  HealingDegradationCounts,
  HealingDegradationFlag,
  HealingQueueState,
} from "@/lib/healing/degradation";
import { loadMissingLinkSummary } from "@/lib/track/album-link-recovery/audit-missing-links";
import { auditTrackAlbumLinks } from "@/lib/track/album-link-recovery/audit-track";
import { detectTrackHealingGaps } from "@/lib/track/album-link-recovery/detect-gaps";
import type { ScoredAlbumLinkCandidate } from "@/lib/track/album-link-recovery/types";

const QUEUE_LIMIT = 32;
const PER_SEED = 10;
const AUDIT_PREVIEW_LIMIT = 16;

type SeedMeta = {
  rvtr: string;
  title: string;
  artistName: string;
  releaseYear: number | null;
  chartWeeks: number;
  peakHot100: number | null;
  hasHot100: boolean;
  hasVdjMedia: boolean;
  albumLinkCount: number;
  flags: Set<HealingDegradationFlag>;
};

type DisplaySeedRow = {
  track_id: string;
  canonical_title: string;
  canonical_artist_name: string;
  first_chart_date: string | null;
  chart_weeks: number;
  peak_hot100_position: number | null;
  has_hot100: boolean;
  has_vdj_media: boolean;
  album_link_count: number;
};

function yearFromDate(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const y = Number(value.slice(0, 4));
  return Number.isFinite(y) && y > 0 ? y : null;
}

function coverStatus(missingCover: boolean, albumLinkCount: number): HealingCoverStatus {
  if (albumLinkCount === 0) return "no_album_link";
  if (missingCover) return "missing";
  return "ok";
}

function healingState(
  albumLinkCount: number,
  candidates: ScoredAlbumLinkCandidate[],
): HealingQueueState {
  if (albumLinkCount > 0) return "linked";
  if (candidates.length === 0) return "no_candidates";
  if (candidates[0]!.confidence >= 0.45) return "candidates_ready";
  return "degraded";
}

function chartStatus(hasHot100: boolean, chartWeeks: number, peak: number | null): string {
  if (!hasHot100) return "—";
  const peakLabel = peak != null ? `#${peak}` : "—";
  return `${chartWeeks}w · ${peakLabel}`;
}

async function loadDegradationCounts(): Promise<HealingDegradationCounts> {
  try {
    await inspectQuery(`SET LOCAL statement_timeout = '25s'`);
    const rows = await inspectQuery<{
      missing_album_links: number;
      missing_cover: number;
      duplicate_title_artist: number;
      orphan_vdj: number;
      stand_by_me_cluster: number;
    }>(
      `
      WITH hot AS (
        SELECT * FROM canonical_track_display WHERE has_hot100 = true
      ),
      dup_keys AS (
        SELECT
          lower(trim(canonical_title)) AS t,
          lower(regexp_replace(trim(canonical_artist_name), '^the\\s+', '', 'i')) AS a
        FROM hot
        WHERE trim(coalesce(canonical_title, '')) <> ''
          AND trim(coalesce(canonical_artist_name, '')) <> ''
        GROUP BY 1, 2
        HAVING count(*) > 1
      )
      SELECT
        (SELECT count(*)::int FROM hot h
          WHERE NOT EXISTS (
            SELECT 1 FROM canonical_album_tracks cat
            WHERE upper(trim(cat.canonical_track_key)) = upper(trim(h.track_id))
          )) AS missing_album_links,
        (SELECT count(*)::int FROM hot h
          WHERE NOT EXISTS (
            SELECT 1 FROM canonical_album_tracks cat
            JOIN albums al ON al.id = cat.album_id
            WHERE upper(trim(cat.canonical_track_key)) = upper(trim(h.track_id))
              AND al.canonical_cover_path IS NOT NULL
              AND trim(al.canonical_cover_path) <> ''
          )) AS missing_cover,
        (SELECT count(*)::int FROM hot h
          INNER JOIN dup_keys dk
            ON lower(trim(h.canonical_title)) = dk.t
           AND lower(regexp_replace(trim(h.canonical_artist_name), '^the\\s+', '', 'i')) = dk.a
        ) AS duplicate_title_artist,
        (SELECT count(*)::int FROM canonical_track_display ctd
          WHERE ctd.has_vdj_media = true
            AND (
              ctd.graph_track_id IS NULL
              OR NOT EXISTS (
                SELECT 1 FROM canonical_album_tracks cat
                WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
              )
            )) AS orphan_vdj,
        (SELECT count(*)::int FROM hot h
          WHERE lower(trim(h.canonical_title)) LIKE '%stand by me%') AS stand_by_me_cluster
      `,
    );
    const row = rows[0];
    return {
      missing_album_links: row?.missing_album_links ?? 0,
      missing_cover: row?.missing_cover ?? 0,
      duplicate_title_artist: row?.duplicate_title_artist ?? 0,
      orphan_vdj: row?.orphan_vdj ?? 0,
      stand_by_me_cluster: row?.stand_by_me_cluster ?? 0,
    };
  } catch {
    return {
      missing_album_links: 0,
      missing_cover: 0,
      duplicate_title_artist: 0,
      orphan_vdj: 0,
      stand_by_me_cluster: 0,
    };
  }
}

async function seedMissingAlbumLinks(limit: number): Promise<DisplaySeedRow[]> {
  return inspectQuery<DisplaySeedRow>(
    `
    SELECT
      ctd.track_id,
      ctd.canonical_title,
      ctd.canonical_artist_name,
      ctd.first_chart_date::text AS first_chart_date,
      ctd.chart_weeks,
      ctd.peak_hot100_position,
      ctd.has_hot100,
      ctd.has_vdj_media,
      0::int AS album_link_count
    FROM canonical_track_display ctd
    WHERE ctd.has_hot100 = true
      AND NOT EXISTS (
        SELECT 1 FROM canonical_album_tracks cat
        WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
      )
    ORDER BY ctd.chart_weeks DESC, ctd.peak_hot100_position ASC NULLS LAST
    LIMIT $1
    `,
    [limit],
  );
}

async function seedMissingCover(limit: number): Promise<DisplaySeedRow[]> {
  return inspectQuery<DisplaySeedRow>(
    `
    SELECT
      ctd.track_id,
      ctd.canonical_title,
      ctd.canonical_artist_name,
      ctd.first_chart_date::text AS first_chart_date,
      ctd.chart_weeks,
      ctd.peak_hot100_position,
      ctd.has_hot100,
      ctd.has_vdj_media,
      (SELECT count(*)::int FROM canonical_album_tracks cat
        WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))) AS album_link_count
    FROM canonical_track_display ctd
    WHERE ctd.has_hot100 = true
      AND NOT EXISTS (
        SELECT 1 FROM canonical_album_tracks cat
        JOIN albums al ON al.id = cat.album_id
        WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
          AND al.canonical_cover_path IS NOT NULL
          AND trim(al.canonical_cover_path) <> ''
      )
    ORDER BY ctd.chart_weeks DESC, ctd.peak_hot100_position ASC NULLS LAST
    LIMIT $1
    `,
    [limit],
  );
}

async function seedDuplicateClusters(limit: number): Promise<DisplaySeedRow[]> {
  return inspectQuery<DisplaySeedRow>(
    `
    WITH dup_keys AS (
      SELECT
        lower(trim(canonical_title)) AS t,
        lower(regexp_replace(trim(canonical_artist_name), '^the\\s+', '', 'i')) AS a
      FROM canonical_track_display
      WHERE has_hot100 = true
        AND trim(coalesce(canonical_title, '')) <> ''
        AND trim(coalesce(canonical_artist_name, '')) <> ''
      GROUP BY 1, 2
      HAVING count(*) > 1
    )
    SELECT
      ctd.track_id,
      ctd.canonical_title,
      ctd.canonical_artist_name,
      ctd.first_chart_date::text AS first_chart_date,
      ctd.chart_weeks,
      ctd.peak_hot100_position,
      ctd.has_hot100,
      ctd.has_vdj_media,
      (SELECT count(*)::int FROM canonical_album_tracks cat
        WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))) AS album_link_count
    FROM canonical_track_display ctd
    INNER JOIN dup_keys dk
      ON lower(trim(ctd.canonical_title)) = dk.t
     AND lower(regexp_replace(trim(ctd.canonical_artist_name), '^the\\s+', '', 'i')) = dk.a
    WHERE ctd.has_hot100 = true
    ORDER BY ctd.chart_weeks DESC, ctd.peak_hot100_position ASC NULLS LAST
    LIMIT $1
    `,
    [limit],
  );
}

async function seedOrphanVdj(limit: number): Promise<DisplaySeedRow[]> {
  return inspectQuery<DisplaySeedRow>(
    `
    SELECT
      ctd.track_id,
      ctd.canonical_title,
      ctd.canonical_artist_name,
      ctd.first_chart_date::text AS first_chart_date,
      ctd.chart_weeks,
      ctd.peak_hot100_position,
      ctd.has_hot100,
      ctd.has_vdj_media,
      (SELECT count(*)::int FROM canonical_album_tracks cat
        WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))) AS album_link_count
    FROM canonical_track_display ctd
    WHERE ctd.has_vdj_media = true
      AND (
        ctd.graph_track_id IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM canonical_album_tracks cat
          WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
        )
      )
    ORDER BY ctd.chart_weeks DESC NULLS LAST, ctd.peak_hot100_position ASC NULLS LAST
    LIMIT $1
    `,
    [limit],
  );
}

async function mergeSeeds(): Promise<Map<string, SeedMeta>> {
  const [missingLinks, missingCover, duplicates, orphanVdj, standByMeRvtrs] =
    await Promise.all([
      seedMissingAlbumLinks(PER_SEED),
      seedMissingCover(PER_SEED),
      seedDuplicateClusters(PER_SEED),
      seedOrphanVdj(PER_SEED),
      loadStandByMeClusterRvtrs(PER_SEED),
    ]);

  const map = new Map<string, SeedMeta>();

  function ingest(rows: DisplaySeedRow[], flag: HealingDegradationFlag) {
    for (const row of rows) {
      const rvtr = row.track_id.trim().toUpperCase();
      const existing = map.get(rvtr);
      const flags = existing?.flags ?? new Set<HealingDegradationFlag>();
      flags.add(flag);
      map.set(rvtr, {
        rvtr,
        title: row.canonical_title.trim(),
        artistName: row.canonical_artist_name.trim(),
        releaseYear: yearFromDate(row.first_chart_date),
        chartWeeks: row.chart_weeks,
        peakHot100: row.peak_hot100_position,
        hasHot100: row.has_hot100,
        hasVdjMedia: row.has_vdj_media,
        albumLinkCount: row.album_link_count,
        flags,
      });
    }
  }

  ingest(missingLinks, "missing_album_links");
  ingest(missingCover, "missing_cover");
  ingest(duplicates, "duplicate_title_artist");
  ingest(orphanVdj, "orphan_vdj");

  for (const rvtr of standByMeRvtrs) {
    const existing = map.get(rvtr);
    const flags = existing?.flags ?? new Set<HealingDegradationFlag>();
    flags.add("stand_by_me_cluster");
    if (!existing) {
      map.set(rvtr, {
        rvtr,
        title: "",
        artistName: "",
        releaseYear: null,
        chartWeeks: 0,
        peakHot100: null,
        hasHot100: true,
        hasVdjMedia: false,
        albumLinkCount: 0,
        flags,
      });
    } else {
      existing.flags.add("stand_by_me_cluster");
    }
  }

  return map;
}

export type HealingQueueRow = {
  rvtr: string;
  artistName: string;
  title: string;
  releaseYear: number | null;
  chartStatus: string;
  albumLinkCount: number;
  coverStatus: HealingCoverStatus;
  degradationFlags: HealingDegradationFlag[];
  topConfidence: number | null;
  candidateCount: number;
  topCandidateTitle: string | null;
  topCandidateReasons: string[];
  healingState: HealingQueueState;
  candidates: ScoredAlbumLinkCandidate[];
  diagnosis: string[];
};

export type HealingDegradedQueue = {
  generatedAt: string;
  readOnly: true;
  summary: {
    hot100Total: number;
    hot100MissingLinks: number;
    pctMissing: number;
    queueSize: number;
  };
  countsByType: HealingDegradationCounts;
  rows: HealingQueueRow[];
};

async function enrichSeed(meta: SeedMeta): Promise<HealingQueueRow | null> {
  const [audit, gaps] = await Promise.all([
    auditTrackAlbumLinks(meta.rvtr),
    detectTrackHealingGaps(meta.rvtr),
  ]);
  if (!audit) return null;

  const flags = new Set(meta.flags);
  if (audit.existingLinkCount === 0) flags.add("missing_album_links");
  if (gaps?.missingCover) flags.add("missing_cover");
  if (audit.gap === "orphan_graph_track") flags.add("orphan_vdj");
  if (meta.hasVdjMedia && audit.existingLinkCount === 0) flags.add("orphan_vdj");

  const candidates = audit.candidates.slice(0, 6);
  const albumLinkCount = audit.existingLinkCount;
  const missingCover = gaps?.missingCover ?? true;

  return {
    rvtr: audit.rvtr,
    artistName: audit.artistName || meta.artistName,
    title: audit.title || meta.title,
    releaseYear: audit.firstChartYear ?? meta.releaseYear,
    chartStatus: chartStatus(
      meta.hasHot100 || audit.chartWeeks > 0,
      audit.chartWeeks,
      audit.peakHot100,
    ),
    albumLinkCount,
    coverStatus: coverStatus(missingCover, albumLinkCount),
    degradationFlags: [...flags],
    topConfidence: candidates[0]?.confidence ?? null,
    candidateCount: audit.candidates.length,
    topCandidateTitle: candidates[0]?.albumTitle ?? null,
    topCandidateReasons: candidates[0]?.reasons ?? [],
    healingState: healingState(albumLinkCount, candidates),
    candidates,
    diagnosis: audit.diagnosis,
  };
}

function seedToSkeleton(meta: SeedMeta): HealingQueueRow {
  const flags = [...meta.flags];
  if (meta.albumLinkCount === 0 && !flags.includes("missing_album_links")) {
    flags.push("missing_album_links");
  }
  if (meta.hasVdjMedia && meta.albumLinkCount === 0 && !flags.includes("orphan_vdj")) {
    flags.push("orphan_vdj");
  }

  return {
    rvtr: meta.rvtr,
    artistName: meta.artistName,
    title: meta.title,
    releaseYear: meta.releaseYear,
    chartStatus: chartStatus(meta.hasHot100, meta.chartWeeks, meta.peakHot100),
    albumLinkCount: meta.albumLinkCount,
    coverStatus:
      meta.albumLinkCount === 0 ? "no_album_link" : ("missing" as HealingCoverStatus),
    degradationFlags: flags,
    topConfidence: null,
    candidateCount: 0,
    topCandidateTitle: null,
    topCandidateReasons: [],
    healingState: meta.albumLinkCount > 0 ? "linked" : "degraded",
    candidates: [],
    diagnosis: [],
  };
}

/** Full audit for one RVTR (expand row / API). */
export async function loadHealingQueueRowAudit(rvtrInput: string): Promise<HealingQueueRow | null> {
  const rvtr = rvtrInput.trim().toUpperCase();
  const meta: SeedMeta = {
    rvtr,
    title: "",
    artistName: "",
    releaseYear: null,
    chartWeeks: 0,
    peakHot100: null,
    hasHot100: true,
    hasVdjMedia: false,
    albumLinkCount: 0,
    flags: new Set(),
  };
  return enrichSeed(meta);
}

/** Human-guided healing queue — read-only, seeded from degraded Hot 100 + VDJ orphans. */
export async function loadHealingDegradedQueue(): Promise<HealingDegradedQueue> {
  const [countsByType, linkSummary, seedMap] = await Promise.all([
    loadDegradationCounts(),
    loadMissingLinkSummary(),
    mergeSeeds(),
  ]);

  const seeds = [...seedMap.values()].slice(0, QUEUE_LIMIT);
  const rows: HealingQueueRow[] = seeds.map(seedToSkeleton);

  const auditTargets = rows.slice(0, AUDIT_PREVIEW_LIMIT);
  const batchSize = 8;
  for (let i = 0; i < auditTargets.length; i += batchSize) {
    const batch = auditTargets.slice(i, i + batchSize);
    const enriched = await Promise.all(
      batch.map((row) => enrichSeed(seeds.find((s) => s.rvtr === row.rvtr)!)),
    );
    for (let j = 0; j < batch.length; j += 1) {
      const full = enriched[j];
      const idx = rows.findIndex((r) => r.rvtr === batch[j]!.rvtr);
      if (full && idx >= 0) rows[idx] = full;
    }
  }

  rows.sort((a, b) => {
    const score = (r: HealingQueueRow) =>
      (r.degradationFlags.includes("missing_album_links") ? 4 : 0) +
      (r.healingState === "no_candidates" ? 2 : 0) +
      (r.topConfidence == null ? 0 : 1) +
      (r.chartStatus.includes("w") ? 1 : 0);
    return score(b) - score(a);
  });

  const hot100Total = linkSummary?.hot100Total ?? 0;
  const hot100MissingLinks = linkSummary?.hot100MissingLinks ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    summary: {
      hot100Total,
      hot100MissingLinks,
      pctMissing:
        hot100Total > 0
          ? Math.round((hot100MissingLinks / hot100Total) * 1000) / 10
          : 0,
      queueSize: rows.length,
    },
    countsByType,
    rows,
  };
}
