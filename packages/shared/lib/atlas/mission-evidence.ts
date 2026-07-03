import type { CandidateSourceKind } from "@/lib/track/album-link-recovery/types";

import type { MissionConfidenceTier } from "./mission-confidence";
import type { MissionAlbumCandidate, MissionEvidenceSignal } from "./mission-types";

const SOURCE_KIND_LABEL: Record<CandidateSourceKind, string> = {
  same_artist_album: "Artist discography",
  tracklist_title_match: "Album tracklist",
  tracklist_title_unlinked: "Album tracklist (unlinked slot)",
  track_family_link: "Track family bridge",
  compilation_title_match: "Compilation tracklist",
};

function reasonEvidence(
  reason: string,
  candidate: MissionAlbumCandidate,
  ctx: AlbumEvidenceContext,
): MissionEvidenceSignal | null {
  if (reason === "same_canonical_artist") {
    return {
      id: "same-artist",
      label: "Same canonical artist",
      detail: `${candidate.artistName} matches ${ctx.artistName}`,
      source: "canonical graph",
    };
  }
  if (reason === "album_tracklist_title_matches") {
    const pos = candidate.position != null ? ` · track ${candidate.position}` : "";
    return {
      id: "tracklist-title",
      label: "Track title on album",
      detail: `"${ctx.trackTitle}" appears as "${candidate.sequenceTitle ?? ctx.trackTitle}" on this album${pos}`,
      source: SOURCE_KIND_LABEL[candidate.sourceKind],
    };
  }
  if (reason === "album_title_related") {
    return {
      id: "album-title",
      label: "Album title only",
      detail: `Discography match — no tracklist slot for "${ctx.trackTitle}" yet`,
      source: SOURCE_KIND_LABEL[candidate.sourceKind],
    };
  }
  if (reason === "tracklist_slot_missing_rvtr_backfill_candidate") {
    return {
      id: "unlinked-slot",
      label: "Open tracklist slot",
      detail: `"${candidate.sequenceTitle ?? ctx.trackTitle}" slot exists without RVTR link`,
      source: "canonical_album_tracks",
    };
  }
  if (reason === "canonical_track_album_link_bridge") {
    return {
      id: "track-family",
      label: "Track family bridge",
      detail: "Linked via canonical_track_album_links",
      source: "canonical graph",
    };
  }
  if (reason.startsWith("release_year_delta_")) {
    const delta = Number(reason.replace("release_year_delta_", ""));
    const chart = ctx.firstChartYear;
    const album = candidate.releaseYear;
    if (chart != null && album != null) {
      return {
        id: "chart-year",
        label: "Chart vs release year",
        detail: `Hot 100 debut ${chart} · album ${album} · Δ${delta} year${delta === 1 ? "" : "s"}`,
        source: "Hot 100 + albums",
      };
    }
  }
  if (reason === "album_has_canonical_cover") {
    return {
      id: "cover",
      label: "Canonical cover on file",
      detail: "Album has artwork in the graph",
      source: "albums",
    };
  }
  if (reason === "album_has_artwork_links") {
    return {
      id: "artwork-links",
      label: "Artwork links present",
      detail: "Linked cover assets in album_artwork_links",
      source: "album_artwork_links",
    };
  }
  if (reason === "track_high_chart_presence") {
    return {
      id: "chart-weeks",
      label: "Strong chart run",
      detail: "Long Hot 100 presence supports studio-album placement",
      source: "Hot 100",
    };
  }
  if (reason === "slot_linked_other_rvtr") {
    return {
      id: "other-rvtr",
      label: "Slot linked to another RVTR",
      detail: `Tracklist keyed to ${candidate.linkedRvtr ?? "another track"} — verify duplicate identity`,
      source: "canonical_album_tracks",
    };
  }
  if (reason === "artist_discography_only_no_tracklist") {
    return {
      id: "discography-only",
      label: "Discography guess only",
      detail: "Artist album with no matching tracklist slot for this title",
      source: "Artist discography",
    };
  }
  if (reason === "different_artist_compilation_or_cover") {
    return {
      id: "diff-artist",
      label: "Different artist",
      detail: `${candidate.artistName} ≠ ${ctx.artistName}`,
      source: "canonical graph",
    };
  }
  return null;
}

export type AlbumEvidenceContext = {
  rvtr: string;
  trackTitle: string;
  artistName: string;
  firstChartYear: number | null;
  peakHot100: number | null;
};

export function buildAlbumEvidence(
  candidate: MissionAlbumCandidate,
  ctx: AlbumEvidenceContext,
): MissionEvidenceSignal[] {
  const signals: MissionEvidenceSignal[] = [];
  const seen = new Set<string>();

  if (candidate.attachMode === "co_album_membership" && candidate.linkedRvtr) {
    signals.push({
      id: "co-album-attach",
      label: "Co-album attach path",
      detail: `Tracklist slot #${candidate.position ?? "?"} keyed to ${candidate.linkedRvtr} — this mission RVTR joins the same canonical album`,
      source: "rvtr_album_memberships",
    });
  }

  for (const reason of candidate.reasons) {
    const sig = reasonEvidence(reason, candidate, ctx);
    if (!sig || seen.has(sig.id)) continue;
    seen.add(sig.id);
    signals.push(sig);
  }

  if (ctx.peakHot100 != null && !seen.has("hot100-peak")) {
    signals.unshift({
      id: "hot100-peak",
      label: "Hot 100 peak",
      detail: `#${ctx.peakHot100} on Billboard Hot 100`,
      source: "Hot 100",
    });
  }

  if (candidate.sourceKind !== "same_artist_album" && !seen.has("source")) {
    signals.push({
      id: "source",
      label: "Evidence source",
      detail: SOURCE_KIND_LABEL[candidate.sourceKind],
      source: "candidate fetch",
    });
  }

  return signals;
}

export function albumResearchHeadlineForTier(
  candidate: MissionAlbumCandidate | null,
  tier: MissionConfidenceTier,
): string | null {
  if (!candidate) return "Retroverse found no album evidence yet.";
  const album = `“${candidate.albumTitle}”${candidate.releaseYear ? ` (${candidate.releaseYear})` : ""}`;
  if (tier === "high") {
    return `Strong evidence for ${album} — ${candidate.confidencePct}% confidence`;
  }
  if (tier === "medium") {
    return `Review evidence for ${album} — ${candidate.confidencePct}% confidence`;
  }
  return `Research needed — ${album} is only ${candidate.confidencePct}% confidence`;
}

export function commentaryFieldLabel(field: MissionEvidenceSignal["field"]): string {
  if (field === "style") return "Style";
  if (field === "crowd") return "Crowd";
  return "Performance class";
}
