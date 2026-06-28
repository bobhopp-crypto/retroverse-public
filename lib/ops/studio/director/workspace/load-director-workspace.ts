import "server-only";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { loadSongDnaPackage } from "@/lib/ops/studio/collector/song-dna-store";
import { loadDirectorPackage } from "@/lib/ops/studio/director/store";
import { loadEditorStory } from "@/lib/ops/studio/editor/store";
import { assessPackagePipelineStage } from "@/lib/ops/studio/production/package-stage";
import { getPublisherRecord, isPublisherApproved } from "@/lib/ops/studio/publisher/store";
import { normalizeRvtr } from "@/lib/studio/status";

import { experienceTypeLabel } from "@/lib/ops/studio/director/storytelling/design-experiences";
import { buildCollectorInventory } from "./build-collector-inventory";
import { buildEditorDataset } from "./build-editor-dataset";
import {
  evaluateExperienceCatalog,
  listDirectorExperienceCatalog,
} from "./experience-catalog-registry";
import type {
  BlueprintExperience,
  DirectorWorkspaceSnapshot,
  PreviewCard,
  ReviewDepartment,
} from "./types";

const STAGE_LABELS: Record<string, string> = {
  missing_collector: "Awaiting Collector",
  collector_complete: "Collector Complete",
  editor_queued: "Editor Queued",
  editor_complete: "Editor Complete",
  director_queued: "Director Queued",
  director_complete: "Director Complete",
  publisher_queued: "Publisher Queued",
  publisher_complete: "Publisher Complete",
  published: "Published",
};

const COMPLETION_BY_STAGE: Record<string, number> = {
  missing_collector: 0,
  collector_complete: 15,
  editor_queued: 20,
  editor_complete: 40,
  director_queued: 45,
  director_complete: 75,
  publisher_queued: 80,
  publisher_complete: 90,
  published: 100,
};

function packageStatusLabel(stage: string, published: boolean): string {
  if (published) return "Published";
  return STAGE_LABELS[stage] ?? stage;
}

function buildBlueprint(
  catalog: ReturnType<typeof evaluateExperienceCatalog>,
  director: Awaited<ReturnType<typeof loadDirectorPackage>>,
): DirectorWorkspaceSnapshot["blueprint"] {
  const scenes = director?.experiencePlan.scenes ?? [];
  const selected: BlueprintExperience[] = scenes.map((scene) => ({
    id: `scene-${scene.sceneNumber}`,
    label: scene.title || scene.headline || `Scene ${scene.sceneNumber}`,
    action: "selected",
    reason: scene.recommendedTemplate?.reason ?? scene.narrativePurpose,
  }));

  const selectedKeys = new Set(
    scenes.flatMap((s) => [
      s.recommendedTemplate?.templateId ?? "",
      s.narrativePurpose,
      s.sceneType,
    ]),
  );

  const skipped: BlueprintExperience[] = catalog
    .filter((card) => {
      if (card.status === "generated" || card.status === "published") {
        return false;
      }
      const entry = listDirectorExperienceCatalog().find((e) => e.id === card.id);
      if (!entry) return true;
      const matched = entry.matchKeys.some((key) =>
        [...selectedKeys].some((sk) => sk.includes(key)),
      );
      return !matched;
    })
    .map((card) => ({
      id: card.id,
      label: card.label,
      action: "skipped" as const,
      reason: card.reason,
    }));

  const estimatedAiCalls = catalog.filter(
    (c) => c.status === "needs_ai" || c.status === "generated",
  ).length;

  return {
    selected,
    skipped: skipped.slice(0, 24),
    estimatedPages: scenes.length,
    estimatedRuntimeSec: director?.experiencePlan.estimatedRuntimeSec ?? 0,
    estimatedAiCalls,
  };
}

function buildPreviews(
  director: Awaited<ReturnType<typeof loadDirectorPackage>>,
  published: boolean,
  rvtr: string,
): PreviewCard[] {
  const scenes = director?.experiencePlan.scenes ?? [];
  const href = published ? `/experience/${rvtr}` : null;
  const audienceByScene = new Map(
    (director?.storyPlan?.audienceSequence ?? []).map((step) => [step.order, step]),
  );
  const visualByExhibit = new Map(
    (director?.storyPlan?.visualConcepts ?? []).map((vc) => [vc.exhibitId, vc]),
  );
  const expByStory = new Map(
    (director?.storyPlan?.experienceConcepts ?? []).map((ec) => [ec.storyId, ec]),
  );
  const pageByScene = new Map(
    (director?.storyPlan?.pages ?? [])
      .filter((p) => p.sceneNumber != null)
      .map((p) => [p.sceneNumber!, p]),
  );
  const artByExhibit = new Map(
    (director?.storyPlan?.pageArtDirections ?? []).map((a) => [a.exhibitId, a]),
  );

  return scenes.map((scene) => {
    const step = audienceByScene.get(scene.sceneNumber);
    const page = pageByScene.get(scene.sceneNumber);
    const vc = page ? visualByExhibit.get(page.exhibitId) : undefined;
    const exp = page ? expByStory.get(page.storyId) : undefined;
    const art = page ? artByExhibit.get(page.exhibitId) : undefined;

    return {
      id: `scene-${scene.sceneNumber}`,
      label: step?.label ?? art?.layoutType ?? vc?.wireframeLabel ?? scene.title,
      headline: scene.headline,
      subtitle: scene.supportingCopy || scene.narrativePurpose,
      template: scene.recommendedTemplate?.displayName ?? scene.sceneType,
      durationSec: scene.estimatedDurationSec,
      href,
      warnings: step?.warnings ?? [],
      wireframeIcon: art?.wireframeIcon ?? vc?.wireframeIcon,
      wireframeLabel: vc?.wireframeLabel,
      experienceType: vc ? experienceTypeLabel(vc.experienceType) : undefined,
      mood: art?.mood ?? vc?.mood ?? exp?.mood,
      visualPriority: art?.priority ?? exp?.visualPriority,
      paletteChips: art?.paletteChips,
      cameraIcon: art?.cameraIcon,
      cameraLabel: art?.cameraLabel,
      motionIcon: art?.motionIcon,
      motionLabel: art?.motionLabel,
      layoutType: art?.layoutType,
      texture: art?.texture,
    };
  });
}

function buildPreviewChapters(
  director: Awaited<ReturnType<typeof loadDirectorPackage>>,
  previews: PreviewCard[],
): DirectorWorkspaceSnapshot["previewChapters"] {
  const chapters = director?.storyPlan?.chapters ?? [];
  if (chapters.length === 0) {
    return previews.length
      ? [{ storyId: "all", title: "Experience", warnings: [], pages: previews }]
      : [];
  }

  const previewById = new Map(previews.map((p) => [p.id, p]));
  const sceneNumFromId = (id: string) => Number(id.replace("scene-", ""));

  return chapters.map((chapter) => {
    const pages = chapter.pageIds
      .map((pageId) => {
        const page = director?.storyPlan?.pages.find((p) => p.id === pageId);
        if (!page?.sceneNumber) return null;
        return previewById.get(`scene-${page.sceneNumber}`) ?? null;
      })
      .filter(Boolean) as PreviewCard[];

    if (pages.length === 0) {
      const fallback = previews.filter((p) => {
        const n = sceneNumFromId(p.id);
        const page = director?.storyPlan?.pages.find((pg) => pg.sceneNumber === n);
        return page?.storyId === chapter.storyId;
      });
      return {
        storyId: chapter.storyId,
        title: chapter.title,
        warnings: chapter.warnings,
        pages: fallback,
      };
    }

    return {
      storyId: chapter.storyId,
      title: chapter.title,
      warnings: chapter.warnings,
      pages,
    };
  });
}

function buildReview(
  stage: Awaited<ReturnType<typeof assessPackagePipelineStage>>,
  director: Awaited<ReturnType<typeof loadDirectorPackage>>,
  publisher: Awaited<ReturnType<typeof getPublisherRecord>>,
  editorWarnings: string[],
): DirectorWorkspaceSnapshot["review"] {
  const departments: ReviewDepartment[] = [
    {
      id: "collector",
      label: "Collector",
      status: stage.hasCollector ? "approved" : "blocked",
      statusLabel: stage.hasCollector ? "Approved" : "Missing",
    },
    {
      id: "editor",
      label: "Editor",
      status: stage.editorSubmitted ? "approved" : stage.hasEditor ? "needs_review" : "waiting",
      statusLabel: stage.editorSubmitted ? "Approved" : stage.hasEditor ? "Needs Review" : "Waiting",
    },
    {
      id: "director",
      label: "Director",
      status: stage.hasDirector
        ? stage.publisherApproved
          ? "approved"
          : "needs_review"
        : "waiting",
      statusLabel: stage.hasDirector
        ? stage.publisherApproved
          ? "Approved"
          : "Needs Review"
        : "Waiting",
    },
    {
      id: "publisher",
      label: "Publisher",
      status: stage.publisherApproved
        ? "approved"
        : stage.publisherEvaluated
          ? "needs_review"
          : "waiting",
      statusLabel: stage.publisherApproved
        ? "Approved"
        : stage.publisherEvaluated
          ? "Needs Review"
          : "Waiting",
    },
  ];

  const warnings = [
    ...editorWarnings,
    ...(director?.review.missingAssets ?? []),
    ...(director?.review.warnings ?? []),
    ...(publisher?.evaluation?.coachingIssues ?? []),
  ].filter(Boolean);

  return { departments, warnings: [...new Set(warnings)].slice(0, 16) };
}

export async function loadDirectorWorkspaceSnapshot(
  rvtrInput: string,
): Promise<DirectorWorkspaceSnapshot | null> {
  const rvtr = normalizeRvtr(rvtrInput);
  if (!rvtr) return null;

  const [collector, editor, director, publisher, stage, songDna] = await Promise.all([
    loadCollectorPackage(rvtr),
    loadEditorStory(rvtr),
    loadDirectorPackage(rvtr),
    getPublisherRecord(rvtr),
    assessPackagePipelineStage(rvtr),
    loadSongDnaPackage(rvtr),
  ]);

  if (!collector && !editor && !director) return null;

  const published = isPublisherApproved(publisher);
  const coverUrl =
    collector?.visualAssets?.coverUrl ??
    editor?.approved.images[0]?.imageUrl ??
    null;
  const album = collector?.identity?.albumTitle ?? collector?.charts?.albumTitle ?? null;
  const year = collector?.identity?.year ?? null;

  const { facts: editorFacts, warnings: editorWarnings } = buildEditorDataset(editor, collector);
  const inventory = buildCollectorInventory(collector);
  const experienceCatalog = evaluateExperienceCatalog({
    rvtr,
    collector,
    editor,
    director,
    publisher,
    published,
    hasSongDna: Boolean(songDna),
  });

  const previews = buildPreviews(director, published, rvtr);
  const previewChapters = buildPreviewChapters(director, previews);

  return {
    rvtr,
    artist: director?.artist ?? collector?.artist ?? "Unknown",
    title: director?.title ?? collector?.title ?? "Unknown",
    coverUrl,
    album,
    year,
    packageStatus: packageStatusLabel(stage.stage, published),
    currentStage: STAGE_LABELS[stage.stage] ?? stage.stage,
    completionPct: COMPLETION_BY_STAGE[stage.stage] ?? 0,
    stage,
    collector,
    editor,
    director,
    publisher,
    storyPlan: director?.storyPlan ?? null,
    inventory,
    editorFacts,
    editorWarnings,
    experienceCatalog,
    blueprint: buildBlueprint(experienceCatalog, director),
    previews,
    previewChapters,
    review: buildReview(stage, director, publisher, editorWarnings),
    generatedAt: new Date().toISOString(),
  };
}
