import "server-only";

import { access } from "fs/promises";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { runCollectorForSong } from "@/lib/ops/studio/collector/run-collector";
import type { ResolvedCollectorSong } from "@/lib/ops/studio/collector/pilot-songs";
import { collectorOutputPath } from "@/lib/ops/studio/collector/paths";
import { runAndSaveDirector } from "@/lib/ops/studio/director/store";
import { directorRenderSpecPath } from "@/lib/ops/studio/director/paths";
import { distillCollectorPackage } from "@/lib/ops/studio/editor/distill";
import { attachEditorialReview } from "@/lib/ops/studio/editor/editorial-review";
import { attachNarrativeBlueprint } from "@/lib/ops/studio/editor/narrative-blueprint";
import { rewriteStoryFromAcceptedFacts } from "@/lib/ops/studio/editor/rewrite";
import { loadEditorStory, saveEditorStory } from "@/lib/ops/studio/editor/store";
import { buildRetrographFromCollector } from "@/lib/ops/studio/retrograph/build-retrograph";
import { saveRetrograph } from "@/lib/ops/studio/retrograph/store";
import { autoPublishStandard } from "@/lib/ops/studio/publisher/publish-policy";
import { evaluatePublisherPackage } from "@/lib/ops/studio/publisher/evaluate";
import { runVisualProducer } from "@/lib/ops/studio/publisher/visual-producer";
import { isPublisherApproved, getPublisherRecord } from "@/lib/ops/studio/publisher/store";

import { ensureDirectorHandoff } from "./handoff";
import { PipelineTransitionLog } from "./pipeline-log";
import type { ProductionQueueItem } from "./queue";
import { syncPipelineFailure, syncPipelineTransition } from "./sync-pipeline-events";

export type ProductionSongResult = {
  rvtr: string;
  artist: string;
  title: string;
  status: "published" | "partial" | "failed";
  error: string | null;
  runtimeMs: number;
  stages: {
    collector: "skipped" | "complete" | "failed";
    editor: "skipped" | "complete" | "failed";
    director: "skipped" | "complete" | "failed";
    publisher: "skipped" | "evaluated" | "approved" | "failed";
  };
  warnings: string[];
  auditLog: string;
  transitions: Array<{ id: string; at: string; runtimeMs?: number; detail?: string }>;
};

async function collectorExists(rvtr: string): Promise<boolean> {
  try {
    await access(collectorOutputPath(rvtr));
    return true;
  } catch {
    return false;
  }
}

async function directorExists(rvtr: string): Promise<boolean> {
  try {
    await access(directorRenderSpecPath(rvtr));
    return true;
  } catch {
    return false;
  }
}

export type RunProductionSongOptions = {
  item: ProductionQueueItem;
  skipCollector?: boolean;
  refreshCollector?: boolean;
  /** Re-distill Editor story + Retrograph from existing Collector package. */
  refreshEditor?: boolean;
  /** Re-run Director even when render spec already exists. */
  refreshDirector?: boolean;
};

export async function runProductionSong(
  options: RunProductionSongOptions,
): Promise<ProductionSongResult> {
  const { item } = options;
  const t0 = Date.now();
  const log = new PipelineTransitionLog(item.rvtr);
  const warnings: string[] = [];
  const stages: ProductionSongResult["stages"] = {
    collector: "skipped",
    editor: "skipped",
    director: "skipped",
    publisher: "skipped",
  };

  async function mark(id: Parameters<typeof syncPipelineTransition>[0], detail?: string) {
    log.mark(id, detail ? { detail } : undefined);
    await syncPipelineTransition(id, item, detail ? { detail } : undefined);
  }

  try {
    // Collector
    const hasCollector = await collectorExists(item.rvtr);
    if (!hasCollector || options.refreshCollector) {
      const tCol = Date.now();
      const resolved: ResolvedCollectorSong = {
        rvtr: item.rvtr,
        artist: item.artist,
        title: item.title,
        graphLinked: true,
        vdjFilePath: item.filePath,
        performanceHints: [],
        notes: ["Studio production pass-through"],
      };
      await runCollectorForSong(resolved);
      stages.collector = "complete";
      log.mark("collector_complete", { runtimeMs: Date.now() - tCol });
      await syncPipelineTransition("collector_complete", item);
    } else if (options.skipCollector !== false) {
      stages.collector = "skipped";
      await mark("collector_complete", "existing package");
    }

    const collector = await loadCollectorPackage(item.rvtr);
    if (!collector) throw new Error("Missing Collector package");

    // Editor
    await mark("editor_queued");
    await mark("editor_started");
    const tEd = Date.now();

    let story = await loadEditorStory(item.rvtr);
    if (!story || options.refreshEditor) {
      story = distillCollectorPackage(collector);
      const rewrite = await rewriteStoryFromAcceptedFacts(collector, story, { allowCloud: false });
      story = rewrite.story;
      story = attachEditorialReview(collector, story);
      story = attachNarrativeBlueprint(collector, story);
      await saveEditorStory(story);
    }
    await saveRetrograph(buildRetrographFromCollector(collector, story));

    const handoff = await ensureDirectorHandoff({ rvtr: item.rvtr, collector, story });
    story = handoff.story;
    warnings.push(...handoff.warnings);
    stages.editor = "complete";
    log.mark("editor_complete", { runtimeMs: Date.now() - tEd });
    await syncPipelineTransition("editor_complete", item);

    // Director — run when render spec missing or refresh requested
    if (!(await directorExists(item.rvtr)) || options.refreshDirector) {
      await mark("director_queued");
      await mark("director_started");
      const tDir = Date.now();
      const director = await runAndSaveDirector(item.rvtr);
      if (!director?.renderSpec) {
        throw new Error("Director failed — no render spec produced");
      }
      stages.director = "complete";
      log.mark("director_complete", { runtimeMs: Date.now() - tDir });
      await syncPipelineTransition("director_complete", item);
    } else {
      stages.director = "skipped";
      await mark("director_complete", "existing render spec");
    }

    if (!(await directorExists(item.rvtr))) {
      throw new Error("Publisher blocked — Director render spec missing");
    }

    // Publisher — Visual Producer then editorial evaluation
    await mark("publisher_queued");
    await mark("publisher_started");
    const tPub = Date.now();

    await runVisualProducer(item.rvtr);
    await evaluatePublisherPackage(item.rvtr);
    stages.publisher = "evaluated";

    const auto = await autoPublishStandard(item.rvtr);
    if (auto.action === "publish") {
      stages.publisher = "approved";
      log.mark("publisher_complete", { runtimeMs: Date.now() - tPub, detail: auto.reason });
      await syncPipelineTransition("publisher_complete", item, { detail: auto.reason });
      await mark("published", auto.reason);
      warnings.push(`publisher:${auto.reason}`);
    } else if (!auto.fatalCodes.includes("already_approved")) {
      warnings.push(`publisher:skipped:${auto.reason}`);
      log.mark("publisher_complete", { runtimeMs: Date.now() - tPub, detail: auto.reason });
      await syncPipelineTransition("publisher_complete", item, { detail: auto.reason });
    } else {
      await mark("published", "already approved");
    }

    if (auto.advisories.length) {
      warnings.push(...auto.advisories.slice(0, 3));
    }

    const record = await getPublisherRecord(item.rvtr);
    const published = isPublisherApproved(record);

    return {
      rvtr: item.rvtr,
      artist: item.artist,
      title: item.title,
      status: published ? "published" : "partial",
      error: published ? null : auto.action === "skip" ? auto.reason : "Not published",
      runtimeMs: Date.now() - t0,
      stages,
      warnings,
      auditLog: log.formatLine(),
      transitions: log.transitions,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "production_failed";
    const failedStage =
      stages.editor !== "complete" && stages.editor !== "skipped"
        ? "editor"
        : stages.director !== "complete" && stages.director !== "skipped"
          ? "director"
          : "publisher";
    await syncPipelineFailure(failedStage, item, message);
    return {
      rvtr: item.rvtr,
      artist: item.artist,
      title: item.title,
      status: "failed",
      error: message,
      runtimeMs: Date.now() - t0,
      stages,
      warnings,
      auditLog: log.formatLine(),
      transitions: log.transitions,
    };
  }
}
