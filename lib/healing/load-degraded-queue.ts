import { inspectQuery } from "@/lib/inspect/pg";
import { loadStandByMeClusterRvtrs } from "@/lib/healing/clusters/stand-by-me";
import type { DuplicateClusterSummary } from "@/lib/healing/duplicate-clusters";
import { loadDuplicateClusterIndex } from "@/lib/healing/duplicate-clusters";
import type {
  HealingCoverStatus,
  HealingDegradationCounts,
  HealingDegradationFlag,
  HealingQueueState,
} from "@/lib/healing/degradation";
import { isCoverCritical } from "@/lib/healing/degradation";
import {
  buildPriorityGroups,
  buildWorkflowSummary,
  type HealingPriorityGroup,
  type HealingWorkflowSummary,
} from "@/lib/healing/priority-groups";
import {
  formatWeightedReasons,
  formatWeightedReasonsLine,
  type WeightedReason,
} from "@/lib/healing/format-scored-reasons";
import { loadHealthyControlRows } from "@/lib/healing/healthy-controls";
import { compareHealingRows, healingImpactScore } from "@/lib/healing/queue-priority";
import { loadMissingLinkSummary } from "@/lib/track/album-link-recovery/audit-missing-links";
import { auditTrackAlbumLinks } from "@/lib/track/album-link-recovery/audit-track";
import { detectTrackHealingGaps } from "@/lib/track/album-link-recovery/detect-gaps";
import type { ScoredAlbumLinkCandidate } from "@/lib/track/album-link-recovery/types";

const QUEUE_LIMIT = 40;
const PER_SEED = 10;
/** Bounded preview audits for prioritization (high-confidence group). */
const PRIORITY_PREVIEW_AUDITS = 8;

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
      cover_critical: number;
      duplicate_rvtr: number;
      orphan_vdj: number;
      weak_confidence_join: number;
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
        ) AS duplicate_rvtr,
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
          WHERE h.chart_weeks >= 8
            AND trim(coalesce(h.canonical_artist_name, '')) <> ''
            AND lower(trim(h.canonical_artist_name)) NOT IN ('unknown', '?', 'untitled')
            AND NOT EXISTS (
              SELECT 1 FROM canonical_album_tracks cat
              WHERE upper(trim(cat.canonical_track_key)) = upper(trim(h.track_id))
            )
            AND NOT EXISTS (
              SELECT 1 FROM canonical_album_tracks cat
              JOIN albums al ON al.id = cat.album_id
              WHERE upper(trim(cat.canonical_track_key)) = upper(trim(h.track_id))
                AND al.canonical_cover_path IS NOT NULL
                AND trim(al.canonical_cover_path) <> ''
            )) AS cover_critical,
        (SELECT count(*)::int FROM hot h
          WHERE EXISTS (
            SELECT 1 FROM canonical_album_tracks cat
            JOIN albums al ON al.id = cat.album_id
            WHERE upper(trim(cat.canonical_track_key)) = upper(trim(h.track_id))
              AND h.first_chart_date IS NOT NULL
              AND al.release_year IS NOT NULL
              AND abs(
                extract(year FROM h.first_chart_date::date)::int - al.release_year
              ) > 8
          )) AS weak_confidence_join
      `,
    );
    const row = rows[0];
    return {
      missing_album_links: row?.missing_album_links ?? 0,
      missing_cover: row?.missing_cover ?? 0,
      cover_critical: row?.cover_critical ?? 0,
      duplicate_rvtr: row?.duplicate_rvtr ?? 0,
      orphan_vdj: row?.orphan_vdj ?? 0,
      weak_confidence_join: row?.weak_confidence_join ?? 0,
    };
  } catch {
    return {
      missing_album_links: 0,
      missing_cover: 0,
      cover_critical: 0,
      duplicate_rvtr: 0,
      orphan_vdj: 0,
      weak_confidence_join: 0,
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

async function seedCoverCritical(limit: number): Promise<DisplaySeedRow[]> {
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
      AND ctd.chart_weeks >= 8
      AND trim(coalesce(ctd.canonical_artist_name, '')) <> ''
      AND lower(trim(ctd.canonical_artist_name)) NOT IN ('unknown', '?', 'untitled')
      AND NOT EXISTS (
        SELECT 1 FROM canonical_album_tracks cat
        WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
      )
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

async function seedWeakConfidenceJoins(limit: number): Promise<DisplaySeedRow[]> {
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
      AND EXISTS (
        SELECT 1 FROM canonical_album_tracks cat
        JOIN albums al ON al.id = cat.album_id
        WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
          AND ctd.first_chart_date IS NOT NULL
          AND al.release_year IS NOT NULL
          AND abs(
            extract(year FROM ctd.first_chart_date::date)::int - al.release_year
          ) > 8
      )
    ORDER BY ctd.chart_weeks DESC, ctd.peak_hot100_position ASC NULLS LAST
    LIMIT $1
    `,
    [limit],
  );
}

async function mergeSeeds(): Promise<Map<string, SeedMeta>> {
  const [missingLinks, missingCover, coverCritical, duplicates, orphanVdj, weakJoins, standByMeRvtrs] =
    await Promise.all([
      seedMissingAlbumLinks(PER_SEED),
      seedMissingCover(PER_SEED),
      seedCoverCritical(PER_SEED),
      seedDuplicateClusters(PER_SEED),
      seedOrphanVdj(PER_SEED),
      seedWeakConfidenceJoins(PER_SEED),
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
  ingest(coverCritical, "cover_critical");
  ingest(duplicates, "duplicate_rvtr");
  ingest(orphanVdj, "orphan_vdj");
  ingest(weakJoins, "weak_confidence_join");

  for (const rvtr of standByMeRvtrs) {
    const existing = map.get(rvtr);
    const flags = existing?.flags ?? new Set<HealingDegradationFlag>();
    flags.add("weak_confidence_join");
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
      existing.flags.add("weak_confidence_join");
    }
  }

  return map;
}

export type HealingDuplicateClusterRef = {
  clusterId: string;
  clusterSize: number;
  probableCanonicalRvtr: string;
  probableCanonicalLabel: string;
  duplicateConfidence: number;
  signals: string[];
  memberRvtrs: string[];
};

export type HealingQueueRow = {
  rvtr: string;
  artistName: string;
  title: string;
  releaseYear: number | null;
  chartWeeks: number;
  chartStatus: string;
  albumLinkCount: number;
  coverStatus: HealingCoverStatus;
  coverCritical: boolean;
  degradationFlags: HealingDegradationFlag[];
  duplicateCluster: HealingDuplicateClusterRef | null;
  topConfidence: number | null;
  candidateCount: number;
  topCandidateTitle: string | null;
  topCandidateReasons: string[];
  weightedTopReasons: WeightedReason[];
  impactScore: number;
  healingState: HealingQueueState;
  candidates: ScoredAlbumLinkCandidate[];
  diagnosis: string[];
};

export type HealingHealthyControlRow = HealingQueueRow & {
  controlLabel: string;
};

export type HealingQueueGroup = HealingPriorityGroup;

export type HealingDegradedQueue = {
  generatedAt: string;
  readOnly: true;
  summary: {
    hot100Total: number;
    hot100MissingLinks: number;
    pctMissing: number;
    queueSize: number;
  };
  workflowSummary: HealingWorkflowSummary;
  countsByType: HealingDegradationCounts;
  duplicateClusters: DuplicateClusterSummary[];
  groups: HealingPriorityGroup[];
  healthyControls: HealingHealthyControlRow[];
  rows: HealingQueueRow[];
};

function clusterRef(cluster: DuplicateClusterSummary): HealingDuplicateClusterRef {
  return {
    clusterId: cluster.clusterId,
    clusterSize: cluster.clusterSize,
    probableCanonicalRvtr: cluster.probableCanonicalRvtr,
    probableCanonicalLabel: cluster.probableCanonicalLabel,
    duplicateConfidence: cluster.duplicateConfidence,
    signals: cluster.signals,
    memberRvtrs: cluster.memberRvtrs,
  };
}

function finalizeRow(
  row: HealingQueueRow,
  dupByRvtr: Map<string, DuplicateClusterSummary>,
): HealingQueueRow {
  const cluster = dupByRvtr.get(row.rvtr) ?? null;
  const flags = new Set(row.degradationFlags);
  if (cluster) flags.add("duplicate_rvtr");
  if (row.coverCritical) flags.add("cover_critical");

  const withCluster: HealingQueueRow = {
    ...row,
    degradationFlags: [...flags],
    duplicateCluster: cluster ? clusterRef(cluster) : null,
  };

  withCluster.impactScore = healingImpactScore({
    chartWeeks: withCluster.chartWeeks,
    topConfidence: withCluster.topConfidence,
    degradationFlags: withCluster.degradationFlags,
    duplicateCluster: withCluster.duplicateCluster,
  });

  return withCluster;
}

async function enrichSeed(
  meta: SeedMeta,
  dupByRvtr: Map<string, DuplicateClusterSummary>,
): Promise<HealingQueueRow | null> {
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
  const chartWeeks = audit.chartWeeks || meta.chartWeeks;
  const coverCritical = isCoverCritical({
    rvtr: audit.rvtr,
    hasHot100: meta.hasHot100 || chartWeeks > 0,
    chartWeeks,
    artistName: audit.artistName || meta.artistName,
    missingCover,
    albumLinkCount,
  });
  if (coverCritical) flags.add("cover_critical");

  const topReasons = candidates[0]?.reasons ?? [];
  const topConf = candidates[0]?.confidence ?? null;
  if (topConf != null && topConf < 0.45) flags.add("weak_confidence_join");
  if (
    albumLinkCount > 0 &&
    audit.firstChartYear != null &&
    candidates[0]?.releaseYear != null &&
    Math.abs(audit.firstChartYear - candidates[0].releaseYear) > 8
  ) {
    flags.add("weak_confidence_join");
  }

  const base: HealingQueueRow = {
    rvtr: audit.rvtr,
    artistName: audit.artistName || meta.artistName,
    title: audit.title || meta.title,
    releaseYear: audit.firstChartYear ?? meta.releaseYear,
    chartWeeks,
    chartStatus: chartStatus(
      meta.hasHot100 || chartWeeks > 0,
      chartWeeks,
      audit.peakHot100,
    ),
    albumLinkCount,
    coverStatus: coverStatus(missingCover, albumLinkCount),
    coverCritical,
    degradationFlags: [...flags],
    duplicateCluster: null,
    topConfidence: topConf,
    candidateCount: audit.candidates.length,
    topCandidateTitle: candidates[0]?.albumTitle ?? null,
    topCandidateReasons: topReasons,
    weightedTopReasons: formatWeightedReasons(topReasons),
    impactScore: 0,
    healingState: healingState(albumLinkCount, candidates),
    candidates,
    diagnosis: audit.diagnosis,
  };

  return finalizeRow(base, dupByRvtr);
}

function seedToSkeleton(
  meta: SeedMeta,
  dupByRvtr: Map<string, DuplicateClusterSummary>,
): HealingQueueRow {
  const flags = [...meta.flags];
  if (meta.albumLinkCount === 0 && !flags.includes("missing_album_links")) {
    flags.push("missing_album_links");
  }
  if (meta.hasVdjMedia && meta.albumLinkCount === 0 && !flags.includes("orphan_vdj")) {
    flags.push("orphan_vdj");
  }

  const missingCover =
    meta.albumLinkCount === 0 ||
    flags.includes("missing_cover") ||
    flags.includes("cover_critical");
  const coverCritical = isCoverCritical({
    rvtr: meta.rvtr,
    hasHot100: meta.hasHot100,
    chartWeeks: meta.chartWeeks,
    artistName: meta.artistName,
    missingCover,
    albumLinkCount: meta.albumLinkCount,
  });
  if (coverCritical && !flags.includes("cover_critical")) {
    flags.push("cover_critical");
  }

  const base: HealingQueueRow = {
    rvtr: meta.rvtr,
    artistName: meta.artistName,
    title: meta.title,
    releaseYear: meta.releaseYear,
    chartWeeks: meta.chartWeeks,
    chartStatus: chartStatus(meta.hasHot100, meta.chartWeeks, meta.peakHot100),
    albumLinkCount: meta.albumLinkCount,
    coverStatus:
      meta.albumLinkCount === 0 ? "no_album_link" : missingCover ? "missing" : "ok",
    coverCritical,
    degradationFlags: flags,
    duplicateCluster: null,
    topConfidence: null,
    candidateCount: 0,
    topCandidateTitle: null,
    topCandidateReasons: [],
    weightedTopReasons: [],
    impactScore: 0,
    healingState: meta.albumLinkCount > 0 ? "linked" : "degraded",
    candidates: [],
    diagnosis: [],
  };

  return finalizeRow(base, dupByRvtr);
}

/** Full audit for one RVTR (expand row / API). */
export async function loadHealingQueueRowAudit(rvtrInput: string): Promise<HealingQueueRow | null> {
  const { byRvtr } = await loadDuplicateClusterIndex();
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
  return enrichSeed(meta, byRvtr);
}

/** Human-guided healing queue — read-only, fast SQL seeds; audits on expand. */
export async function loadHealingDegradedQueue(): Promise<HealingDegradedQueue> {
  const [countsByType, linkSummary, seedMap, dupIndex, controlRows] = await Promise.all([
    loadDegradationCounts(),
    loadMissingLinkSummary(),
    mergeSeeds(),
    loadDuplicateClusterIndex(),
    loadHealthyControlRows(),
  ]);

  const controlRvtrs = new Set(controlRows.map((r) => r.track_id.trim().toUpperCase()));

  const seeds = [...seedMap.values()]
    .filter((s) => !controlRvtrs.has(s.rvtr))
    .slice(0, QUEUE_LIMIT);
  let rows: HealingQueueRow[] = seeds
    .map((s) => seedToSkeleton(s, dupIndex.byRvtr))
    .sort((a, b) => compareHealingRows(a, b));

  const previewTargets = [...rows]
    .filter((r) => r.coverCritical || r.degradationFlags.includes("missing_album_links"))
    .sort((a, b) => compareHealingRows(a, b))
    .slice(0, PRIORITY_PREVIEW_AUDITS);

  const seedByRvtr = new Map(seeds.map((s) => [s.rvtr, s]));
  const batchSize = 4;
  for (let i = 0; i < previewTargets.length; i += batchSize) {
    const batch = previewTargets.slice(i, i + batchSize);
    const enriched = await Promise.all(
      batch.map((row) => enrichSeed(seedByRvtr.get(row.rvtr)!, dupIndex.byRvtr)),
    );
    for (let j = 0; j < batch.length; j += 1) {
      const full = enriched[j];
      if (!full) continue;
      const idx = rows.findIndex((r) => r.rvtr === batch[j]!.rvtr);
      if (idx >= 0) rows[idx] = full;
    }
  }

  rows = [...rows].sort((a, b) => compareHealingRows(a, b));

  const healthyControls: HealingHealthyControlRow[] = controlRows.map((row) => {
    const meta: SeedMeta = {
      rvtr: row.track_id.trim().toUpperCase(),
      title: row.canonical_title.trim(),
      artistName: row.canonical_artist_name.trim(),
      releaseYear: yearFromDate(row.first_chart_date),
      chartWeeks: row.chart_weeks,
      peakHot100: row.peak_hot100_position,
      hasHot100: row.has_hot100,
      hasVdjMedia: row.has_vdj_media,
      albumLinkCount: row.album_link_count,
      flags: new Set(),
    };
    return {
      ...seedToSkeleton(meta, dupIndex.byRvtr),
      controlLabel: row.label,
      degradationFlags: [],
      coverCritical: false,
      coverStatus: row.album_link_count > 0 ? "ok" : "no_album_link",
      healingState: "linked",
      topConfidence: 1,
      impactScore: 0,
    };
  });
  const groups = buildPriorityGroups(rows);
  const workflowSummary = buildWorkflowSummary(countsByType, healthyControls.length, rows);

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
    workflowSummary,
    countsByType,
    duplicateClusters: dupIndex.clusters.slice(0, 24),
    groups,
    healthyControls,
    rows,
  };
}

export { formatWeightedReasonsLine };
