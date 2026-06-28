import type { ArtDirectionProfile } from "@/lib/retroverse/art-direction/types";
import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";
import type { PublicationId } from "@/lib/retroverse/experience-design/types";
import { suggestPublications } from "@/lib/retroverse/experience-design/publications";
import { suggestVisualStyles } from "@/lib/retroverse/visual-assets/derived-visual";
import { buildDerivedVisualPrompt } from "@/lib/retroverse/visual-assets/prompt-builder";
import { getVisualStyle } from "@/lib/retroverse/visual-assets/style-library";
import type { PerformanceFrame } from "@/lib/retroverse/visual-assets/types";

import { canApproveMore } from "./budget";
import type { CoverageItem, CoverageRole, DuplicatePairRecommendation } from "./types";
import type {
  AssetBudget,
  LibraryDerivedAsset,
  LibraryPerformanceFrame,
  VisualRecommendation,
} from "./types";
import { isNearDuplicatePair } from "./duplicates";
import { generatorForStyle } from "./generators";

const ROLE_STYLE_AFFINITY: Partial<Record<CoverageRole, string[]>> = {
  hero: ["television_scanline", "charcoal_sketch", "airbrush_1980s"],
  performance: ["concert_poster", "graphic_novel", "screen_print"],
  television: ["television_scanline", "airbrush_1980s"],
  chart: ["halftone_print", "vintage_editorial", "magazine_illustration"],
  reflection: ["watercolor", "minimal_ink", "charcoal_sketch"],
  closing: ["charcoal_sketch", "minimal_ink", "television_scanline"],
  recording: ["blueprint", "vintage_editorial"],
  studio: ["blueprint", "colored_pencil"],
};

function pickFrameForRole(
  role: CoverageRole,
  frames: LibraryPerformanceFrame[],
  discardIds: Set<string>,
): LibraryPerformanceFrame | null {
  const available = frames.filter((f) => !discardIds.has(f.id));
  if (available.length === 0) return null;

  switch (role) {
    case "hero":
      return available.find((f) => f.shotType === "hero") ?? available[0] ?? null;
    case "performance":
      return (
        available.find((f) => f.shotType === "performance" || f.shotType === "alternate") ??
        available[0] ??
        null
      );
    case "reflection":
      return available.find((f) => f.shotType === "close_up") ?? available[0] ?? null;
    case "television":
      return available.find((f) => f.shotType === "hero") ?? available[0] ?? null;
    case "chart":
      return available.find((f) => f.shotType === "hero") ?? available[0] ?? null;
    default:
      return available[0] ?? null;
  }
}

function styleForRole(role: CoverageRole, songDna: CollectorSongDna | null): string | null {
  const dnaStyles = suggestVisualStyles(songDna, 4).map((s) => s.style.id);
  const roleStyles = ROLE_STYLE_AFFINITY[role] ?? [];
  for (const id of roleStyles) {
    if (dnaStyles.includes(id) || getVisualStyle(id)) return id;
  }
  return dnaStyles[0] ?? roleStyles[0] ?? null;
}

function existingDerivedForRole(
  role: CoverageRole,
  derived: LibraryDerivedAsset[],
): LibraryDerivedAsset[] {
  return derived.filter((a) =>
    a.preferredSceneTypes.some((t) => {
      const hay = t.toLowerCase();
      if (role === "hero") return hay.includes("hero");
      if (role === "performance") return hay.includes("performance");
      if (role === "chart") return hay.includes("chart");
      if (role === "reflection" || role === "closing") return hay.includes("reflection");
      return false;
    }),
  );
}

export function buildVisualRecommendations(input: {
  coverage: CoverageItem[];
  frames: LibraryPerformanceFrame[];
  derivedAssets: LibraryDerivedAsset[];
  duplicates: DuplicatePairRecommendation[];
  budget: AssetBudget;
  songDna: CollectorSongDna | null;
  artDirection: ArtDirectionProfile | null;
  publicationId: PublicationId;
  songTitle: string;
  artist: string;
}): VisualRecommendation[] {
  const {
    coverage,
    frames,
    derivedAssets,
    duplicates,
    budget,
    songDna,
    artDirection,
    publicationId,
    songTitle,
    artist,
  } = input;

  const discardIds = new Set(duplicates.map((d) => d.discardFrameId));
  const recommendations: VisualRecommendation[] = [];
  let priority = 1;

  for (const item of coverage) {
    if (item.status === "approved") {
      if (item.satisfiedBy.length > 0) {
        recommendations.push({
          id: `rec-use-${item.role}`,
          role: item.role,
          kind: "use_existing",
          priority: priority++,
          reason: `${item.notes} — existing assets satisfy this role.`,
          suggestedStyle: null,
          sourceFrameId: item.satisfiedBy.find((id) => frames.some((f) => f.id === id)) ?? null,
          existingAssetIds: item.satisfiedBy,
        });
      }
      continue;
    }

    if (item.status === "missing" || item.status === "recommended") {
      const frame = pickFrameForRole(item.role, frames, discardIds);
      const styleId = styleForRole(item.role, songDna);

      if (frame && item.satisfiedBy.includes(frame.id)) {
        recommendations.push({
          id: `rec-use-${item.role}`,
          role: item.role,
          kind: "use_existing",
          priority: priority++,
          reason: `Performance frame already covers ${item.role}.`,
          suggestedStyle: null,
          sourceFrameId: frame.id,
          existingAssetIds: [frame.id],
        });
        continue;
      }

      if (!frame) {
        recommendations.push({
          id: `rec-extract-${item.role}`,
          role: item.role,
          kind: "extract_frame",
          priority: priority++,
          reason: `No frame available for ${item.role} — extract from owned video before generating.`,
          suggestedStyle: null,
          sourceFrameId: null,
          existingAssetIds: [],
        });
        continue;
      }

      if (!canApproveMore(budget) || budget.approvedLimit === 0) {
        recommendations.push({
          id: `rec-use-${item.role}`,
          role: item.role,
          kind: "use_existing",
          priority: priority++,
          reason: `Derived budget exhausted (${budget.approvedCount}/${budget.approvedLimit}) — use extracted frame only.`,
          suggestedStyle: null,
          sourceFrameId: frame.id,
          existingAssetIds: [frame.id],
        });
        continue;
      }

      const already = existingDerivedForRole(item.role, derivedAssets);
      if (already.length > 0) {
        recommendations.push({
          id: `rec-use-derived-${item.role}`,
          role: item.role,
          kind: "use_existing",
          priority: priority++,
          reason: `Derived asset already recommended for ${item.role}.`,
          suggestedStyle: already[0]!.style,
          sourceFrameId: already[0]!.sourceFrameId,
          existingAssetIds: already.map((a) => a.id),
        });
        continue;
      }

      if (styleId) {
        const style = getVisualStyle(styleId);
        const perfFrame: PerformanceFrame = {
          id: frame.id,
          imageUrl: frame.imageUrl,
          caption: frame.category,
          performanceId: frame.performanceId,
          role: frame.shotType,
          sceneNumbers: [],
        };

        const wouldDuplicate = derivedAssets.some((d) => {
          const source = frames.find((f) => f.id === d.sourceFrameId);
          return (
            source &&
            d.style === styleId &&
            isNearDuplicatePair(frame, source, 85)
          );
        });

        if (wouldDuplicate) {
          recommendations.push({
            id: `rec-skip-dup-${item.role}`,
            role: item.role,
            kind: "use_existing",
            priority: priority++,
            reason: "Near-duplicate derived visual already exists — do not generate another.",
            suggestedStyle: styleId,
            sourceFrameId: frame.id,
            existingAssetIds: [frame.id],
          });
          continue;
        }

        const generator = generatorForStyle(styleId);
        recommendations.push({
          id: `rec-gen-${item.role}-${styleId}`,
          role: item.role,
          kind: "generate_derived",
          priority: priority++,
          reason: style
            ? `${item.notes} — ${style.name} via ${generator?.name ?? "frame stylizer"}.`
            : item.notes,
          suggestedStyle: styleId,
          sourceFrameId: frame.id,
          existingAssetIds: [],
        });
      }
    }
  }

  return recommendations.sort((a, b) => a.priority - b.priority);
}

export function buildRecommendedDerivedAssets(input: {
  recommendations: VisualRecommendation[];
  frames: LibraryPerformanceFrame[];
  songDna: CollectorSongDna | null;
  artDirection: ArtDirectionProfile | null;
  publicationId: PublicationId;
  songTitle: string;
  artist: string;
  rvtr: string;
  existingDerived: LibraryDerivedAsset[];
}): LibraryDerivedAsset[] {
  const merged = new Map<string, LibraryDerivedAsset>();
  for (const d of input.existingDerived) merged.set(d.id, d);

  for (const rec of input.recommendations) {
    if (rec.kind !== "generate_derived" || !rec.suggestedStyle || !rec.sourceFrameId) continue;

    const frame = input.frames.find((f) => f.id === rec.sourceFrameId);
    const style = getVisualStyle(rec.suggestedStyle);
    if (!frame || !style) continue;

    const id = `dv-${input.rvtr}-${rec.sourceFrameId}-${rec.suggestedStyle}`;
    if (merged.has(id)) continue;

    const perfFrame: PerformanceFrame = {
      id: frame.id,
      imageUrl: frame.imageUrl,
      caption: frame.category,
      performanceId: frame.performanceId,
      role: frame.shotType,
      sceneNumbers: [],
    };

    merged.set(id, {
      id,
      sourceFrameId: frame.id,
      style: rec.suggestedStyle,
      styleName: style.name,
      prompt: buildDerivedVisualPrompt({
        frame: perfFrame,
        style,
        songDna: input.songDna,
        artDirection: input.artDirection,
        songTitle: input.songTitle,
        artist: input.artist,
      }),
      status: "recommended",
      preferredSceneTypes: style.preferredSceneTypes,
      publicationAffinity: input.publicationId,
      storagePath: null,
    });
  }

  return [...merged.values()];
}

export function resolvePublicationId(songDna: CollectorSongDna | null): PublicationId {
  return suggestPublications(songDna, 1)[0]?.id ?? "rolling_stone";
}
