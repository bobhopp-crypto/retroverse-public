import type { HealingApplyPreviousState } from "@/lib/healing/types";
import type {
  ExhibitQualityVerdict,
  PublicImprovementFinding,
} from "@/lib/healing/validation-types";

export function compareHealingStates(
  before: HealingApplyPreviousState,
  after: HealingApplyPreviousState,
  appliedAlbumId: number,
  lifecycle: "active" | "rolled_back" | "uncertain",
): { improvements: PublicImprovementFinding[]; exhibitQuality: ExhibitQualityVerdict; curatorVerdict: string } {
  const improvements: PublicImprovementFinding[] = [];

  const albumBefore = before.albumLinkCount;
  const albumAfter = after.albumLinkCount;
  improvements.push({
    kind: "album_continuity",
    label: "Album graph links",
    before: String(albumBefore),
    after: String(albumAfter),
    improved: albumAfter > albumBefore,
  });

  improvements.push({
    kind: "cover_continuity",
    label: "Canonical cover path",
    before: before.hasCanonicalCover ? "present" : "missing",
    after: after.hasCanonicalCover ? "present" : "missing",
    improved: !before.hasCanonicalCover && after.hasCanonicalCover,
  });

  const linkedApplied = after.linkedAlbumIds.includes(appliedAlbumId);
  improvements.push({
    kind: "applied_album_linked",
    label: "Approved album in graph",
    before: before.linkedAlbumIds.includes(appliedAlbumId) ? "yes" : "no",
    after: linkedApplied ? "yes" : "no",
    improved: linkedApplied && lifecycle === "active",
  });

  const coherentBefore = before.albumLinkCount > 0 && before.hasCanonicalCover;
  const coherentAfter = after.albumLinkCount > 0 && after.hasCanonicalCover;
  improvements.push({
    kind: "exhibit_coherent",
    label: "Exhibit-ready (link + cover)",
    before: coherentBefore ? "yes" : "no",
    after: coherentAfter ? "yes" : "no",
    improved: !coherentBefore && coherentAfter,
  });

  let exhibitQuality: ExhibitQualityVerdict = "unknown";
  if (lifecycle === "rolled_back") {
    const reverted =
      after.albumLinkCount <= before.albumLinkCount &&
      after.linkedAlbumIds.length <= before.linkedAlbumIds.length;
    exhibitQuality = reverted ? "reverted" : "unchanged";
  } else if (lifecycle === "active") {
    const anyImproved = improvements.some((i) => i.improved);
    const coherentGain = improvements.find((i) => i.kind === "exhibit_coherent")?.improved;
    if (coherentGain) exhibitQuality = "improved";
    else if (anyImproved) exhibitQuality = "partial";
    else exhibitQuality = "unchanged";
  }

  const curatorVerdict =
    lifecycle === "rolled_back"
      ? "Rolled back — treat prior approval as failed validation."
      : exhibitQuality === "improved"
        ? "Archive continuity improved — retain and spot-check public track page."
        : exhibitQuality === "partial"
          ? "Partial gain (e.g. link without cover) — verify exhibit before next heal."
          : exhibitQuality === "unchanged"
            ? "Graph changed but public continuity unchanged — review candidate quality."
            : "Outcome unclear — confirm proposal status in audit log.";

  return { improvements, exhibitQuality, curatorVerdict };
}
