import {
  parseRvTagString,
  type RvTagId,
} from "@/lib/ops/rvtags-review/vocabulary";
import { suggestedClassFromRotation } from "@/lib/ops/year-workspace/vdj-rotation-signal";
import type { ReviewClassification } from "@/lib/ops/year-workspace/review-types";

import { confidenceTier } from "./mission-confidence";
import {
  albumResearchHeadlineForTier,
  buildAlbumEvidence,
  type AlbumEvidenceContext,
} from "./mission-evidence";
import { normArtistKey, normText } from "./mission-safe";
import type {
  AuditMissionRow,
  MissionAlbumCandidate,
  MissionEvidenceSignal,
} from "./mission-types";

const STYLE_TAG_IDS: RvTagId[] = [
  "BritishInvasion",
  "Motown",
  "Soul",
  "Psychedelic",
  "GarageRock",
  "SummerOfLove",
  "FolkRock",
  "BaroquePop",
  "CountryRock",
  "BlueEyedSoul",
];

const CROWD_TAG_IDS: RvTagId[] = [
  "SingAlong",
  "CrowdFavorite",
  "DanceFloor",
  "PartyStarter",
  "SlowDance",
];

const EDITORIAL_SET = new Set<RvTagId>(STYLE_TAG_IDS);
const CROWD_SET = new Set<RvTagId>(CROWD_TAG_IDS);

function splitTags(tags: RvTagId[]): { style: RvTagId[]; crowd: RvTagId[] } {
  const style: RvTagId[] = [];
  const crowd: RvTagId[] = [];
  for (const tag of tags) {
    if (EDITORIAL_SET.has(tag)) style.push(tag);
    else if (CROWD_SET.has(tag)) crowd.push(tag);
  }
  return { style, crowd };
}

function uniqueTags(tags: RvTagId[]): RvTagId[] {
  return [...new Set(tags)];
}

function suggestStyleFromSignals(row: AuditMissionRow): RvTagId[] {
  const year = row.performanceYear ?? null;
  const artist = normArtistKey(row.artist);
  const tags: RvTagId[] = [];

  if (year != null && year >= 1964 && year <= 1966) tags.push("BritishInvasion");
  if (year != null && year >= 1967 && year <= 1969) tags.push("Psychedelic");
  if (year != null && year >= 1970 && year <= 1974) tags.push("FolkRock");
  if (year != null && year >= 1975 && year <= 1979) tags.push("FolkRock", "CountryRock");

  if (artist.includes("fleetwood") || artist.includes("eagles") || artist.includes("steely")) {
    tags.push("FolkRock");
  }
  if (artist.includes("marvin") || artist.includes("temptations") || artist.includes("supremes")) {
    tags.push("Motown", "Soul");
  }
  if (artist.includes("seger") || artist.includes("springsteen")) {
    tags.push("BlueEyedSoul");
  }

  return uniqueTags(tags).slice(0, 2);
}

function suggestCrowdFromSignals(row: AuditMissionRow): RvTagId[] {
  const plays = row.playCount ?? 0;
  const peak = row.peakHot100;
  const tags: RvTagId[] = [];

  if (plays >= 5) tags.push("SingAlong");
  if (plays >= 15) tags.push("CrowdFavorite");
  if (peak != null && peak <= 10) tags.push("PartyStarter");
  if (peak != null && peak >= 30) tags.push("SlowDance");

  return uniqueTags(tags).slice(0, 3);
}

function pushEvidence(
  out: MissionEvidenceSignal[],
  signal: MissionEvidenceSignal,
): void {
  if (out.some((s) => s.id === signal.id)) return;
  out.push(signal);
}

function buildCommentaryEvidence(input: {
  row: AuditMissionRow;
  suggestedStyle: RvTagId[];
  suggestedCrowd: RvTagId[];
  suggestedClassification: ReviewClassification;
  vdjUser2: string | null;
  fromVdjStyle: RvTagId[];
  fromVdjCrowd: RvTagId[];
}): MissionEvidenceSignal[] {
  const evidence: MissionEvidenceSignal[] = [];
  const year = input.row.performanceYear;
  const plays = input.row.playCount ?? 0;
  const peak = input.row.peakHot100;

  if (input.fromVdjStyle.length > 0 || input.fromVdjCrowd.length > 0) {
    pushEvidence(evidence, {
      id: "vdj-user2",
      label: "VirtualDJ User2 tags",
      detail: input.vdjUser2?.trim() || "Imported tag string on your file",
      source: "VDJ database",
    });
    for (const tag of input.fromVdjStyle) {
      pushEvidence(evidence, {
        id: `vdj-style-${tag}`,
        label: "VDJ suggests Style",
        detail: tag,
        source: "VDJ User2",
        field: "style",
        value: tag,
      });
    }
    for (const tag of input.fromVdjCrowd) {
      pushEvidence(evidence, {
        id: `vdj-crowd-${tag}`,
        label: "VDJ suggests Crowd",
        detail: tag,
        source: "VDJ User2",
        field: "crowd",
        value: tag,
      });
    }
  }

  if (year != null) {
    pushEvidence(evidence, {
      id: "era-style",
      label: "Era signal",
      detail: `Performance year ${year} → ${input.suggestedStyle.join(", ") || "Style tags"}`,
      source: "Retroverse era map",
      field: "style",
      value: input.suggestedStyle[0],
    });
  }

  if (peak != null) {
    pushEvidence(evidence, {
      id: "chart-crowd",
      label: "Chart peak",
      detail: `Hot 100 #${peak} → ${input.suggestedCrowd.filter((t) => t === "PartyStarter" || t === "CrowdFavorite").join(", ") || "crowd tags"}`,
      source: "Hot 100",
      field: "crowd",
      value: input.suggestedCrowd.find((t) => t === "PartyStarter" || t === "CrowdFavorite"),
    });
  }

  if (plays > 0) {
    pushEvidence(evidence, {
      id: "rotation-crowd",
      label: "Library rotation",
      detail: `${plays} plays in your collection → SingAlong / CrowdFavorite signal`,
      source: "VDJ play count",
      field: "crowd",
      value: "SingAlong",
    });
    pushEvidence(evidence, {
      id: "rotation-class",
      label: "Rotation class signal",
      detail: `${plays} plays → ${input.suggestedClassification} performance class`,
      source: "VDJ rotation signal",
      field: "classification",
      value: input.suggestedClassification,
    });
  }

  if (input.row.classification && input.row.classification !== "Fill") {
    pushEvidence(evidence, {
      id: "existing-class",
      label: "Existing review class",
      detail: `Year workspace already set to ${input.row.classification}`,
      source: "year workspace",
      field: "classification",
      value: input.row.classification,
    });
  }

  return evidence;
}

export type MissionCommentaryResearch = {
  suggestedStyleTags: RvTagId[];
  suggestedCrowdTags: RvTagId[];
  suggestedTags: RvTagId[];
  suggestedClassification: ReviewClassification;
  researchSummary: string;
  confidenceTier: ReturnType<typeof confidenceTier>;
  evidence: MissionEvidenceSignal[];
};

export function researchCommentary(input: {
  row: AuditMissionRow;
  existingTags: RvTagId[];
  effectiveClassification: ReviewClassification;
  vdjUser2: string | null;
}): MissionCommentaryResearch {
  const fromVdj = parseRvTagString(input.vdjUser2);
  const vdjSplit = splitTags(fromVdj);

  let suggestedStyle =
    vdjSplit.style.length > 0 ? vdjSplit.style : suggestStyleFromSignals(input.row);
  let suggestedCrowd =
    vdjSplit.crowd.length > 0 ? vdjSplit.crowd : suggestCrowdFromSignals(input.row);

  if (input.existingTags.length > 0) {
    const existing = splitTags(input.existingTags);
    if (existing.style.length > 0) suggestedStyle = existing.style;
    if (existing.crowd.length > 0) suggestedCrowd = existing.crowd;
  }

  const suggestedTags = uniqueTags([...suggestedStyle, ...suggestedCrowd]);
  const suggestedClassification =
    input.effectiveClassification !== "Fill"
      ? input.effectiveClassification
      : suggestedClassFromRotation(input.row.playCount ?? null);

  const evidence = buildCommentaryEvidence({
    row: input.row,
    suggestedStyle,
    suggestedCrowd,
    suggestedClassification,
    vdjUser2: input.vdjUser2,
    fromVdjStyle: vdjSplit.style,
    fromVdjCrowd: vdjSplit.crowd,
  });

  const signalCount = evidence.length;
  const hasVdj = vdjSplit.style.length > 0 || vdjSplit.crowd.length > 0;
  const confidencePct = hasVdj
    ? 88
    : signalCount >= 3
      ? 78
      : signalCount >= 2
        ? 68
        : 52;

  const tier = confidenceTier(confidencePct);
  const researchSummary =
    tier === "high"
      ? `Strong placard evidence — ${suggestedClassification} · ${suggestedTags.join(", ")}`
      : tier === "medium"
        ? `Review placard evidence — ${suggestedClassification} suggested from ${signalCount} signals`
        : `Research needed — only ${signalCount} signal${signalCount === 1 ? "" : "s"} for placard`;

  return {
    suggestedStyleTags: suggestedStyle,
    suggestedCrowdTags: suggestedCrowd,
    suggestedTags,
    suggestedClassification,
    researchSummary,
    confidenceTier: tier,
    evidence,
  };
}

export function enrichAlbumCandidates(
  candidates: MissionAlbumCandidate[],
  ctx: AlbumEvidenceContext,
): MissionAlbumCandidate[] {
  if (candidates.length === 0) return [];

  const enriched = candidates.map((c) => {
    const evidence = buildAlbumEvidence(c, ctx);
    const tier = confidenceTier(c.confidencePct);
    const topEvidence = evidence[0]?.label ?? c.sourceKind.replace(/_/g, " ");
    const researchNote =
      tier === "high"
        ? `${c.confidencePct}% · ${topEvidence}`
        : `${c.confidencePct}% · ${evidence.length} evidence signal${evidence.length === 1 ? "" : "s"}`;

    return {
      ...c,
      evidence,
      confidenceTier: tier,
      researchNote,
    };
  });

  const sorted = [...enriched].sort((a, b) => b.confidence - a.confidence);
  return sorted.map((c, index) => ({
    ...c,
    rank: index + 1,
    recommended: index === 0 && c.confidenceTier === "high",
  }));
}

export function albumResearchHeadline(
  candidates: MissionAlbumCandidate[],
): string | null {
  const pick = candidates.find((c) => c.recommended) ?? candidates[0];
  if (!pick) return null;
  return albumResearchHeadlineForTier(pick, pick.confidenceTier);
}
