/** Human-readable weighted reasons for healing console (read-only display). */

export type WeightedReason = {
  key: string;
  label: string;
  points: number;
  sign: "+" | "-";
};

const REASON_POINTS: Record<string, number | "delta"> = {
  same_canonical_artist: 40,
  album_tracklist_title_matches: 35,
  tracklist_slot_missing_rvtr_backfill_candidate: 25,
  canonical_track_album_link_bridge: 20,
  album_title_related: 10,
  album_has_canonical_cover: 10,
  album_has_artwork_links: 5,
  track_high_chart_presence: 5,
  different_artist_compilation_or_cover: -20,
  album_release_year_unknown: 0,
};

function pointsForReason(reason: string): number {
  if (reason in REASON_POINTS) {
    const v = REASON_POINTS[reason]!;
    return typeof v === "number" ? v : 0;
  }
  const yearMatch = /^release_year_delta_(\d+)$/.exec(reason);
  if (yearMatch) {
    const delta = Number(yearMatch[1]);
    return Math.max(0, 20 - delta * 2);
  }
  return 0;
}

function labelForReason(reason: string, points: number): string {
  if (reason === "same_canonical_artist") return "Same canonical artist";
  if (reason === "album_tracklist_title_matches") return "Album tracklist title match";
  if (reason === "album_title_related") return "Related album title";
  if (reason === "tracklist_slot_missing_rvtr_backfill_candidate") {
    return "Tracklist slot missing RVTR (backfill candidate)";
  }
  if (reason === "canonical_track_album_link_bridge") return "Canonical track–album bridge";
  if (reason === "different_artist_compilation_or_cover") {
    return "Different artist (compilation/cover)";
  }
  if (reason === "album_has_canonical_cover") return "Album has canonical cover";
  if (reason === "album_has_artwork_links") return "Album artwork links present";
  if (reason === "track_high_chart_presence") return "Chart overlap (Hot 100 presence)";
  if (reason === "album_release_year_unknown") return "Album release year unknown";
  const yearMatch = /^release_year_delta_(\d+)$/.exec(reason);
  if (yearMatch) {
    return `Release year proximity (Δ${yearMatch[1]})`;
  }
  return reason.replace(/_/g, " ");
}

/** Maps scorer reason tokens to sorted weighted rows (strongest signal first). */
export function formatWeightedReasons(reasons: string[]): WeightedReason[] {
  const weighted = reasons.map((key) => {
    const points = pointsForReason(key);
    return {
      key,
      label: labelForReason(key, points),
      points: Math.abs(points),
      sign: points < 0 ? "-" : "+",
    } satisfies WeightedReason;
  });

  weighted.sort((a, b) => b.points - a.points || a.label.localeCompare(b.label));
  return weighted.filter((r) => r.points > 0 || r.sign === "-");
}

export function formatWeightedReasonsLine(reasons: string[]): string {
  return formatWeightedReasons(reasons)
    .map((r) => `${r.sign}${r.points} ${r.key}`)
    .join(" · ");
}

/** Curator-facing compact line: +40 same_canonical_artist */
export function formatWeightedReasonsCompact(reasons: WeightedReason[]): string[] {
  return reasons.map((r) => `${r.sign}${r.points} ${r.key}`);
}
