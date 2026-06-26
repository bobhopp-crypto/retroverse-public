import "server-only";

import { coverageOwnedVideoByRvtrSql } from "@/lib/charts/coverage-owned-video-sql";
import { inspectQuery } from "@/lib/inspect/pg";

import {
  classifyTrackCoverage,
  coverageFromMap,
  normalizeCoverageRvtr,
  type TrackCoverageStatus,
} from "./track-coverage";

type CoverageRow = {
  rvtr: string;
  has_owned_video: boolean;
  has_youtube: boolean;
};

/**
 * Batch-resolve coverage for RVTR tokens using VIDEO-folder ownership + YouTube links.
 * MUSIC-folder media links are ignored for Owned.
 */
export async function loadTrackCoverageByRvtr(
  tokens: Iterable<string | null | undefined>,
): Promise<Map<string, TrackCoverageStatus>> {
  const rvtrs = [
    ...new Set(
      [...tokens]
        .map((token) => normalizeCoverageRvtr(token))
        .filter((rvtr): rvtr is string => rvtr != null),
    ),
  ];

  const out = new Map<string, TrackCoverageStatus>();
  if (rvtrs.length === 0) return out;

  const rows = await inspectQuery<CoverageRow>(
    `
    WITH rvtr_list AS (
      SELECT upper(trim(x)) AS rvtr FROM unnest($1::text[]) AS x
    )
    SELECT
      r.rvtr,
      ${coverageOwnedVideoByRvtrSql("r.rvtr")} AS has_owned_video,
      EXISTS (
        SELECT 1
        FROM youtube_video_tracks yvt
        WHERE upper(trim(yvt.rvtr)) = r.rvtr
          AND yvt.review_flag IN ('approved', 'pending')
          AND yvt.confidence IN ('exact', 'high')
      ) AS has_youtube
    FROM rvtr_list r
    `,
    [rvtrs],
  );

  for (const row of rows) {
    const rvtr = normalizeCoverageRvtr(row.rvtr);
    if (!rvtr) continue;
    out.set(
      rvtr,
      classifyTrackCoverage(row.has_owned_video === true, row.has_youtube === true),
    );
  }

  for (const rvtr of rvtrs) {
    if (!out.has(rvtr)) out.set(rvtr, "missing");
  }

  return out;
}

export { coverageFromMap };

export async function loadTrackCoverageRecord(
  tokens: Iterable<string | null | undefined>,
): Promise<Record<string, TrackCoverageStatus>> {
  const map = await loadTrackCoverageByRvtr(tokens);
  return Object.fromEntries(map);
}
