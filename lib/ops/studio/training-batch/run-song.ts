import "server-only";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { runCollectorForSong } from "@/lib/ops/studio/collector/run-collector";
import type { ResolvedCollectorSong } from "@/lib/ops/studio/collector/pilot-songs";
import { runAndSaveDirector, saveDirectorHandoff } from "@/lib/ops/studio/director/store";
import { buildDirectorHandoffFromEditor } from "@/lib/ops/studio/editor/director-package";
import { distillCollectorPackage } from "@/lib/ops/studio/editor/distill";
import { attachEditorialReview } from "@/lib/ops/studio/editor/editorial-review";
import { attachNarrativeBlueprint } from "@/lib/ops/studio/editor/narrative-blueprint";
import { rewriteStoryFromAcceptedFacts } from "@/lib/ops/studio/editor/rewrite";
import { loadEditorStory, saveEditorStory } from "@/lib/ops/studio/editor/store";
import { loadDirectorPackage } from "@/lib/ops/studio/director/store";
import { evaluatePublisherPackage } from "@/lib/ops/studio/publisher/evaluate";
import { getPublisherRecord, isPublisherApproved } from "@/lib/ops/studio/publisher/store";
import { loadPublicExperience } from "@/lib/retroverse/renderer/load-public-experience";
import { isBlueprintComplete } from "@/lib/ops/studio/editor/narrative-blueprint";
import { editorialStatusToConfidence } from "@/lib/ops/studio/editor/types";

import type {
  DepartmentMetrics,
  SelectedTrainingSong,
  SongBatchResult,
  TrainingBatchMode,
} from "./types";

function emptyDept(): DepartmentMetrics {
  return {
    runtimeMs: 0,
    confidence: null,
    status: "skipped",
    error: null,
    details: {},
  };
}

function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

async function measureRenderer(rvtr: string): Promise<DepartmentMetrics> {
  const start = Date.now();
  try {
    const payload = await loadPublicExperience(rvtr, { bypassPublisherGate: true });
    if (!payload) {
      return {
        runtimeMs: Date.now() - start,
        confidence: null,
        status: "blocked",
        error: "experience_not_loadable",
        details: { generated: false, renderReady: false },
      };
    }
    const scenes = payload.scenes;
    const words = scenes.map(
      (s) =>
        wordCount(s.headline) +
        wordCount(s.supportingCopy) +
        s.assets.factTexts.reduce((n, f) => n + wordCount(f), 0),
    );
    const avgWords = words.length ? Math.round(words.reduce((a, b) => a + b, 0) / words.length) : 0;
    const imageSlots = scenes.filter((s) => s.assets.imageUrls.length > 0 || s.coverUrl || s.dnaWatercolorSvg).length;
    const coverage = scenes.length ? Math.round((imageSlots / scenes.length) * 100) : 0;

    return {
      runtimeMs: Date.now() - start,
      confidence: payload.pipeline.usedMuseum ? 97 : Math.round((payload.experience.spec.estimatedRenderingConfidence ?? 0.85) * 100),
      status: "complete",
      error: null,
      details: {
        generated: true,
        renderReady: true,
        sceneCount: scenes.length,
        avgWordsPerScene: avgWords,
        visualCoveragePct: coverage,
        museumMode: payload.pipeline.usedMuseum,
        warnings: payload.pipeline.usedComposition ? 0 : 1,
      },
    };
  } catch (err) {
    return {
      runtimeMs: Date.now() - start,
      confidence: null,
      status: "failed",
      error: err instanceof Error ? err.message : "renderer_failed",
      details: { generated: false, renderReady: false },
    };
  }
}

async function measurePublisher(rvtr: string): Promise<DepartmentMetrics> {
  const start = Date.now();
  const director = await loadDirectorPackage(rvtr);
  if (!director?.renderSpec) {
    return {
      runtimeMs: Date.now() - start,
      confidence: null,
      status: "blocked",
      error: "no_render_spec",
      details: { approved: 0, needsCoaching: 0, blocked: 1, missingAssets: 0 },
    };
  }

  const record = (await getPublisherRecord(rvtr)) ?? (await evaluatePublisherPackage(rvtr));
  const evaluation = record?.evaluation;
  if (!evaluation) {
    return {
      runtimeMs: Date.now() - start,
      confidence: null,
      status: "blocked",
      error: "evaluation_failed",
      details: { approved: 0, needsCoaching: 0, blocked: 1, missingAssets: 0 },
    };
  }

  const approved = isPublisherApproved(record);
  const needsCoaching = evaluation.publicationClass === "needs_coaching";
  const blocked = evaluation.publicationClass === "blocked";

  return {
    runtimeMs: Date.now() - start,
    confidence: evaluation.qualityScore,
    status: blocked ? "blocked" : "complete",
    error: blocked ? "blocked" : approved ? null : "awaiting_approval",
    details: {
      approved: approved ? 1 : 0,
      needsCoaching: needsCoaching ? 1 : 0,
      blocked: blocked ? 1 : 0,
      missingAssets: evaluation.optionalGaps.length,
      publicationClass: evaluation.publicationClass,
      qualityScore: evaluation.qualityScore,
      why: evaluation.why,
    },
  };
}

export type RunSongOptions = {
  song: SelectedTrainingSong;
  mode: TrainingBatchMode;
  skipCollector?: boolean;
  maxRetries?: number;
};

export async function runTrainingSongPipeline(options: RunSongOptions): Promise<SongBatchResult> {
  const { song, mode, skipCollector = false, maxRetries = 1 } = options;
  const startedAt = new Date().toISOString();
  const coachingNotes: string[] = [];
  let retries = 0;

  const result: SongBatchResult = {
    rvtr: song.rvtr,
    artist: song.artist,
    title: song.title,
    mode,
    status: "complete",
    error: null,
    startedAt,
    finishedAt: startedAt,
    totalRuntimeMs: 0,
    retries: 0,
    collector: emptyDept(),
    editor: emptyDept(),
    director: emptyDept(),
    publisher: emptyDept(),
    renderer: emptyDept(),
    patronValue: null,
    sceneCount: null,
    wordsPerScene: null,
    visualCoverage: null,
    packageCompleteness: null,
    coachingNotes,
  };

  const t0 = Date.now();

  // --- Collector ---
  if (!skipCollector) {
    let collectorDone = false;
    for (let attempt = 0; attempt <= maxRetries && !collectorDone; attempt += 1) {
      if (attempt > 0) retries += 1;
      const cStart = Date.now();
      try {
        const resolved: ResolvedCollectorSong = {
          rvtr: song.rvtr,
          artist: song.artist,
          title: song.title,
          graphLinked: true,
          vdjFilePath: song.filePath,
          performanceHints: [],
          notes: ["Overnight training batch"],
        };
        await runCollectorForSong(resolved);
        const pkg = await loadCollectorPackage(song.rvtr);
        result.collector = {
          runtimeMs: Date.now() - cStart,
          confidence: pkg?.researchQuality ?? null,
          status: "complete",
          error: null,
          details: {
            sourcesFound: pkg?.sourceLog.length ?? 0,
            factsCollected: pkg?.candidateFacts.length ?? 0,
            approvedFacts: pkg?.candidateFacts.filter((f) => f.approvalStatus === "approved").length ?? 0,
            framesExtracted: pkg?.visualAssets.extraction.extractedCount ?? 0,
            missingAreas: pkg?.missingAreas.length ?? 0,
          },
        };
        if ((pkg?.missingAreas.length ?? 0) > 2) {
          coachingNotes.push(`Collector: ${pkg!.missingAreas.slice(0, 2).join("; ")}`);
        }
        collectorDone = true;
      } catch (err) {
        result.collector = {
          runtimeMs: Date.now() - cStart,
          confidence: null,
          status: attempt >= maxRetries ? "failed" : "skipped",
          error: err instanceof Error ? err.message : "collector_failed",
          details: {},
        };
      }
    }
  } else {
    const pkg = await loadCollectorPackage(song.rvtr);
    result.collector = {
      runtimeMs: 0,
      confidence: pkg?.researchQuality ?? null,
      status: pkg ? "complete" : "skipped",
      error: pkg ? null : "no_collector_package",
      details: {
        skipped: true,
        factsCollected: pkg?.candidateFacts.length ?? 0,
      },
    };
  }

  // --- Editor ---
  if (result.collector.status !== "failed") {
    const eStart = Date.now();
    try {
      const pkg = await loadCollectorPackage(song.rvtr);
      if (!pkg) throw new Error("missing_collector");
      let story = distillCollectorPackage(pkg);
      const rewrite = await rewriteStoryFromAcceptedFacts(pkg, story, {
        allowCloud: mode === "cloud",
      });
      story = rewrite.story;
      story = attachEditorialReview(pkg, story);
      story = attachNarrativeBlueprint(pkg, story);
      await saveEditorStory(story);

      const confLabel = editorialStatusToConfidence(story.meta.editorialStatus);
      const confScore = confLabel === "ready" ? 92 : confLabel === "review" ? 78 : 58;
      const blueprintOk = isBlueprintComplete(story.narrativeBlueprint);

      result.editor = {
        runtimeMs: Date.now() - eStart,
        confidence: confScore,
        status: "complete",
        error: null,
        details: {
          usedCloud: rewrite.usedAi,
          blueprintQuality: blueprintOk ? "complete" : "partial",
          storyCompleteness: story.story.fullStory.trim().length,
          acceptedFacts: story.workspace.candidateFacts.filter((f) => f.status === "accepted").length,
          patronValue: story.workspace.editorialReview?.patronValue ?? null,
        },
      };
      result.patronValue = story.workspace.editorialReview?.patronValue ?? null;
      if (!rewrite.usedAi && mode === "cloud") {
        coachingNotes.push("Editor: cloud rewrite unavailable — rules fallback used");
      }
      if (story.story.fullStory.trim().length < 200) {
        coachingNotes.push("Editor: story under 200 characters");
      }
    } catch (err) {
      result.editor = {
        runtimeMs: Date.now() - eStart,
        confidence: null,
        status: "failed",
        error: err instanceof Error ? err.message : "editor_failed",
        details: {},
      };
      result.status = "partial";
    }
  }

  // --- Director ---
  if (result.editor.status === "complete") {
    const dStart = Date.now();
    try {
      const editor = await loadEditorStory(song.rvtr);
      if (!editor) throw new Error("missing_editor");
      const handoff = buildDirectorHandoffFromEditor(editor);
      await saveDirectorHandoff(handoff);
      const director = await runAndSaveDirector(song.rvtr);
      if (!director) throw new Error("director_run_failed");

      const scenes = director.experiencePlan.scenes;
      const templates = new Set(scenes.map((s) => s.recommendedTemplate?.templateId ?? s.sceneType));

      result.director = {
        runtimeMs: Date.now() - dStart,
        confidence: Math.round((director.review.estimatedRenderingConfidence ?? 0.75) * 100),
        status: "complete",
        error: null,
        details: {
          sceneCount: scenes.length,
          runtimeEstimateSec: scenes.reduce((s, x) => s + x.estimatedDurationSec, 0),
          templateVariety: templates.size,
          chartUsage: scenes.some((s) => s.sceneType === "chart" || s.recommendedTemplate?.templateId === "chart") ? 1 : 0,
          packageReadiness: director.review.renderReadiness ?? "",
        },
      };
      result.sceneCount = scenes.length;
      await evaluatePublisherPackage(song.rvtr);
    } catch (err) {
      result.director = {
        runtimeMs: Date.now() - dStart,
        confidence: null,
        status: "failed",
        error: err instanceof Error ? err.message : "director_failed",
        details: {},
      };
      result.status = "partial";
    }
  }

  result.publisher = await measurePublisher(song.rvtr);
  result.renderer = await measureRenderer(song.rvtr);

  if (typeof result.renderer.details.avgWordsPerScene === "number") {
    result.wordsPerScene = result.renderer.details.avgWordsPerScene as number;
  }
  if (typeof result.renderer.details.visualCoveragePct === "number") {
    result.visualCoverage = result.renderer.details.visualCoveragePct as number;
  }
  if (typeof result.renderer.details.sceneCount === "number") {
    result.sceneCount = result.renderer.details.sceneCount as number;
  }

  const deptComplete = [
    result.collector.status === "complete",
    result.editor.status === "complete",
    result.director.status === "complete",
    result.publisher.status === "complete",
    result.renderer.status === "complete",
  ].filter(Boolean).length;
  result.packageCompleteness = Math.round((deptComplete / 5) * 100);

  if (result.collector.status === "failed" && result.editor.status === "failed") {
    result.status = "failed";
    result.error = result.collector.error ?? result.editor.error;
  }

  result.retries = retries;
  result.totalRuntimeMs = Date.now() - t0;
  result.finishedAt = new Date().toISOString();
  return result;
}
