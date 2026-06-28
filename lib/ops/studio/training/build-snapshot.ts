import "server-only";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { loadDirectorPackage } from "@/lib/ops/studio/director/store";
import { getPublisherRecord } from "@/lib/ops/studio/publisher/store";
import { loadPublicExperience } from "@/lib/retroverse/renderer/load-public-experience";
import { editorialStatusToConfidence } from "@/lib/ops/studio/editor/types";
import { loadEditorStory } from "@/lib/ops/studio/editor/store";
import { normalizeRvtr } from "@/lib/studio/status";

import { getLatestReview } from "./store";
import { ensureRowIds, identifyStrings } from "@/lib/ops/studio/model-identity";
import type {
  TrainingDecision,
  TrainingDepartmentId,
  TrainingDepartmentSnapshot,
  TrainingIoSection,
  TrainingSongSnapshot,
} from "./types";

function io(scope: string, summary: string, items: string[]): TrainingIoSection {
  return { summary, items: identifyStrings(scope, items.filter(Boolean).slice(0, 12)) };
}

function trainingDecisions(scope: string, rows: Array<{ label: string; reason: string }>): TrainingDecision[] {
  return ensureRowIds(scope, rows, (row) => row.label);
}

function confidencePct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function buildCollectorSnapshot(rvtr: string): Promise<TrainingDepartmentSnapshot> {
  const collector = await loadCollectorPackage(rvtr);
  const review = await getLatestReview(rvtr, "collector");

  if (!collector) {
    return {
      department: "collector",
      status: "not_run",
      confidence: 0,
      confidenceLabel: "Missing",
      explanation: "Collector has not run for this song.",
      input: io("collector-input", "VDJ library row + graph identity", []),
      output: io("collector-output", "No collector.json", []),
      decisions: [],
      review,
    };
  }

  const factCount = collector.candidateFacts.filter((f) => f.approvalStatus === "approved").length;
  const frameCount =
    collector.performances?.[0]?.visualAssets.extraction.extractedCount ??
    collector.visualAssets.extraction.extractedCount ??
    0;
  const confidence = confidencePct(collector.researchQuality ?? 0);

  return {
    department: "collector",
    status: "ready",
    confidence,
    confidenceLabel: confidence >= 85 ? "High" : confidence >= 65 ? "Medium" : "Low",
    explanation: `Collected ${factCount} verified facts, ${frameCount} performance frames, and chart summary (${collector.charts.summary || "none"}).`,
    input: io("collector-input", "VirtualDJ media + graph identity", [
      collector.virtualDj.primaryPath ? "Primary VDJ media path" : "No primary VDJ path",
      `${collector.videoPerformance.items.filter((i) => i.isVideo).length} video item(s)`,
      collector.graphLinked ? "Graph linked" : "Graph not linked",
    ]),
    output: io("collector-output", "collector.json research package", [
      `${factCount} approved candidate facts`,
      `${collector.recording.notes.length} recording notes`,
      `${collector.culturalContext.notes.length} cultural notes`,
      collector.charts.peakHot100 != null
        ? `Hot 100 peak #${collector.charts.peakHot100} · ${collector.charts.chartWeeks ?? "?"} weeks`
        : "No Hot 100 peak",
      `${frameCount} extracted visual frames`,
      collector.visualAssets.coverUrl ? "Album cover resolved" : "No cover URL",
    ]),
    decisions: trainingDecisions("collector", [
      {
        label: "Performance selection",
        reason:
          collector.performances?.[0]?.title ??
          collector.videoPerformance.preferredPerformance ??
          "Default first owned performance video",
      },
      {
        label: "Research quality score",
        reason: `${confidence}% based on stage completion and asset coverage`,
      },
    ]),
    review,
  };
}

async function buildEditorSnapshot(rvtr: string): Promise<TrainingDepartmentSnapshot> {
  const collector = await loadCollectorPackage(rvtr);
  const story = await loadEditorStory(rvtr);
  const review = await getLatestReview(rvtr, "editor");

  if (!collector) {
    return {
      department: "editor",
      status: "missing_input",
      confidence: 0,
      confidenceLabel: "Blocked",
      explanation: "Editor waiting on Collector package.",
      input: io("editor-input", "Collector handoff", []),
      output: io("editor-output", "No editor.json", []),
      decisions: [],
      review,
    };
  }

  if (!story) {
    return {
      department: "editor",
      status: "not_run",
      confidence: 0,
      confidenceLabel: "Not started",
      explanation: "Editor has not distilled a story package yet.",
      input: io("editor-input", "Collector handoff", [`${collector.candidateFacts.length} candidate facts`]),
      output: io("editor-output", "No editor.json", []),
      decisions: [],
      review,
    };
  }

  const bp = story.narrativeBlueprint;
  const confLabel = editorialStatusToConfidence(story.meta.editorialStatus);
  const confidence =
    confLabel === "ready" ? 92 : confLabel === "review" ? 78 : confLabel === "draft" ? 58 : 40;

  const themeLabel = bp?.primaryTheme?.replace(/_/g, " ") ?? story.story.headline;
  const angleReason = bp
    ? `Selected ${themeLabel} story because blueprint confidence exceeded alternate beats.`
    : "Story distilled from Collector facts without a full blueprint.";

  return {
    department: "editor",
    status: "ready",
    confidence,
    confidenceLabel: confLabel === "ready" ? "Ready" : confLabel === "review" ? "Review" : "Draft",
    explanation: angleReason,
    input: io("editor-input", "Collector research + candidate facts", [
      `${collector.candidateFacts.length} candidate facts`,
      `${story.workspace.candidateFacts.length} facts in workspace`,
      `${story.workspace.evidence.timeline.length} timeline events`,
    ]),
    output: io("editor-output", "editor.json story package", [
      `Headline: ${story.story.headline}`,
      `${story.approved.facts.length} approved facts`,
      `${story.approved.cards.length} approved cards`,
      `${story.approved.images.length} approved images`,
      bp ? `Blueprint: ${bp.opening} → ${bp.closing}` : "No narrative blueprint",
      `Status: ${story.meta.editorialStatus}`,
    ]),
    decisions: trainingDecisions("editor", [
      {
        label: "Story angle",
        reason: story.story.hook || story.story.summary.slice(0, 120),
      },
      {
        label: "Approved assets",
        reason: `${story.approved.facts.length} facts · ${story.approved.cards.length} cards · ${story.approved.images.length} images`,
      },
      {
        label: "Interesting facts retained",
        reason: `${story.workspace.candidateFacts.filter((f) => f.status === "accepted").length} promoted from workspace`,
      },
    ]),
    review,
  };
}

async function buildDirectorSnapshot(rvtr: string): Promise<TrainingDepartmentSnapshot> {
  const director = await loadDirectorPackage(rvtr);
  const review = await getLatestReview(rvtr, "director");

  if (!director) {
    return {
      department: "director",
      status: "not_run",
      confidence: 0,
      confidenceLabel: "Not run",
      explanation: "Director has not produced an experience plan.",
      input: io("director-input", "Editor handoff / director-handoff.json", []),
      output: io("director-output", "No director.json", []),
      decisions: [],
      review,
    };
  }

  const plan = director.experiencePlan;
  const renderConf = Math.round((director.review.estimatedRenderingConfidence ?? 0.75) * 100);
  const runtimeSec = plan.scenes.reduce((s, x) => s + x.estimatedDurationSec, 0);

  return {
    department: "director",
    status: "ready",
    confidence: renderConf,
    confidenceLabel: director.review.renderReadinessLabel ?? "Planned",
    explanation: `Created ${plan.scenes.length}-scene experience (${plan.presentationStyle.replace(/_/g, " ")}) because package confidence was ${renderConf}% and ${director.renderSpec ? "render spec" : "plan"} is available.`,
    input: io("director-input", "Editor narrative blueprint + approved assets", [
      `Handoff v${director.handoffVersion}`,
      `${plan.scenes.length} planned beats`,
      `Presentation: ${plan.presentationStyle}`,
    ]),
    output: io("director-output", "director.json + render spec", [
      `${plan.scenes.length} scenes · ~${runtimeSec}s runtime`,
      director.renderSpec ? "director-render-spec.json present" : "Render spec missing",
      director.review.renderReadinessLabel ?? "Render readiness unknown",
    ]),
    decisions: trainingDecisions(
      "director",
      plan.scenes.slice(0, 5).map((scene) => ({
        label: `Scene ${scene.sceneNumber}: ${scene.recommendedTemplate?.displayName ?? scene.sceneType}`,
        reason: scene.recommendedTemplate?.reason ?? scene.narrativePurpose ?? scene.headline,
      })),
    ),
    review,
  };
}

async function buildPublisherSnapshot(rvtr: string): Promise<TrainingDepartmentSnapshot> {
  const director = await loadDirectorPackage(rvtr);
  const review = await getLatestReview(rvtr, "publisher");
  const publisherRecord = await getPublisherRecord(rvtr);

  if (!director?.renderSpec) {
    return {
      department: "publisher",
      status: "missing_input",
      confidence: 0,
      confidenceLabel: "Blocked",
      explanation: "Publisher waiting on Director render specification.",
      input: io("publisher-input", "Director render spec", []),
      output: io("publisher-output", "Not publish-ready", []),
      decisions: [],
      review,
    };
  }

  const evaluation = publisherRecord?.evaluation;
  const approved = publisherRecord?.approvedClass;
  const publicationClass = approved ?? evaluation?.publicationClass ?? "blocked";
  const qualityScore = evaluation?.qualityScore ?? 0;

  const status: "ready" | "missing_input" | "not_run" =
    publicationClass === "blocked" || publicationClass === "needs_coaching"
      ? "missing_input"
      : "ready";

  return {
    department: "publisher",
    status,
    confidence: qualityScore,
    confidenceLabel: approved
      ? `Published (${approved})`
      : publicationClass.replace("_", " "),
    explanation: approved
      ? `Approved for patrons — ${approved} class.`
      : evaluation?.why ?? "Awaiting editorial evaluation.",
    input: io("publisher-input", "Director render spec + editorial evaluation", [
      `${director.renderSpec.sceneTimeline.length} timeline scenes`,
      evaluation ? `Quality score ${qualityScore}%` : "Not evaluated yet",
      `${evaluation?.coachingIssues.length ?? 0} coaching flag(s)`,
    ]),
    output: io("publisher-output", "Publication status", [
      approved ? `Live at /experience/${rvtr}` : "Not yet approved for patrons",
      `Class: ${publicationClass}`,
      evaluation?.blockingIssues.length
        ? `${evaluation.blockingIssues.length} blocking issue(s)`
        : "No blocking issues",
      `Review in Publisher → /ops/studio/publisher/${rvtr}`,
    ]),
    decisions: trainingDecisions(
      "publisher",
      (evaluation?.dimensions ?? []).slice(0, 4).map((dim) => ({
        label: dim.label,
        reason: `${dim.score}% — ${dim.notes[0]?.text ?? ""}`,
      })),
    ),
    review,
  };
}

async function buildRendererSnapshot(rvtr: string): Promise<TrainingDepartmentSnapshot> {
  const payload = await loadPublicExperience(rvtr, { bypassPublisherGate: true });
  const review = await getLatestReview(rvtr, "renderer");

  if (!payload) {
    return {
      department: "renderer",
      status: "not_run",
      confidence: 0,
      confidenceLabel: "Not ready",
      explanation: "Renderer has no public experience to display.",
      input: io("renderer-input", "Render spec or museum pilot", []),
      output: io("renderer-output", "Experience not loadable", []),
      decisions: [],
      review,
    };
  }

  const scenes = payload.scenes;
  const museum = payload.pipeline.usedMuseum;
  const confidence = museum ? 97 : Math.round((payload.experience.spec.estimatedRenderingConfidence ?? 0.85) * 100);

  return {
    department: "renderer",
    status: "ready",
    confidence,
    confidenceLabel: museum ? "Museum pilot" : "Composed",
    explanation: museum
      ? `Rendering ${scenes.length} museum rooms — patron swipe experience.`
      : `Rendering ${scenes.length} composed scenes with ${payload.pipeline.usedComposition ? "scene composer" : "director fallback"}.`,
    input: io("renderer-input", "Presentation spec + assets", [
      museum ? "Museum pilot composition" : "Director render spec",
      payload.songDna ? "Song DNA loaded" : "No Song DNA",
      `${payload.pipeline.composedSceneCount} presentation scenes`,
    ]),
    output: io("renderer-output", "Patron-facing experience", [
      `${scenes.length} swipeable moments`,
      `~${payload.experience.totalDurationSec}s runtime`,
      `/experience/${rvtr}`,
    ]),
    decisions: trainingDecisions(
      "renderer",
      scenes.slice(0, 5).map((scene, i) => ({
        label: `Moment ${i + 1}: ${scene.momentLabel}`,
        reason: scene.composeReason || scene.momentType,
      })),
    ),
    review,
  };
}

const BUILDERS: Record<
  TrainingDepartmentId,
  (rvtr: string) => Promise<TrainingDepartmentSnapshot>
> = {
  collector: buildCollectorSnapshot,
  editor: buildEditorSnapshot,
  director: buildDirectorSnapshot,
  publisher: buildPublisherSnapshot,
  renderer: buildRendererSnapshot,
};

export async function buildTrainingSongSnapshot(rvtr: string): Promise<TrainingSongSnapshot | null> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) return null;

  const collector = await loadCollectorPackage(normalized);
  const departments: TrainingDepartmentSnapshot[] = [];
  for (const id of Object.keys(BUILDERS) as TrainingDepartmentId[]) {
    departments.push(await BUILDERS[id](normalized));
  }

  return {
    rvtr: normalized,
    artist: collector?.artist ?? departments[0]?.output.items[0]?.text ?? "Unknown",
    title: collector?.title ?? normalized,
    generatedAt: new Date().toISOString(),
    departments,
  };
}

export function departmentHref(rvtr: string, department: TrainingDepartmentId): string {
  return `/ops/studio/training/${rvtr}/${department}`;
}
