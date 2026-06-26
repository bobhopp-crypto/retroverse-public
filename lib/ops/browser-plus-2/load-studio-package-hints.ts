import "server-only";

import { readdir, readFile, stat } from "node:fs/promises";

import { collectorOutputPath, researchDepartmentRoot } from "@/lib/ops/studio/collector/paths";
import { editorOutputPath } from "@/lib/ops/studio/editor/paths";
import {
  directorHandoffPath,
  directorOutputPath,
  directorRenderSpecPath,
} from "@/lib/ops/studio/director/paths";

import {
  buildStudioMissingItems,
  defaultStudioMissingItems,
  defaultStudioNeedFlags,
  deriveStudioNeedFlags,
  deriveStudioStage,
  isStudioRenderReady,
  storyStatusFromEditorial,
  studioConfidenceLabel,
  studioStageLabel,
} from "./studio-status-adapter";
import type { Bp2StudioHint } from "./types";

const RVTR_DIR = /^RVTR\d+$/i;

type CollectorLite = {
  rvtr?: string;
  artist?: string;
  title?: string;
  researchQuality?: number;
  completedAt?: string;
  version?: string;
  performances?: unknown[];
};

type EditorLite = {
  meta?: {
    rvtr?: string;
    updatedAt?: string;
    editorialStatus?: string;
    directorHandoff?: { status?: string; submittedAt?: string | null };
  };
  approved?: { images?: unknown[] };
  workspace?: {
    editorialReview?: { patronValue?: number; storyQuality?: string };
  };
  version?: string;
};

type DirectorLite = {
  version?: string;
  generatedAt?: string;
  review?: {
    renderReadiness?: string;
    renderReadinessLabel?: string;
    estimatedRenderingConfidence?: number;
    recommendedPerformance?: string;
    missingAssets?: string[];
  };
  renderSpec?: {
    renderReadiness?: string;
    estimatedRenderingConfidence?: number;
    metadata?: { patronValue?: number; storyQuality?: string };
  };
};

async function readJsonLite<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function fileMtime(path: string): Promise<string | null> {
  try {
    const s = await stat(path);
    return s.mtime.toISOString();
  } catch {
    return null;
  }
}

async function loadHintForRvtr(rvtr: string): Promise<Bp2StudioHint> {
  const normalized = rvtr.trim().toUpperCase();
  const collectorPath = collectorOutputPath(normalized);
  const editorPath = editorOutputPath(normalized);
  const directorPath = directorOutputPath(normalized);
  const handoffPath = directorHandoffPath(normalized);
  const renderSpecPath = directorRenderSpecPath(normalized);

  const [collector, editor, director, renderSpecRaw] = await Promise.all([
    readJsonLite<CollectorLite>(collectorPath),
    readJsonLite<EditorLite>(editorPath),
    readJsonLite<DirectorLite>(directorPath),
    readJsonLite<{ renderReadiness?: string; estimatedRenderingConfidence?: number }>(renderSpecPath),
  ]);

  const hasCollector = Boolean(collector);
  const hasEditor = Boolean(editor);
  const hasDirector = Boolean(director);
  const renderReady = isStudioRenderReady(renderSpecRaw?.renderReadiness);

  const stage = deriveStudioStage({ hasCollector, hasEditor, hasDirector, renderReady });
  const patronValue =
    editor?.workspace?.editorialReview?.patronValue ??
    director?.renderSpec?.metadata?.patronValue ??
    null;
  const storyQuality =
    editor?.workspace?.editorialReview?.storyQuality ??
    director?.renderSpec?.metadata?.storyQuality ??
    null;
  const researchQuality = collector?.researchQuality ?? null;
  const confidenceScore = patronValue ?? researchQuality;
  const performanceCountVal = collector?.performances?.length ?? (hasCollector ? 1 : 0);
  const approvedAssetCount = editor?.approved?.images?.length ?? 0;

  const mtimes = await Promise.all([
    fileMtime(collectorPath),
    fileMtime(editorPath),
    fileMtime(directorPath),
    fileMtime(handoffPath),
    fileMtime(renderSpecPath),
  ]);
  const lastUpdated = mtimes.filter(Boolean).sort().reverse()[0] ?? null;

  const needFlags = deriveStudioNeedFlags({
    hasCollector,
    hasEditor,
    hasDirector,
    renderReady,
    directorHandoffStatus: editor?.meta?.directorHandoff?.status,
  });

  return {
    rvtr: normalized,
    stage,
    statusLabel: studioStageLabel(stage),
    patronValue,
    storyQuality,
    confidenceLabel: studioConfidenceLabel(confidenceScore),
    storyStatus: storyStatusFromEditorial({
      hasEditor,
      editorialStatus: editor?.meta?.editorialStatus,
      storyQuality,
      patronValue,
    }),
    performanceCount: performanceCountVal,
    approvedAssetCount,
    lastUpdated,
    packageVersions: {
      collector: collector?.version ?? (hasCollector ? "—" : null),
      editor: editor?.version ?? (hasEditor ? "—" : null),
      director: director?.version ?? (hasDirector ? "—" : null),
    },
    renderReadiness:
      director?.renderSpec?.renderReadiness ??
      renderSpecRaw?.renderReadiness ??
      director?.review?.renderReadinessLabel ??
      null,
    renderingConfidence:
      director?.renderSpec?.estimatedRenderingConfidence ??
      renderSpecRaw?.estimatedRenderingConfidence ??
      director?.review?.estimatedRenderingConfidence ??
      null,
    missingItems: buildStudioMissingItems({
      hasCollector,
      researchQuality,
      hasEditor,
      directorHandoffStatus: editor?.meta?.directorHandoff?.status,
      hasDirector,
      directorMissingAssets: director?.review?.missingAssets ?? [],
    }),
    recommendedPerformance: director?.review?.recommendedPerformance ?? null,
    ...needFlags,
  };
}

export async function loadBp2StudioHints(): Promise<Map<string, Bp2StudioHint>> {
  const map = new Map<string, Bp2StudioHint>();
  const root = researchDepartmentRoot();

  let dirs: string[] = [];
  try {
    const entries = await readdir(root, { withFileTypes: true });
    dirs = entries.filter((e) => e.isDirectory() && RVTR_DIR.test(e.name)).map((e) => e.name.toUpperCase());
  } catch {
    return map;
  }

  await Promise.all(
    dirs.map(async (rvtr) => {
      try {
        const hint = await loadHintForRvtr(rvtr);
        map.set(rvtr, hint);
      } catch {
        /* skip */
      }
    }),
  );

  return map;
}

export function emptyStudioHint(rvtr: string | null): Bp2StudioHint {
  const hasRvtr = Boolean(rvtr?.trim());
  return {
    rvtr: rvtr?.trim().toUpperCase() ?? "",
    stage: "not_started",
    statusLabel: studioStageLabel("not_started"),
    patronValue: null,
    storyQuality: null,
    confidenceLabel: studioConfidenceLabel(null),
    storyStatus: "None",
    performanceCount: 0,
    approvedAssetCount: 0,
    lastUpdated: null,
    packageVersions: { collector: null, editor: null, director: null },
    renderReadiness: null,
    renderingConfidence: null,
    missingItems: defaultStudioMissingItems(hasRvtr),
    recommendedPerformance: null,
    ...defaultStudioNeedFlags(),
  };
}
