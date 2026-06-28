import type { CollectorPackage } from "@/lib/ops/studio/collector/types";
import type { DirectorPackage } from "@/lib/ops/studio/director/types";
import type { EditorStoryPackage } from "@/lib/ops/studio/editor/types";
import type { PublisherRecord } from "@/lib/ops/studio/publisher/types";

import { EXHIBIT_IDS } from "../exhibit-plan";
import {
  allSceneTemplateIds,
  SCENE_TEMPLATE_LIBRARY,
  type SceneTemplateId,
} from "../scene-template-library";

import type { ExperienceCatalogStatus } from "./types";

export type ExperienceCatalogSource = "template" | "exhibit" | "extension";

export type ExperienceAvailability = {
  canBuild: boolean;
  hasSourceData: boolean;
  needsAi: boolean;
  reason: string;
};

export type ExperienceEvalContext = {
  rvtr: string;
  collector: CollectorPackage | null;
  editor: EditorStoryPackage | null;
  director: DirectorPackage | null;
  publisher: PublisherRecord | null;
  published: boolean;
  hasSongDna: boolean;
};

export type ExperienceCatalogDefinition = {
  id: string;
  label: string;
  category: string;
  source: ExperienceCatalogSource;
  /** Scene template id, exhibit id, or extension id for matching generated output. */
  matchKeys: string[];
  evaluate: (ctx: ExperienceEvalContext) => ExperienceAvailability;
};

const STATUS_LABELS: Record<ExperienceCatalogStatus, string> = {
  available: "Available",
  unavailable: "Unavailable",
  already_generated: "Already Generated",
  needs_source_data: "Needs Source Data",
  needs_ai: "Needs AI",
  generated: "Generated",
  published: "Published",
};

const registry: ExperienceCatalogDefinition[] = [];

export function registerDirectorExperience(entry: ExperienceCatalogDefinition): void {
  const existing = registry.findIndex((e) => e.id === entry.id);
  if (existing >= 0) {
    registry[existing] = entry;
    return;
  }
  registry.push(entry);
}

export function listDirectorExperienceCatalog(): ExperienceCatalogDefinition[] {
  return [...registry];
}

function editorApproved(ctx: ExperienceEvalContext) {
  return ctx.editor?.approved ?? null;
}

function hasAsset(ctx: ExperienceEvalContext, asset: string): boolean {
  const approved = editorApproved(ctx);
  const collector = ctx.collector;
  switch (asset) {
    case "hero_image":
      return (approved?.images.length ?? 0) > 0 || Boolean(collector?.visualAssets?.coverUrl);
    case "headline":
      return Boolean(ctx.editor?.story.headline?.trim());
    case "supporting_copy":
      return Boolean(ctx.editor?.story.summary?.trim() || ctx.editor?.story.fullStory?.trim());
    case "image":
      return (approved?.images.length ?? 0) > 0;
    case "images_multiple":
      return (approved?.images.length ?? 0) >= 2;
    case "timeline_events":
      return (ctx.editor?.workspace.evidence.timeline?.length ?? 0) >= 2;
    case "quote_text":
      return (approved?.quotes.length ?? 0) > 0;
    case "facts_multiple":
      return (approved?.facts.length ?? 0) >= 2;
    case "performance_reference":
      return Boolean(approved?.performanceId);
    case "performance_image":
      return (approved?.images.some((img) => img.performanceId) ?? false) || (approved?.images.length ?? 0) > 0;
    case "chart_data":
      return (
        ctx.collector?.charts?.peakHot100 != null ||
        Boolean(ctx.collector?.charts?.summary?.trim()) ||
        (approved?.facts.some((f) => /chart|hot 100|billboard/i.test(f.text)) ?? false)
      );
    case "comparison_copy":
      return Boolean(ctx.editor?.workspace.evidence.canonical?.recordingSummary?.trim());
    case "closing_copy":
      return Boolean(ctx.director?.experiencePlan.closing?.trim() || ctx.editor?.story.hook?.trim());
    default:
      return false;
  }
}

function templateAvailability(
  templateId: SceneTemplateId,
  ctx: ExperienceEvalContext,
): ExperienceAvailability {
  const template = SCENE_TEMPLATE_LIBRARY[templateId];
  const missing = template.requiredAssets.filter((asset) => !hasAsset(ctx, asset));
  if (!ctx.editor) {
    return {
      canBuild: false,
      hasSourceData: false,
      needsAi: false,
      reason: "Editor package not submitted.",
    };
  }
  if (missing.length === 0) {
    return {
      canBuild: true,
      hasSourceData: true,
      needsAi: templateId === "story" || templateId === "closing",
      reason: "Required assets present in Editor output.",
    };
  }
  return {
    canBuild: false,
    hasSourceData: missing.length < template.requiredAssets.length,
    needsAi: false,
    reason: `Missing: ${missing.join(", ").replace(/_/g, " ")}.`,
  };
}

function bootstrapTemplateEntries(): void {
  for (const templateId of allSceneTemplateIds()) {
    const template = SCENE_TEMPLATE_LIBRARY[templateId];
    registerDirectorExperience({
      id: `template:${templateId}`,
      label: template.displayName,
      category: "Scene Template",
      source: "template",
      matchKeys: [templateId],
      evaluate: (ctx) => templateAvailability(templateId, ctx),
    });
  }
}

function bootstrapExhibitEntries(): void {
  const labels: Record<(typeof EXHIBIT_IDS)[number], string> = {
    cover: "Hero Cover",
    chart_journey: "Chart Journey",
    iconic_moment: "Iconic Moment",
    song_dna: "Song DNA",
    performance: "Performance Exhibit",
  };

  for (const exhibitId of EXHIBIT_IDS) {
    registerDirectorExperience({
      id: `exhibit:${exhibitId}`,
      label: labels[exhibitId],
      category: "Museum Exhibit",
      source: "exhibit",
      matchKeys: [exhibitId, `museum_exhibit:${exhibitId}`],
      evaluate: (ctx) => {
        if (!ctx.editor) {
          return {
            canBuild: false,
            hasSourceData: false,
            needsAi: false,
            reason: "Editor package not submitted.",
          };
        }
        if (exhibitId === "cover") {
          return hasAsset(ctx, "hero_image")
            ? { canBuild: true, hasSourceData: true, needsAi: false, reason: "Cover art approved." }
            : { canBuild: false, hasSourceData: false, needsAi: false, reason: "No hero image approved." };
        }
        if (exhibitId === "chart_journey") {
          return hasAsset(ctx, "chart_data")
            ? { canBuild: true, hasSourceData: true, needsAi: false, reason: "Chart facts available." }
            : { canBuild: false, hasSourceData: false, needsAi: false, reason: "No chart data in clean dataset." };
        }
        if (exhibitId === "song_dna") {
          return ctx.hasSongDna
            ? { canBuild: true, hasSourceData: true, needsAi: false, reason: "Song DNA package exists." }
            : {
                canBuild: false,
                hasSourceData: hasAsset(ctx, "facts_multiple"),
                needsAi: true,
                reason: "Song DNA not generated yet.",
              };
        }
        if (exhibitId === "performance") {
          return hasAsset(ctx, "performance_reference")
            ? { canBuild: true, hasSourceData: true, needsAi: false, reason: "Performance selected." }
            : { canBuild: false, hasSourceData: false, needsAi: false, reason: "No performance selected." };
        }
        return hasAsset(ctx, "image")
          ? { canBuild: true, hasSourceData: true, needsAi: false, reason: "Visual moment available." }
          : { canBuild: false, hasSourceData: false, needsAi: false, reason: "No iconic image available." };
      },
    });
  }
}

function bootstrapExtensionEntries(): void {
  const extensions: Array<Omit<ExperienceCatalogDefinition, "source"> & { source?: "extension" }> = [
    {
      id: "ext:record_label",
      label: "Record Label",
      category: "Patron Card",
      matchKeys: ["record_label"],
      evaluate: (ctx) => {
        const hasLabel = ctx.collector?.recording?.notes?.some((n) => /label|catalog/i.test(n)) ?? false;
        return hasLabel
          ? { canBuild: true, hasSourceData: true, needsAi: false, reason: "Label notes in recording data." }
          : { canBuild: false, hasSourceData: false, needsAi: false, reason: "No verified label metadata." };
      },
    },
    {
      id: "ext:album_card",
      label: "Album Card",
      category: "Patron Card",
      matchKeys: ["album_card"],
      evaluate: (ctx) => {
        const album = ctx.collector?.identity?.albumTitle ?? ctx.collector?.charts?.albumTitle;
        return album
          ? { canBuild: true, hasSourceData: true, needsAi: false, reason: `Album: ${album}.` }
          : { canBuild: false, hasSourceData: false, needsAi: false, reason: "Album title not resolved." };
      },
    },
    {
      id: "ext:artist_card",
      label: "Artist Card",
      category: "Patron Card",
      matchKeys: ["artist_card"],
      evaluate: (ctx) =>
        ctx.collector?.artist
          ? { canBuild: true, hasSourceData: true, needsAi: false, reason: "Artist identity resolved." }
          : { canBuild: false, hasSourceData: false, needsAi: false, reason: "Artist not resolved." },
    },
    {
      id: "ext:historical_context",
      label: "Historical Context",
      category: "Editorial",
      matchKeys: ["historical_context", "cultural"],
      evaluate: (ctx) => {
        const events =
          (ctx.collector?.timelines?.song?.length ?? 0) +
          (ctx.collector?.culturalContext?.notes?.length ?? 0);
        return events > 0
          ? { canBuild: true, hasSourceData: true, needsAi: true, reason: `${events} cultural timeline notes.` }
          : { canBuild: false, hasSourceData: false, needsAi: true, reason: "No cultural timeline in dataset." };
      },
    },
    {
      id: "ext:related_songs",
      label: "Related Songs",
      category: "Discovery",
      matchKeys: ["related_songs"],
      evaluate: (ctx) => {
        const count = ctx.collector?.relationships?.relatedArtists?.length ?? 0;
        return count > 0
          ? { canBuild: true, hasSourceData: true, needsAi: false, reason: `${count} relationship links.` }
          : { canBuild: false, hasSourceData: false, needsAi: false, reason: "No related song graph." };
      },
    },
    {
      id: "ext:tv_appearance",
      label: "TV Appearance",
      category: "Performance",
      matchKeys: ["tv_appearance", "television"],
      evaluate: (ctx) => {
        const tvFacts =
          ctx.editor?.approved.facts.filter((f) => /tv|television|show|film/i.test(f.text)).length ?? 0;
        return tvFacts > 0
          ? { canBuild: true, hasSourceData: true, needsAi: false, reason: `${tvFacts} TV/film facts approved.` }
          : { canBuild: false, hasSourceData: false, needsAi: false, reason: "No TV appearance facts approved." };
      },
    },
    {
      id: "ext:music_video",
      label: "Music Video",
      category: "Performance",
      matchKeys: ["music_video", "video"],
      evaluate: (ctx) => {
        const videos = ctx.collector?.videoPerformance?.items?.length ?? 0;
        return videos > 0
          ? { canBuild: true, hasSourceData: true, needsAi: false, reason: `${videos} video items collected.` }
          : { canBuild: false, hasSourceData: false, needsAi: false, reason: "No owned video metadata." };
      },
    },
    {
      id: "ext:producer",
      label: "Producer",
      category: "Credits",
      matchKeys: ["producer"],
      evaluate: (ctx) => {
        const hit =
          ctx.editor?.approved.facts.some((f) => /produc(ed|er|tion)/i.test(f.text)) ??
          ctx.collector?.recording?.notes?.some((n) => /produc/i.test(n));
        return hit
          ? { canBuild: true, hasSourceData: true, needsAi: false, reason: "Production credit in clean facts." }
          : { canBuild: false, hasSourceData: false, needsAi: false, reason: "No producer credit verified." };
      },
    },
    {
      id: "ext:songwriting",
      label: "Songwriting",
      category: "Credits",
      matchKeys: ["songwriting", "writer"],
      evaluate: (ctx) => {
        const hit = ctx.editor?.approved.facts.some((f) => /writ(ten|er|ing)|compos(ed|er)/i.test(f.text));
        return hit
          ? { canBuild: true, hasSourceData: true, needsAi: false, reason: "Songwriting credit in clean facts." }
          : { canBuild: false, hasSourceData: false, needsAi: false, reason: "No songwriting credit verified." };
      },
    },
    {
      id: "ext:lyrics_theme",
      label: "Lyrics Theme",
      category: "Editorial",
      matchKeys: ["lyrics_theme"],
      evaluate: (ctx) =>
        ctx.collector?.lyrics?.available
          ? { canBuild: true, hasSourceData: true, needsAi: true, reason: "Lyrics reference available (internal)." }
          : { canBuild: false, hasSourceData: false, needsAi: true, reason: "Lyrics not collected." },
    },
    {
      id: "ext:did_you_know",
      label: "Did You Know",
      category: "Editorial",
      matchKeys: ["did_you_know", "fact_stack"],
      evaluate: (ctx) =>
        (ctx.editor?.approved.facts.length ?? 0) >= 3
          ? { canBuild: true, hasSourceData: true, needsAi: false, reason: "Multiple approved facts." }
          : { canBuild: false, hasSourceData: false, needsAi: false, reason: "Fewer than 3 approved facts." },
    },
    {
      id: "ext:awards",
      label: "Awards",
      category: "Legacy",
      matchKeys: ["awards"],
      evaluate: (ctx) => {
        const hit = ctx.editor?.approved.facts.some((f) => /grammy|award|nomination|gold|platinum/i.test(f.text));
        return hit
          ? { canBuild: true, hasSourceData: true, needsAi: false, reason: "Award facts in clean dataset." }
          : { canBuild: false, hasSourceData: false, needsAi: false, reason: "No award facts verified." };
      },
    },
    {
      id: "ext:legacy",
      label: "Legacy",
      category: "Legacy",
      matchKeys: ["legacy", "closing"],
      evaluate: (ctx) =>
        Boolean(ctx.director?.experiencePlan.closing?.trim() || ctx.editor?.story.hook?.trim())
          ? { canBuild: true, hasSourceData: true, needsAi: true, reason: "Closing beat available from editorial." }
          : { canBuild: false, hasSourceData: false, needsAi: true, reason: "No legacy closing editorial." },
    },
    {
      id: "ext:performance_notes",
      label: "Performance Notes",
      category: "Performance",
      matchKeys: ["performance_notes"],
      evaluate: (ctx) => {
        const perfId = ctx.editor?.approved.performanceId;
        const notes = perfId ? ctx.editor?.workspace.performances[perfId]?.notes : null;
        return notes?.trim()
          ? { canBuild: true, hasSourceData: true, needsAi: false, reason: "Performance workspace notes exist." }
          : { canBuild: false, hasSourceData: false, needsAi: false, reason: "No performance notes drafted." };
      },
    },
    {
      id: "ext:bob_notes",
      label: "Bob Notes",
      category: "Operator",
      matchKeys: ["bob_notes"],
      evaluate: () => ({
        canBuild: false,
        hasSourceData: false,
        needsAi: false,
        reason: "Operator notes not wired to catalog yet.",
      }),
    },
    {
      id: "ext:qr_experience",
      label: "QR Experience",
      category: "Distribution",
      matchKeys: ["qr_experience"],
      evaluate: (ctx) =>
        ctx.published
          ? { canBuild: true, hasSourceData: true, needsAi: false, reason: "Published experience can expose QR." }
          : { canBuild: false, hasSourceData: false, needsAi: false, reason: "Experience not published yet." },
    },
    {
      id: "ext:museum_display",
      label: "Museum Display",
      category: "Distribution",
      matchKeys: ["museum_display", "museum"],
      evaluate: (ctx) =>
        ctx.director?.experiencePlan.templateLibraryVersion?.includes("museum")
          ? { canBuild: true, hasSourceData: true, needsAi: false, reason: "Museum exhibit plan generated." }
          : { canBuild: false, hasSourceData: Boolean(ctx.editor), needsAi: false, reason: "Director museum plan not built." },
    },
    {
      id: "ext:mobile_story",
      label: "Mobile Story",
      category: "Distribution",
      matchKeys: ["mobile_story"],
      evaluate: (ctx) =>
        (ctx.director?.experiencePlan.scenes.length ?? 0) >= 3
          ? { canBuild: true, hasSourceData: true, needsAi: false, reason: "Scene plan has mobile story length." }
          : { canBuild: false, hasSourceData: Boolean(ctx.editor), needsAi: false, reason: "Director scene plan too short." },
    },
    {
      id: "ext:dj_slides",
      label: "DJ Slides",
      category: "Distribution",
      matchKeys: ["dj_slides"],
      evaluate: (ctx) =>
        ctx.director?.renderSpec
          ? { canBuild: true, hasSourceData: true, needsAi: false, reason: "Render spec available for slides." }
          : { canBuild: false, hasSourceData: Boolean(ctx.director), needsAi: false, reason: "Render spec not generated." },
    },
  ];

  for (const ext of extensions) {
    registerDirectorExperience({ ...ext, source: "extension" });
  }
}

let bootstrapped = false;

function ensureCatalogBootstrapped(): void {
  if (bootstrapped) return;
  bootstrapTemplateEntries();
  bootstrapExhibitEntries();
  bootstrapExtensionEntries();
  bootstrapped = true;
}

function sceneMatchesEntry(
  scene: { narrativePurpose: string; recommendedTemplate?: { templateId: string } | null; sceneType: string },
  entry: ExperienceCatalogDefinition,
): boolean {
  for (const key of entry.matchKeys) {
    if (scene.narrativePurpose.includes(key)) return true;
    if (scene.recommendedTemplate?.templateId === key) return true;
    if (scene.sceneType === key) return true;
  }
  return false;
}

function isGenerated(entry: ExperienceCatalogDefinition, ctx: ExperienceEvalContext): boolean {
  const scenes = ctx.director?.experiencePlan.scenes ?? [];
  return scenes.some((scene) => sceneMatchesEntry(scene, entry));
}

export function evaluateExperienceCatalog(ctx: ExperienceEvalContext) {
  ensureCatalogBootstrapped();

  return listDirectorExperienceCatalog().map((entry) => {
    const availability = entry.evaluate(ctx);
    const generated = isGenerated(entry, ctx);

    let status: ExperienceCatalogStatus;
    if (ctx.published && generated) {
      status = "published";
    } else if (ctx.published && availability.canBuild) {
      status = "published";
    } else if (generated) {
      status = "generated";
    } else if (!availability.hasSourceData && !availability.canBuild) {
      status = "needs_source_data";
    } else if (availability.needsAi && availability.canBuild) {
      status = "needs_ai";
    } else if (availability.canBuild) {
      status = "available";
    } else {
      status = "unavailable";
    }

    return {
      id: entry.id,
      label: entry.label,
      category: entry.category,
      source: entry.source,
      status,
      statusLabel: STATUS_LABELS[status],
      reason: availability.reason,
    };
  });
}

export function catalogEntryById(id: string): ExperienceCatalogDefinition | null {
  ensureCatalogBootstrapped();
  return registry.find((e) => e.id === id) ?? null;
}

ensureCatalogBootstrapped();
