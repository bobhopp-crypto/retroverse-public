import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { loadVdjMetaForPaths } from "@/lib/ops/rvtags-review/vdj-lookup";
import type { RvTagId } from "@/lib/ops/rvtags-review/vocabulary";
import {
  countRvtrAlbumMemberships,
  loadAlbumSlotRvtrs,
  resolveAlbumRelationshipMode,
} from "@/lib/track/album-link-recovery/rvtr-album-membership";
import {
  loadRetroverseTagsStore,
  tagsForRvtr,
} from "@/lib/ops/retroverse-tags/store";
import { videoUniverseWorkspaceKey } from "@/lib/ops/year-workspace/keys";
import {
  reviewForVideoRow,
  saveYearReviewRecord,
} from "@/lib/ops/year-workspace/review-state";
import { loadYearWorkspaceState } from "@/lib/ops/year-workspace/state";
import {
  effectiveClassification,
  type ReviewClassification,
} from "@/lib/ops/year-workspace/review-types";
import { auditTrackAlbumLinks } from "@/lib/track/album-link-recovery/audit-track";
import { healingWritesEnabled } from "@/lib/track/album-link-recovery/guardrails";

import {
  albumGapDone,
  commentaryGapDone,
  completenessPct,
  scoreAlbumFromAlbumStats,
  scoreCommentary,
  scoreCoverFromAlbumStats,
  type AlbumStats,
} from "./mission-scores";
import {
  enrichAlbumCandidates,
  researchCommentary,
} from "./mission-research";
import {
  appearanceConfirmed,
  appearanceRejectedIds,
  loadMissionAppearancesStore,
  type AppearanceKind,
  type MissionAppearancesStoreFile,
} from "./mission-appearances-store";
import { loadMediaAppearanceCandidates } from "./mission-media-research";
import type {
  AuditMissionRow,
  MissionAlbumCandidate,
  MissionCommentaryState,
  MissionGap,
  MissionSeal,
} from "./mission-types";

import { normRvtrId, normText } from "./mission-safe";

function normPath(p: string | null | undefined): string | null {
  const text = normText(p);
  if (!text) return null;
  return text
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\\/g, "/");
}

function missionMediaWorkspaceKey(mediaId: string | null | undefined): string {
  const id = normText(mediaId, "0");
  return videoUniverseWorkspaceKey(id);
}

async function loadAlbumStats(rvtr: string): Promise<AlbumStats> {
  const ping = await inspectPing();
  if (!ping.ok) {
    return { albumCount: 0, albumWithCover: 0 };
  }

  const rows = await inspectQuery<{ album_count: number; album_with_cover: number }>(
    `
    WITH linked AS (
      SELECT DISTINCT album_id
      FROM canonical_album_tracks
      WHERE upper(trim(canonical_track_key)) = upper(trim($1))
      UNION
      SELECT DISTINCT album_id
      FROM rvtr_album_memberships
      WHERE upper(trim(rvtr)) = upper(trim($1))
    )
    SELECT
      coalesce(count(DISTINCT al.id), 0)::int AS album_count,
      coalesce(count(DISTINCT al.id) FILTER (
        WHERE coalesce(al.canonical_cover_path, '') <> ''
           OR EXISTS (
             SELECT 1 FROM album_artwork_links aal
             WHERE aal.album_id = al.id
               AND (coalesce(aal.canonical_cover_path, '') <> '' OR coalesce(aal.r2_cover_key, '') <> '')
           )
      ), 0)::int AS album_with_cover
    FROM linked lk
    JOIN albums al ON al.id = lk.album_id
    `,
    [rvtr],
  ).catch(async () => {
    return inspectQuery<{ album_count: number; album_with_cover: number }>(
      `
      SELECT
        coalesce(count(DISTINCT al.id), 0)::int AS album_count,
        coalesce(count(DISTINCT al.id) FILTER (
          WHERE coalesce(al.canonical_cover_path, '') <> ''
             OR EXISTS (
               SELECT 1 FROM album_artwork_links aal
               WHERE aal.album_id = al.id
                 AND (coalesce(aal.canonical_cover_path, '') <> '' OR coalesce(aal.r2_cover_key, '') <> '')
             )
        ), 0)::int AS album_with_cover
      FROM canonical_album_tracks cat
      JOIN albums al ON al.id = cat.album_id
      WHERE upper(trim(cat.canonical_track_key)) = upper(trim($1))
      `,
      [rvtr],
    );
  });

  const row = rows[0];
  return {
    albumCount: row?.album_count ?? 0,
    albumWithCover: row?.album_with_cover ?? 0,
  };
}

export async function resolveAlbumCoverUrlsById(
  albumIds: number[],
): Promise<Record<number, string | null>> {
  const unique = [...new Set(albumIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (unique.length === 0) return {};

  const ping = await inspectPing();
  if (!ping.ok) {
    return Object.fromEntries(unique.map((id) => [id, null]));
  }

  const rows = await inspectQuery<{
    id: number;
    cover_path: string | null;
    artwork_path: string | null;
    r2_cover_key: string | null;
  }>(
    `
    SELECT
      al.id,
      al.canonical_cover_path AS cover_path,
      (
        SELECT aal.canonical_cover_path
        FROM album_artwork_links aal
        WHERE aal.album_id = al.id
          AND coalesce(aal.canonical_cover_path, aal.r2_cover_key, '') <> ''
        ORDER BY aal.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS artwork_path,
      (
        SELECT aal.r2_cover_key
        FROM album_artwork_links aal
        WHERE aal.album_id = al.id
          AND coalesce(aal.r2_cover_key, '') <> ''
        ORDER BY aal.confidence_score DESC NULLS LAST
        LIMIT 1
      ) AS r2_cover_key
    FROM albums al
    WHERE al.id = ANY($1::int[])
    `,
    [unique],
  );

  const out: Record<number, string | null> = {};
  for (const id of unique) out[id] = null;
  for (const row of rows) {
    out[row.id] = resolveAlbumCoverUrlFromRow(row);
  }
  return out;
}

export async function loadMissionAlbumCandidates(
  rvtr: string,
  limit = 3,
): Promise<MissionAlbumCandidate[]> {
  try {
    const audit = await auditTrackAlbumLinks(rvtr);
    if (!audit) return [];

    const top = audit.candidates.slice(0, limit);
    const coverMap = await resolveAlbumCoverUrlsById(top.map((c) => c.albumId));
    const membershipCount = await countRvtrAlbumMemberships(rvtr);
    const siblingMap = new Map<number, Awaited<ReturnType<typeof loadAlbumSlotRvtrs>>>();
    await Promise.all(
      top.map(async (c) => {
        siblingMap.set(c.albumId, await loadAlbumSlotRvtrs(c.albumId));
      }),
    );

    const raw = top.map((c) => {
      const siblings = siblingMap.get(c.albumId) ?? [];
      const slotRvtr = c.existingRvtrOnSlot ?? siblings.find((s) => s.position === c.trackPosition)?.rvtr ?? null;
      const resolved = resolveAlbumRelationshipMode({
          proposal: {
            rvtr,
            albumId: Number(c.albumId),
            position: c.trackPosition,
            sequenceTitle: c.sequenceTitle ?? c.albumTitle,
            confidence: c.confidence,
            reasons: c.reasons ?? [],
            sourceKind: c.sourceKind,
          },
          existingLinkCount: audit.existingLinkCount,
          existingMembershipCount: membershipCount,
          slotRvtr,
          slotTitle: c.sequenceTitle,
          trackTitle: audit.title,
        });
      const attachMode =
        resolved.ok && resolved.mode === "co_album_membership"
          ? ("co_album_membership" as const)
          : ("tracklist_slot" as const);

      return {
        albumId: Number(c.albumId),
        albumTitle: normText(c.albumTitle, "Unknown album"),
        artistName: normText(c.artistName, "Unknown artist"),
        releaseYear: c.releaseYear,
        confidence: c.confidence,
        confidencePct: Math.round(c.confidence * 100),
        coverUrl: coverMap[c.albumId] ?? null,
        hasCover: c.hasCanonicalCover || Boolean(coverMap[c.albumId]),
        position: c.trackPosition,
        sequenceTitle: c.sequenceTitle ? normText(c.sequenceTitle) : null,
        sourceKind: c.sourceKind,
        reasons: c.reasons ?? [],
        rank: 0,
        recommended: false,
        researchNote: "",
        confidenceTier: "low" as const,
        evidence: [],
        linkedRvtr: c.existingRvtrOnSlot ?? null,
        attachMode,
        albumSiblings: siblings.map((s) => ({
          rvtr: s.rvtr,
          title: s.title,
          position: s.position,
          isCurrent: s.rvtr.toUpperCase() === rvtr.toUpperCase(),
        })),
      };
    });

    return enrichAlbumCandidates(raw, {
      rvtr,
      trackTitle: audit.title,
      artistName: audit.artistName,
      firstChartYear: audit.firstChartYear,
      peakHot100: audit.peakHot100,
    });
  } catch (err) {
    console.warn("[atlas-mission] album candidates failed:", err);
    return [];
  }
}

export type MissionLiveScores = {
  coverScore: number;
  chartScore: number;
  albumScore: number;
  commentaryScore: number;
  exhibitDepthPct: number;
  canonicalTags: RvTagId[];
  classification: ReviewClassification;
  classificationLocked: boolean;
  vdjUser2: string | null;
};

export async function loadMissionLiveScores(
  rvtr: string,
  auditRow: AuditMissionRow,
): Promise<MissionLiveScores> {
  const [tagStore, albumStats, vdjMeta] = await Promise.all([
    loadRetroverseTagsStore(),
    loadAlbumStats(rvtr),
    loadVdjMetaForPaths(auditRow.path ? [auditRow.path] : []),
  ]);

  const canonicalTags = tagsForRvtr(tagStore, rvtr);
  const pathKey = normPath(auditRow.path);
  const vdj = pathKey ? vdjMeta.get(pathKey) : undefined;
  const playCount = vdj?.playCount ?? auditRow.playCount ?? null;

  const perfYear = auditRow.performanceYear ?? 1976;
  const reviewState = await loadYearWorkspaceState(perfYear);
  const workspaceKey = missionMediaWorkspaceKey(auditRow.mediaId);
  const reviewRecord = reviewForVideoRow(reviewState, {
    workspaceKey,
    graphTrackId: null,
  });

  const classification = effectiveClassification(reviewRecord, playCount);
  const classificationLocked = reviewRecord?.classificationLocked === true;

  const coverScore = scoreCoverFromAlbumStats(albumStats);
  const albumScore = scoreAlbumFromAlbumStats(albumStats);
  const chartScore = auditRow.chartScore;
  const commentaryScore = scoreCommentary(
    canonicalTags,
    classification,
    classificationLocked,
    vdj?.user2 ?? null,
  );

  return {
    coverScore,
    chartScore,
    albumScore,
    commentaryScore,
    exhibitDepthPct: completenessPct({
      coverScore,
      chartScore,
      albumScore,
      commentaryScore,
    }),
    canonicalTags,
    classification,
    classificationLocked,
    vdjUser2: vdj?.user2 ?? null,
  };
}

export function appearanceResolved(
  store: MissionAppearancesStoreFile,
  rvtr: string,
  kind: AppearanceKind,
): boolean {
  const id = normRvtrId(rvtr);
  if (!id) return false;
  return Boolean(store.tracks[id]?.some((r) => r.kind === kind));
}

export function tvGapDone(
  auditRow: AuditMissionRow,
  rvtr: string,
  store: Awaited<ReturnType<typeof loadMissionAppearancesStore>>,
): boolean {
  if (auditRow.tvLinkage) return true;
  return appearanceResolved(store, rvtr, "tv");
}

export function movieGapDone(
  auditRow: AuditMissionRow,
  rvtr: string,
  store: Awaited<ReturnType<typeof loadMissionAppearancesStore>>,
): boolean {
  if (auditRow.movieLinkage) return true;
  return appearanceResolved(store, rvtr, "movie");
}

export async function loadMissionMediaResearch(input: {
  rvtr: string;
  row: AuditMissionRow;
  kind: AppearanceKind;
}): Promise<import("./mission-types").MissionMediaCandidate[]> {
  const store = await loadMissionAppearancesStore();
  const rejected = appearanceRejectedIds(store, input.rvtr, input.kind);
  return loadMediaAppearanceCandidates({
    artist: normText(input.row.artist, "Unknown artist"),
    title: normText(input.row.title, "Unknown title"),
    filePath: input.row.path,
    kind: input.kind,
    rejectedIds: rejected,
  });
}

export function buildActionableGaps(
  live: MissionLiveScores,
  auditRow: AuditMissionRow,
  rvtr: string,
  appearanceStore: Awaited<ReturnType<typeof loadMissionAppearancesStore>>,
): MissionGap[] {
  const gaps: MissionGap[] = [];

  if (!albumGapDone(live.albumScore)) {
    gaps.push({
      id: "album",
      kind: "album",
      label: "Album",
      description: "Review album evidence — approve when confidence is strong.",
      points: 5,
      embeddable: true,
    });
  }

  if (!commentaryGapDone(live.commentaryScore, live.canonicalTags)) {
    gaps.push({
      id: "commentary",
      kind: "commentary",
      label: "Commentary",
      description: "Review why Retroverse suggests these tags and class.",
      points: 3,
      embeddable: true,
    });
  }

  if (!tvGapDone(auditRow, rvtr, appearanceStore)) {
    gaps.push({
      id: "tv",
      kind: "tv",
      label: "TV",
      description: "Confirm or reject TV appearance matches.",
      points: 2,
      embeddable: true,
    });
  }

  if (!movieGapDone(auditRow, rvtr, appearanceStore)) {
    gaps.push({
      id: "movie",
      kind: "movie",
      label: "Movie",
      description: "Confirm or reject movie appearance matches.",
      points: 2,
      embeddable: true,
    });
  }

  return gaps;
}

export function buildDeferredSlots(auditRow: AuditMissionRow, live: MissionLiveScores): MissionGap[] {
  const deferred: MissionGap[] = [];
  const coverDone = live.coverScore >= 1;

  if (!coverDone) {
    deferred.push({
      id: "cover",
      kind: "cover",
      label: "Cover",
      description: "Album cover restore — coming soon.",
      points: 4,
      embeddable: false,
    });
  }
  return deferred;
}

export function buildSealsFromLive(
  rvtr: string,
  auditRow: AuditMissionRow,
  live: MissionLiveScores,
  appearanceStore: Awaited<ReturnType<typeof loadMissionAppearancesStore>>,
): MissionSeal[] {
  const seals: MissionSeal[] = [];

  if (rvtr) seals.push({ id: "rvtr", label: "Canonical RVTR" });
  if (auditRow.title && auditRow.artist) seals.push({ id: "identity", label: "Track identified" });
  if (live.chartScore >= 0.75) seals.push({ id: "chart", label: "Chart exhibit linked" });
  if (albumGapDone(live.albumScore)) seals.push({ id: "album", label: "Album linked" });
  if (commentaryGapDone(live.commentaryScore, live.canonicalTags)) {
    seals.push({ id: "commentary", label: "Exhibit placard written" });
  }
  if (tvGapDone(auditRow, rvtr, appearanceStore)) {
    const confirmed = appearanceConfirmed(appearanceStore, rvtr, "tv");
    seals.push({
      id: "tv",
      label: confirmed ? "TV appearance logged" : "No TV appearance",
    });
  }
  if (movieGapDone(auditRow, rvtr, appearanceStore)) {
    const confirmed = appearanceConfirmed(appearanceStore, rvtr, "movie");
    seals.push({
      id: "movie",
      label: confirmed ? "Movie appearance logged" : "No movie appearance",
    });
  }

  return seals;
}

export function missionPointsFromGaps(gaps: MissionGap[], seals: MissionSeal[]): {
  earned: number;
  available: number;
} {
  const sealPoints: Record<string, number> = {
    chart: 2,
    album: 5,
    commentary: 3,
    tv: 2,
    movie: 2,
  };
  const earnedFromSeals = seals.reduce((s, seal) => s + (sealPoints[seal.id] ?? 0), 0);
  const available = gaps.reduce((s, g) => s + g.points, 0);
  return { earned: earnedFromSeals, available };
}

export function loadCommentaryState(
  auditRow: AuditMissionRow,
  live: MissionLiveScores,
  vdjUser2: string | null,
): MissionCommentaryState {
  const perfYear = auditRow.performanceYear ?? 1976;
  const research = researchCommentary({
    row: auditRow,
    existingTags: live.canonicalTags,
    effectiveClassification: live.classification,
    vdjUser2,
  });

  return {
    tags: live.canonicalTags,
    classification: live.classification,
    classificationLocked: live.classificationLocked,
    reviewYear: perfYear,
    workspaceKey: missionMediaWorkspaceKey(auditRow.mediaId),
    suggestedStyleTags: research.suggestedStyleTags,
    suggestedCrowdTags: research.suggestedCrowdTags,
    suggestedTags: research.suggestedTags,
    suggestedClassification: research.suggestedClassification,
    researchSummary: research.researchSummary,
    confidenceTier: research.confidenceTier,
    evidence: research.evidence,
  };
}

export async function saveMissionCommentary(input: {
  rvtr: string;
  auditRow: AuditMissionRow;
  tags: MissionCommentaryState["tags"];
  classification: ReviewClassification;
}): Promise<MissionLiveScores> {
  const { saveRetroverseTagsForRvtr } = await import("@/lib/ops/retroverse-tags/store");
  await saveRetroverseTagsForRvtr(input.rvtr, input.tags);

  const perfYear = input.auditRow.performanceYear ?? 1976;
  const workspaceKey = missionMediaWorkspaceKey(input.auditRow.mediaId);
  await saveYearReviewRecord(perfYear, workspaceKey, {
    classification: input.classification,
    classificationLocked: true,
  });

  return loadMissionLiveScores(input.rvtr, input.auditRow);
}

export function albumWritesEnabled(): boolean {
  return healingWritesEnabled();
}
