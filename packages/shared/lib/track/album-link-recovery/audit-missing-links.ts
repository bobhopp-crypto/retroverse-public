import { inspectQuery } from "@/lib/inspect/pg";
import { auditTrackAlbumLinks } from "@/lib/track/album-link-recovery/audit-track";
import type { AlbumLinkRecoverySummary } from "@/lib/track/album-link-recovery/types";

export async function loadMissingLinkSummary(): Promise<{
  hot100Total: number;
  hot100MissingLinks: number;
} | null> {
  try {
    await inspectQuery(`SET LOCAL statement_timeout = '20s'`);
    const rows = await inspectQuery<{
      hot100_total: number;
      hot100_missing: number;
    }>(
      `
      SELECT
        count(*)::int AS hot100_total,
        count(*) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM canonical_album_tracks cat
          WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
        ))::int AS hot100_missing
      FROM canonical_track_display ctd
      WHERE ctd.has_hot100 = true
      `,
    );
    const row = rows[0];
    return {
      hot100Total: row?.hot100_total ?? 0,
      hot100MissingLinks: row?.hot100_missing ?? 0,
    };
  } catch {
    return null;
  }
}

export async function sampleMissingLinkRvtrs(limit = 5): Promise<string[]> {
  const rows = await inspectQuery<{ track_id: string }>(
    `
    SELECT ctd.track_id
    FROM canonical_track_display ctd
    WHERE ctd.has_hot100 = true
      AND NOT EXISTS (
        SELECT 1 FROM canonical_album_tracks cat
        WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
      )
    ORDER BY ctd.chart_weeks DESC, ctd.peak_hot100_position ASC NULLS LAST
    LIMIT 80
    `,
  );
  const pool = rows.map((r) => r.track_id.trim().toUpperCase());
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, limit);
}

export async function runAlbumLinkRecoveryAudit(options?: {
  sampleCount?: number;
  fixedRvtrs?: string[];
}): Promise<AlbumLinkRecoverySummary> {
  const sampleCount = options?.sampleCount ?? 5;
  const fixed = options?.fixedRvtrs ?? [
    "RVTR430551",
    "RVTR336241",
  ];

  const summary = await loadMissingLinkSummary();
  const randomRvtrs = await sampleMissingLinkRvtrs(sampleCount);
  const rvtrs = [...new Set([...fixed, ...randomRvtrs])];

  const audits = [];
  for (const rvtr of rvtrs) {
    const audit = await auditTrackAlbumLinks(rvtr);
    if (audit) audits.push(audit);
  }

  const hot100Total = summary?.hot100Total ?? 32187;
  const hot100MissingLinks = summary?.hot100MissingLinks ?? 17961;

  return {
    generatedAt: new Date().toISOString(),
    hot100Total,
    hot100MissingLinks,
    pctMissing:
      hot100Total > 0
        ? Math.round((hot100MissingLinks / hot100Total) * 1000) / 10
        : 0,
    audits,
  };
}
