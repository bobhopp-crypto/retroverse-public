/**
 * Sprint 3.35 — Visual concepts: per-exhibit wireframe direction from experience concepts.
 */

import type { Retrograph } from "@/lib/ops/studio/retrograph/types";

import type {
  DirectorExhibit,
  DirectorExperienceConcept,
  DirectorStory,
  DirectorVisualConcept,
  ExperienceType,
} from "./types";

const WIREFRAME_BY_TYPE: Record<
  ExperienceType,
  { icon: string; label: string; defaultTemplate: string }
> = {
  cinematic_opening: { icon: "🎬", label: "Hero", defaultTemplate: "hero" },
  magazine_spread: { icon: "📰", label: "Magazine", defaultTemplate: "gallery" },
  documentary: { icon: "📖", label: "Documentary", defaultTemplate: "quote" },
  timeline: { icon: "📅", label: "Timeline", defaultTemplate: "timeline" },
  gallery: { icon: "🖼", label: "Gallery", defaultTemplate: "gallery" },
  infographic: { icon: "📊", label: "Infographic", defaultTemplate: "chart" },
  collector_card: { icon: "🃏", label: "Collector Card", defaultTemplate: "gallery" },
  record_sleeve: { icon: "📀", label: "Album", defaultTemplate: "gallery" },
  map: { icon: "🌍", label: "World Map", defaultTemplate: "quote" },
  performance_reel: { icon: "🎤", label: "Live", defaultTemplate: "performance" },
  comparison: { icon: "⚖", label: "Compare", defaultTemplate: "gallery" },
  before_after: { icon: "↔", label: "Before/After", defaultTemplate: "gallery" },
  quote_focus: { icon: "💬", label: "Quote", defaultTemplate: "quote" },
  motion_graphic: { icon: "✨", label: "Motion", defaultTemplate: "chart" },
  data_visualization: { icon: "🧬", label: "DNA", defaultTemplate: "gallery" },
};

const EXHIBIT_OVERRIDES: Record<
  string,
  Partial<{ icon: string; label: string; templateId: string; experienceType: ExperienceType }>
> = {
  "chart_journey:peak_moment": { icon: "📈", label: "Chart", templateId: "chart", experienceType: "infographic" },
  "chart_journey:international": { icon: "🌍", label: "World Map", templateId: "quote", experienceType: "map" },
  "chart_journey:chart_longevity": { icon: "📊", label: "Infographic", templateId: "chart", experienceType: "infographic" },
  "recording_story:recording_session": { icon: "🎙", label: "Studio", templateId: "quote", experienceType: "documentary" },
  "recording_story:studio": { icon: "🏛", label: "Studio Room", templateId: "gallery", experienceType: "gallery" },
  "performance_history:official_video": { icon: "🎬", label: "Official Video", templateId: "performance", experienceType: "performance_reel" },
  "performance_history:live_moments": { icon: "🎤", label: "Live", templateId: "gallery", experienceType: "performance_reel" },
  "legacy:timeline_legacy": { icon: "🏆", label: "Timeline", templateId: "timeline", experienceType: "timeline" },
  "legacy:lasting_significance": { icon: "✨", label: "Legacy", templateId: "quote", experienceType: "quote_focus" },
  "album_story:album_context": { icon: "📀", label: "Album", templateId: "gallery", experienceType: "record_sleeve" },
  "cultural_impact:cultural_footprint": { icon: "🌍", label: "Global", templateId: "quote", experienceType: "map" },
  "song_dna:musical_fingerprint": { icon: "🧬", label: "DNA", templateId: "gallery", experienceType: "data_visualization" },
  "hero:identity": { icon: "🎬", label: "Hero", templateId: "hero", experienceType: "cinematic_opening" },
  "introduction:opening_hook": { icon: "💬", label: "Hook", templateId: "quote", experienceType: "quote_focus" },
};

function conceptForStory(
  storyId: string,
  concepts: DirectorExperienceConcept[],
): DirectorExperienceConcept | undefined {
  return concepts.find((c) => c.storyId === storyId);
}

export function designVisualConcepts(
  experienceConcepts: DirectorExperienceConcept[],
  exhibits: DirectorExhibit[],
  stories: DirectorStory[],
  _retrograph: Retrograph,
): DirectorVisualConcept[] {
  const out: DirectorVisualConcept[] = [];
  let prevType: ExperienceType | null = null;

  for (const exhibit of exhibits) {
    if (exhibit.status === "skipped") continue;
    const story = stories.find((s) => s.id === exhibit.storyId);
    if (!story || story.status === "skipped") continue;

    const storyConcept = conceptForStory(exhibit.storyId, experienceConcepts);
    const base = storyConcept
      ? WIREFRAME_BY_TYPE[storyConcept.experienceType]
      : WIREFRAME_BY_TYPE.documentary;
    const override = EXHIBIT_OVERRIDES[exhibit.id];

    const experienceType =
      override?.experienceType ?? storyConcept?.experienceType ?? "documentary";
    const wire = WIREFRAME_BY_TYPE[experienceType] ?? base;

    let templateId = override?.templateId ?? wire.defaultTemplate;
    if (templateId === "story") templateId = "quote";

    const contrastNote =
      prevType && prevType === experienceType
        ? `Contrast with prior ${experienceType.replace(/_/g, " ")} — vary motion or density`
        : null;

    out.push({
      id: `vc-${exhibit.id}`,
      storyId: exhibit.storyId,
      exhibitId: exhibit.id,
      experienceType,
      conceptTitle: storyConcept?.conceptTitle ?? exhibit.title,
      wireframeIcon: override?.icon ?? wire.icon,
      wireframeLabel: override?.label ?? wire.label,
      templateId,
      mood: storyConcept?.mood ?? "Editorial",
      motionHint: storyConcept?.animation ?? "Gentle fade",
      contrastNote,
    });

    prevType = experienceType;
  }

  return out;
}

export function visualConceptForExhibit(
  exhibitId: string,
  concepts: DirectorVisualConcept[],
): DirectorVisualConcept | undefined {
  return concepts.find((c) => c.exhibitId === exhibitId);
}
