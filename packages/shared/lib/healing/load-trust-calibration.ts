import "server-only";

import { inspectQuery } from "@/lib/inspect/pg";
import { assessCandidateTrust } from "@/lib/healing/candidate-trust";
import type { DuplicateClusterSummary } from "@/lib/healing/duplicate-clusters";
import type { HealingDegradedQueue, HealingQueueRow } from "@/lib/healing/load-degraded-queue";
import { loadHealingOutcomeSummary } from "@/lib/healing/load-healing-outcomes";
import type {
  DangerousCandidateExample,
  DuplicateDistortionFinding,
  EraPatternRow,
  HealingTrustCalibration,
  QualityPatternNote,
} from "@/lib/healing/trust-types";

export type { HealingTrustCalibration };

const QUALITY_PATTERNS: QualityPatternNote[] = [
  {
    pattern: "same_artist + release_year_delta_0-2 + tracklist match",
    strength: "strong",
    note: "Typical studio-era link — highest curator trust.",
  },
  {
    pattern: "same_artist + release_year_delta_3-5",
    strength: "strong",
    note: "Often correct for reissues or chart lag — verify album edition.",
  },
  {
    pattern: "different_artist_compilation_or_cover",
    strength: "risk",
    note: "Title match on another artist's album — frequent false positive.",
  },
  {
    pattern: "compilation / soundtrack / greatest hits",
    strength: "risk",
    note: "May improve cover only while poisoning era — lower trust, not blocked.",
  },
  {
    pattern: "release_year_delta_9+",
    strength: "weak",
    note: "Chart debut far from album year — compilation slot suspicion.",
  },
  {
    pattern: "duplicate_rvtr_fragment",
    strength: "risk",
    note: "Non-canonical RVTR in cluster — scoring may reflect wrong entity.",
  },
  {
    pattern: "below_approval_threshold",
    strength: "weak",
    note: "Match confidence < 0.45 — visibility only, approve disabled.",
  },
];

async function loadEraPatterns(): Promise<EraPatternRow[]> {
  try {
    const rows = await inspectQuery<{
      decade: number;
      missing_album_links: number;
      missing_cover: number;
      orphan_vdj: number;
    }>(
      `
      WITH hot AS (
        SELECT
          ctd.*,
          (extract(year FROM ctd.first_chart_date::date)::int / 10) * 10 AS decade
        FROM canonical_track_display ctd
        WHERE ctd.has_hot100 = true AND ctd.first_chart_date IS NOT NULL
      )
      SELECT
        decade::int,
        count(*) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM canonical_album_tracks cat
          WHERE upper(trim(cat.canonical_track_key)) = upper(trim(hot.track_id))
        ))::int AS missing_album_links,
        count(*) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM canonical_album_tracks cat
          JOIN albums al ON al.id = cat.album_id
          WHERE upper(trim(cat.canonical_track_key)) = upper(trim(hot.track_id))
            AND al.canonical_cover_path IS NOT NULL AND trim(al.canonical_cover_path) <> ''
        ))::int AS missing_cover,
        count(*) FILTER (WHERE hot.has_vdj_media = true AND NOT EXISTS (
          SELECT 1 FROM canonical_album_tracks cat
          WHERE upper(trim(cat.canonical_track_key)) = upper(trim(hot.track_id))
        ))::int AS orphan_vdj
      FROM hot
      GROUP BY decade
      HAVING decade >= 1960
      ORDER BY missing_album_links DESC
      LIMIT 8
      `,
    );

    return rows.map((r) => ({
      era: `${r.decade}s`,
      missingAlbumLinks: r.missing_album_links,
      missingCovers: r.missing_cover,
      orphanVdj: r.orphan_vdj,
      note: eraNote(r.decade, r.missing_album_links, r.orphan_vdj),
    }));
  } catch {
    return [];
  }
}

function eraNote(decade: number, missingLinks: number, orphanVdj: number): string {
  if (decade <= 1969 && missingLinks > 500) {
    return "Early Hot 100 — orphan singles and pre-album-chart era pressure.";
  }
  if (decade >= 1970 && decade <= 1989 && orphanVdj > 800) {
    return "Soundtrack / compilation-heavy decades — VDJ overlay without album graph.";
  }
  if (decade >= 1990) {
    return "VDJ-ingestion era — verify library vs canonical graph drift.";
  }
  return "Review decade-specific compilation and soundtrack density.";
}

function yearSpreadDelta(spread: string): number {
  const m = spread.match(/Δ(\d+)/);
  return m ? Number(m[1]) : 0;
}

function duplicateDistortionFindings(
  clusters: DuplicateClusterSummary[],
): DuplicateDistortionFinding[] {
  return clusters.slice(0, 12).map((c) => {
    let distortionRisk: "low" | "medium" | "high" = "low";
    const spread = yearSpreadDelta(c.yearSpread);
    if (c.clusterSize >= 3 || spread > 10) {
      distortionRisk = "high";
    } else if (c.clusterSize > 2 || c.duplicateConfidence < 0.65) {
      distortionRisk = "medium";
    }
    return {
      clusterId: c.clusterId,
      displayTitle: c.displayTitle,
      displayArtist: c.displayArtist,
      clusterSize: c.clusterSize,
      probableCanonicalRvtr: c.probableCanonicalRvtr,
      distortionRisk,
      note:
        distortionRisk === "high"
          ? "Multiple RVTRs + wide year spread — approve only on probable canonical root."
          : "Fragmented variants — confirm identity before linking.",
    };
  });
}

function collectDangerousCandidates(rows: HealingQueueRow[]): DangerousCandidateExample[] {
  const out: DangerousCandidateExample[] = [];

  for (const row of rows) {
    for (const c of row.candidates) {
      const trust = assessCandidateTrust(c, {
        rvtr: row.rvtr,
        trackTitle: row.title,
        artistName: row.artistName,
        firstChartYear: row.releaseYear,
        duplicateCluster: row.duplicateCluster,
      });
      if (trust.level === "risky") {
        out.push({
          rvtr: row.rvtr,
          title: row.title,
          artistName: row.artistName,
          albumTitle: c.albumTitle,
          albumId: c.albumId,
          matchConfidence: c.confidence,
          trustScore: trust.trustScore,
          riskFlags: trust.riskFlags,
        });
      }
    }
  }

  return out
    .sort(
      (a, b) =>
        a.trustScore - b.trustScore ||
        a.matchConfidence - b.matchConfidence,
    )
    .slice(0, 12);
}

export async function loadHealingTrustCalibration(
  queue: HealingDegradedQueue,
): Promise<HealingTrustCalibration> {
  const [outcomes, eraPatterns] = await Promise.all([
    loadHealingOutcomeSummary(),
    loadEraPatterns(),
  ]);

  return {
    outcomes,
    qualityPatterns: QUALITY_PATTERNS,
    eraPatterns,
    duplicateDistortion: duplicateDistortionFindings(queue.duplicateClusters),
    dangerousCandidates: collectDangerousCandidates(queue.rows),
  };
}
