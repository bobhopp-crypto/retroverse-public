import type { CollectorPackage } from "@/lib/ops/studio/collector/types";
import type { DirectorPackage } from "@/lib/ops/studio/director/types";
import type { EditorStoryPackage } from "@/lib/ops/studio/editor/types";
import type { PublisherRecord } from "@/lib/ops/studio/publisher/types";
import { isPublisherApproved } from "@/lib/ops/studio/publisher/store";

import type { ProductionTrackerOutput } from "./types";

function output(label: string, value: string, done: boolean): ProductionTrackerOutput {
  return { label, value, done };
}

export function buildCollectorOutputs(pkg: CollectorPackage | null): ProductionTrackerOutput[] {
  if (!pkg) {
    return [
      output("Sources gathered", "Not started", false),
      output("Covers found", "Not started", false),
      output("Charts found", "Not started", false),
      output("Metadata gathered", "Not started", false),
    ];
  }

  const sourceCount = pkg.sourceLog?.length ?? 0;
  const hasCover = Boolean(pkg.visualAssets?.coverUrl);
  const frameCount = pkg.visualAssets?.extraction?.extractedCount ?? 0;
  const hasCharts =
    pkg.charts?.peakHot100 != null ||
    Boolean(pkg.charts?.summary?.trim());
  const metadataFields = [pkg.artist, pkg.title, pkg.recording?.summary].filter(Boolean).length;

  return [
    output("Sources gathered", `${sourceCount.toLocaleString()} logged`, sourceCount > 0),
    output(
      "Covers found",
      hasCover ? "Album cover resolved" : frameCount > 0 ? `${frameCount} frames extracted` : "None yet",
      hasCover || frameCount > 0,
    ),
    output(
      "Charts found",
      pkg.charts?.peakHot100 != null
        ? `Hot 100 peak #${pkg.charts.peakHot100}`
        : hasCharts
          ? "Chart summary captured"
          : "None yet",
      hasCharts,
    ),
    output(
      "Metadata gathered",
      `${metadataFields} core fields`,
      metadataFields >= 2,
    ),
  ];
}

export function buildEditorOutputs(
  collector: CollectorPackage | null,
  story: EditorStoryPackage | null,
): ProductionTrackerOutput[] {
  if (!collector) {
    return [
      output("Duplicates removed", "Waiting on Collector", false),
      output("Facts normalized", "Waiting on Collector", false),
      output("Conflicts resolved", "Waiting on Collector", false),
    ];
  }

  if (!story) {
    return [
      output("Duplicates removed", "Not started", false),
      output("Facts normalized", "Not started", false),
      output("Conflicts resolved", "Not started", false),
    ];
  }

  const workspaceFacts = story.workspace?.candidateFacts ?? [];
  const rejected = workspaceFacts.filter((f) => f.status === "rejected").length;
  const accepted = workspaceFacts.filter((f) => f.status === "accepted").length;
  const onHold = workspaceFacts.filter((f) => f.status === "hold").length;
  const approvedFacts = story.approved?.facts?.length ?? 0;
  const submitted =
    story.meta.editorialStatus === "submitted" ||
    Boolean(story.meta.directorHandoff?.submittedAt);

  return [
    output(
      "Duplicates removed",
      rejected > 0 ? `${rejected} rejected` : "Review complete",
      rejected > 0 || approvedFacts > 0,
    ),
    output(
      "Facts normalized",
      `${approvedFacts} approved · ${accepted} promoted`,
      approvedFacts > 0,
    ),
    output(
      "Conflicts resolved",
      onHold > 0
        ? `${onHold} flagged for review`
        : submitted
          ? "Handed off to Director"
          : "In progress",
      submitted || onHold === 0,
    ),
  ];
}

export function buildDirectorOutputs(director: DirectorPackage | null): ProductionTrackerOutput[] {
  if (!director) {
    return [
      output("Story created", "Not started", false),
      output("Timeline created", "Not started", false),
      output("DNA created", "Not started", false),
      output("Record Label created", "Not started", false),
      output("Experience Blueprint", "Not started", false),
    ];
  }

  const scenes = director.experiencePlan?.scenes ?? [];
  const hasStory = scenes.some(
    (s) => s.sceneType === "story" || s.recommendedTemplate?.templateId === "story",
  );
  const hasTimeline = scenes.some(
    (s) =>
      s.sceneType === "timeline" ||
      s.sceneType === "chart" ||
      s.recommendedTemplate?.templateId === "timeline",
  );
  const hasDna = scenes.some(
    (s) =>
      s.recommendedTemplate?.templateId === "gallery" ||
      s.headline.toLowerCase().includes("dna") ||
      s.narrativePurpose.toLowerCase().includes("dna"),
  );
  const logoAssets = director.renderSpec?.assetManifest?.logos?.length ?? 0;
  const hasLabel = logoAssets > 0;

  return [
    output("Story created", hasStory ? `${scenes.length} scenes planned` : "Pending", hasStory),
    output("Timeline created", hasTimeline ? "Timeline beats mapped" : "Pending", hasTimeline),
    output("DNA created", hasDna ? "Song DNA slot ready" : "Pending", hasDna),
    output(
      "Record Label created",
      hasLabel ? "Label assets linked" : "Pending",
      hasLabel,
    ),
    output(
      "Experience Blueprint",
      director.renderSpec ? "Render spec ready" : "Plan only",
      Boolean(director.renderSpec),
    ),
  ];
}

export function buildPublisherOutputs(
  director: DirectorPackage | null,
  record: PublisherRecord | null,
): ProductionTrackerOutput[] {
  if (!director?.renderSpec) {
    return [
      output("Package published", "Waiting on Director", false),
      output("Search updated", "Waiting on Director", false),
      output("Assets generated", "Waiting on Director", false),
    ];
  }

  const approved = isPublisherApproved(record);
  const sceneCount = director.renderSpec.sceneTimeline.length;
  const assetCount =
    (director.renderSpec.assetManifest?.hero?.length ?? 0) +
    (director.renderSpec.assetManifest?.supportingImages?.length ?? 0) +
    (director.renderSpec.assetManifest?.galleryImages?.length ?? 0);

  return [
    output(
      "Package published",
      approved ? "Live for patrons" : record?.evaluation ? "Awaiting approval" : "Not evaluated",
      approved,
    ),
    output(
      "Search updated",
      approved ? "Indexes refreshed" : "After publish",
      approved,
    ),
    output(
      "Assets generated",
      `${sceneCount} scenes · ${assetCount} assets`,
      sceneCount > 0,
    ),
  ];
}
