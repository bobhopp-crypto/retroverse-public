import type {
  ContinuitySignal,
  HealedPublicVerification,
  HighImpactHealingObservation,
  PublicContinuityVerdict,
  PublicExhibitSnapshot,
} from "@/lib/healing/continuity-types";

export function buildContinuitySignals(
  before: PublicExhibitSnapshot,
  after: PublicExhibitSnapshot | null,
): ContinuitySignal[] {
  if (!after) {
    return [
      {
        kind: "exhibit_completeness",
        label: "Public page reachable",
        before: before.pacing,
        after: "unavailable",
        improved: false,
      },
    ];
  }

  const artistPathBefore =
    before.artistHref && before.albumCount > 0 ? "connected" : "broken";
  const artistPathAfter =
    after.artistHref && after.albumCount > 0 ? "connected" : "broken";

  return [
    {
      kind: "artist_album_track_path",
      label: "Artist → album → track path",
      before: artistPathBefore,
      after: artistPathAfter,
      improved: artistPathBefore !== "connected" && artistPathAfter === "connected",
    },
    {
      kind: "cover_continuity",
      label: "Track hero cover",
      before: before.coverVisible ? "visible" : "missing",
      after: after.coverVisible ? "visible" : "missing",
      improved: !before.coverVisible && after.coverVisible,
    },
    {
      kind: "album_shelf",
      label: "On these albums shelf",
      before: before.albumCount > 0 ? `${before.albumCount} album(s)` : "empty",
      after: after.albumCount > 0 ? `${after.albumCount} album(s)` : "empty",
      improved: before.albumCount === 0 && after.albumCount > 0,
    },
    {
      kind: "related_coherence",
      label: "Related tracks (artist shelf)",
      before: String(before.relatedTrackCount),
      after: String(after.relatedTrackCount),
      improved: after.relatedTrackCount >= before.relatedTrackCount && after.relatedTrackCount > 0,
    },
    {
      kind: "exhibit_completeness",
      label: "Exhibit completeness",
      before: before.pacing,
      after: after.pacing,
      improved:
        (before.pacing === "weak" || before.pacing === "partial") && after.pacing === "coherent",
    },
  ];
}

export function publicContinuityVerdict(
  lifecycle: HealedPublicVerification["lifecycle"],
  signals: ContinuitySignal[],
  before: PublicExhibitSnapshot,
  after: PublicExhibitSnapshot | null,
): PublicContinuityVerdict {
  if (!after) return "unknown";
  if (lifecycle === "rolled_back") {
    const reverted =
      after.albumCount <= before.albumCount &&
      after.coverVisible === before.coverVisible &&
      after.pacing !== "coherent";
    return reverted ? "reverted" : "unchanged";
  }
  if (signals.some((s) => s.kind === "exhibit_completeness" && s.improved)) {
    return "more_complete";
  }
  if (signals.some((s) => s.improved)) return "partial";
  return "unchanged";
}

export function continuityTrustAnswer(
  verdict: PublicContinuityVerdict,
  before: PublicExhibitSnapshot,
  after: PublicExhibitSnapshot | null,
): string {
  if (!after) {
    return "Could not load public track page — verify /track route manually.";
  }
  switch (verdict) {
    case "more_complete":
      return "Yes — the public exhibit should feel more complete (cover and/or album shelf restored).";
    case "partial":
      return "Partly — graph heal moved the needle; spot-check hero cover and album shelf on the live track page.";
    case "reverted":
      return "No — rollback restored prior public surface; do not count as archive improvement.";
    case "unchanged":
      return "Not visibly — relationship row may exist without changing what visitors see.";
    default:
      return "Unclear — inspect track page before next heal.";
  }
}

export function publicImpactScore(
  before: PublicExhibitSnapshot,
  after: PublicExhibitSnapshot | null,
  signals: ContinuitySignal[],
  lifecycle: HealedPublicVerification["lifecycle"],
): number {
  if (lifecycle !== "active" || !after) return 0;

  let score = 0;
  if (signals.find((s) => s.kind === "cover_continuity")?.improved) score += 40;
  if (signals.find((s) => s.kind === "album_shelf")?.improved) score += 35;
  if (signals.find((s) => s.kind === "exhibit_completeness")?.improved) score += 25;
  if (before.chartWeeks >= 20) score += 15;
  if (before.peakHot100 != null && before.peakHot100 <= 10) score += 20;
  if (before.pacing === "weak") score += 10;
  return score;
}

export function impactNote(
  before: PublicExhibitSnapshot,
  after: PublicExhibitSnapshot | null,
  score: number,
): string {
  if (!after || score === 0) return "Low visible impact — verify live page.";
  const parts: string[] = [];
  if (!before.coverVisible && after.coverVisible) parts.push("iconic cover path restored");
  if (before.albumCount === 0 && after.albumCount > 0) parts.push("album shelf now visible");
  if (before.pacing === "weak" && after.pacing === "coherent") {
    parts.push("exhibit-complete chart track");
  }
  if (before.peakHot100 != null && before.peakHot100 <= 10) {
    parts.push(`Hot 100 peak #${before.peakHot100}`);
  }
  return parts.length ? parts.join(" · ") : "Moderate continuity gain";
}

export function toHighImpactObservation(
  v: HealedPublicVerification,
): HighImpactHealingObservation | null {
  if (v.publicImpactScore < 25) return null;
  return {
    rvtr: v.rvtr,
    title: v.before.title,
    artistName: v.before.artistName,
    score: v.publicImpactScore,
    note: v.impactNote,
    trackHref: v.before.trackHref,
  };
}
