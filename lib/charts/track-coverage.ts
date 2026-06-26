/** Chart row media coverage — DJ MEDIA/VIDEO ownership only; MUSIC links never count as Owned. */

export type TrackCoverageStatus = "owned" | "youtube" | "missing";

export type CoverageFilter = "all" | TrackCoverageStatus;

export function classifyTrackCoverage(
  hasOwnedVideo: boolean,
  hasYoutube: boolean,
): TrackCoverageStatus {
  if (hasOwnedVideo) return "owned";
  if (hasYoutube) return "youtube";
  return "missing";
}

export function coverageBadgeLabel(status: TrackCoverageStatus): string {
  if (status === "owned") return "OWNED";
  if (status === "youtube") return "YOUTUBE";
  return "MISSING";
}

export function coverageMatchesFilter(
  status: TrackCoverageStatus | null | undefined,
  filter: CoverageFilter,
): boolean {
  if (filter === "all") return true;
  return status === filter;
}

const RE_RVTR = /^RVTR\d{6}$/i;

export function normalizeCoverageRvtr(token: string | null | undefined): string | null {
  const raw = token?.trim() ?? "";
  if (!raw) return null;
  const match = raw.match(/RVTR\d{6}/i)?.[0];
  return match ? match.toUpperCase() : RE_RVTR.test(raw) ? raw.toUpperCase() : null;
}

export function coverageFromMap(
  map: Map<string, TrackCoverageStatus> | Record<string, TrackCoverageStatus>,
  token: string | null | undefined,
): TrackCoverageStatus | null {
  const rvtr = normalizeCoverageRvtr(token);
  if (!rvtr) return null;
  if (map instanceof Map) return map.get(rvtr) ?? "missing";
  return map[rvtr] ?? "missing";
}
