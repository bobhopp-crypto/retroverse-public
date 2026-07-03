import "server-only";

import { loadCollectorPackagePageContext } from "@/lib/ops/studio/collector/load-library";
import { collectorOutputPath } from "@/lib/ops/studio/collector/paths";
import { loadEditorPackagePageContext } from "@/lib/ops/studio/editor/load-library";
import { editorOutputPath } from "@/lib/ops/studio/editor/paths";
import { loadDirectorWorkspaceSnapshot } from "@/lib/ops/studio/director/workspace/load-director-workspace";
import {
  directorOutputPath,
  directorRenderSpecPath,
} from "@/lib/ops/studio/director/paths";
import { ensurePublisherEvaluation } from "@/lib/ops/studio/publisher/list-packages";
import { publisherStorePath } from "@/lib/ops/studio/publisher/paths";
import { loadPublicExperience } from "@/lib/retroverse/renderer/load-public-experience";
import { normalizeRvtr } from "@/lib/studio/status";

export type PipelineStage = "collector" | "editor" | "director" | "publisher";

export type PipelineStageResult = {
  stage: PipelineStage;
  rvtr: string;
  wired: boolean;
  sourcePaths: string[];
  studioRoute: string;
  songLabel: { artist: string; title: string } | null;
  data: unknown;
  note?: string;
};

const STUDIO_ROUTES: Record<PipelineStage, string> = {
  collector: "/ops/studio/collector",
  editor: "/ops/studio/editor",
  director: "/ops/studio/director/workspace",
  publisher: "/ops/studio/publisher",
};

export function parsePipelineStage(value: string | undefined): PipelineStage {
  if (value === "editor" || value === "director" || value === "publisher") return value;
  return "collector";
}

function songLabelFromParts(
  artist: string | null | undefined,
  title: string | null | undefined,
): { artist: string; title: string } | null {
  const a = artist?.trim();
  const t = title?.trim();
  if (!a && !t) return null;
  return { artist: a ?? "Unknown artist", title: t ?? "Unknown title" };
}

export async function loadPipelineStageOutput(
  rvtrInput: string,
  stage: PipelineStage,
): Promise<PipelineStageResult> {
  const rvtr = normalizeRvtr(rvtrInput) ?? rvtrInput.trim().toUpperCase();
  const studioRoute = `${STUDIO_ROUTES[stage]}/${rvtr}`;

  if (stage === "collector") {
    const context = await loadCollectorPackagePageContext(rvtr);
    return {
      stage,
      rvtr: context.rvtr,
      wired: true,
      sourcePaths: [collectorOutputPath(context.rvtr)],
      studioRoute,
      songLabel: context.package
        ? songLabelFromParts(context.package.artist, context.package.title)
        : null,
      data: context,
    };
  }

  if (stage === "editor") {
    const context = await loadEditorPackagePageContext(rvtr);
    return {
      stage,
      rvtr: context.rvtr,
      wired: true,
      sourcePaths: [editorOutputPath(context.rvtr)],
      studioRoute,
      songLabel: context.collector
        ? songLabelFromParts(context.collector.artist, context.collector.title)
        : null,
      data: context,
    };
  }

  if (stage === "director") {
    const snapshot = await loadDirectorWorkspaceSnapshot(rvtr);
    return {
      stage,
      rvtr,
      wired: true,
      sourcePaths: [directorRenderSpecPath(rvtr), directorOutputPath(rvtr)],
      studioRoute,
      songLabel: snapshot
        ? songLabelFromParts(snapshot.artist, snapshot.title)
        : null,
      data: snapshot,
    };
  }

  const [preview, publisherRecord] = await Promise.all([
    loadPublicExperience(rvtr, { bypassPublisherGate: true }),
    ensurePublisherEvaluation(rvtr),
  ]);

  return {
    stage,
    rvtr,
    wired: true,
    sourcePaths: [directorRenderSpecPath(rvtr), publisherStorePath()],
    studioRoute,
    songLabel: preview?.experience
      ? songLabelFromParts(
          preview.experience.spec.metadata.artist,
          preview.experience.spec.metadata.title,
        )
      : preview?.songDna
        ? songLabelFromParts(preview.songDna.artist, preview.songDna.title)
        : null,
    data: {
      publicExperience: preview,
      publisherRecord,
    },
    note: "Publisher tab uses loadPublicExperience (homepage/package) plus ensurePublisherEvaluation.",
  };
}
