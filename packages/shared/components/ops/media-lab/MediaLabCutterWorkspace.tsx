"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  calculateWorkingDurationSec,
  deriveRemainingRanges,
  identifyRangeContainingSourceTime,
  nextRemainingPlaybackRange,
  sampleWorkingTimelineSourceTimes,
  sourceTimeToWorkingPointerPosition,
  sourceTimeToWorkingTime,
  transcriptSegmentId,
  workingPointerPositionToSourceTime,
  type CutterClip,
  type CutterEditHistoryEntry,
  type CutterManifest,
  type CutterTranscriptSegment,
  type SourceRange,
} from "@/lib/ops/media-lab/cutter-edit-model";
import {
  SCRUB_SEEK_INTERVAL_MS,
  beginPlayback,
  beginScrub,
  boundaryToleranceSec,
  completeClipPreview,
  decidePlaybackBoundary,
  finishScrub,
  mediaSeekMethod,
  nativeSeekTransition,
  pausePlayback,
  shouldIssueScrubSeek,
  type ActivePlaybackMode,
  type CutterPlaybackMode,
  type CutterScrubState,
  type PlaybackControllerState,
} from "@/lib/ops/media-lab/cutter-playback";
import {
  detailWindowRange,
  DETAIL_WINDOWS,
  type DetailWindowSeconds,
} from "@/lib/ops/media-lab/manual-clip-cutter";
import type {
  CutterActiveJob,
  CutterJobOption,
  CutterWorkspacePreference,
} from "@/lib/ops/media-lab/cutter-workspace-store";
import {
  formatDuration,
  formatPreciseTime,
  generateRulerTicks,
  isLongClip,
} from "@/lib/ops/media-lab/cutter-timing";
import { formatOperatorDuration, formatOperatorTime, formatTrimPrecision } from "@/lib/ops/media-lab/operator-time";
import { edgeFocusViewport, fitTimeline, panViewport, type TimelineViewport } from "@/lib/ops/media-lab/single-timeline-viewport";

type ThumbnailFrame = { sec: number; url: string };
type TranscriptionStatus = "unavailable" | "not_transcribed" | "transcribed";
type ThumbnailStatus = "idle" | "loading" | "ready" | "partial" | "unavailable";
type SaveStatus = "saved" | "unsaved" | "saving" | "error";
type ProxyState =
  | "missing"
  | "preparing"
  | "ready"
  | "failed"
  | "stale"
  | "cancelled";
type ActiveMedia = "editing_proxy" | "original_fallback";
type ScrubPhase = "start" | "move" | "end" | "cancel";
const WORKING_DRAG_THRESHOLD_PX = 5;

type WorkspaceState = {
  activeJob: CutterActiveJob | null;
  sourceFilename: string;
  sourceFingerprint: string;
  sourceDurationSec: number;
  originalVideoUrl: string;
  proxyVideoUrl: string;
  sourceVideoUrl: string;
  activeMedia: ActiveMedia;
  proxyState: ProxyState;
  proxyProgressPct: number;
  proxyElapsedSec: number;
  proxyMessage: string;
  proxyMediaError: boolean;
  sourcePlayheadSec: number;
  detailRangeStartSec: number;
  detailRangeEndSec: number;
  detailWindowDurationSec: DetailWindowSeconds;
  rangeInSec: number | null;
  rangeOutSec: number | null;
  activeSelectionEdge: "start" | "end" | null;
  extractedClips: CutterClip[];
  remainingRanges: SourceRange[];
  workingDurationSec: number;
  selectedClipId: string | null;
  playbackMode: CutterPlaybackMode;
  transcriptSegments: CutterTranscriptSegment[];
  transcriptionStatus: TranscriptionStatus;
  thumbnailStatus: ThumbnailStatus;
  editHistory: CutterEditHistoryEntry[];
  saveStatus: SaveStatus;
  statusMessage: string;
  errorMessage: string;
  sourceChanged: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  sourceChooserOpen: boolean;
  jobs: CutterJobOption[];
  chooserJobKey: string;
  chooserYear: number;
  pendingFile: File | null;
  overviewFrames: ThumbnailFrame[];
  detailFrames: ThumbnailFrame[];
};

type WorkspaceBootstrapResponse = {
  ok?: boolean;
  error?: string;
  preference?: CutterWorkspacePreference;
  jobs?: CutterJobOption[];
  resumedFromPreference?: boolean;
};

type EditorialResponse = {
  ok?: boolean;
  error?: string;
  videoUrl?: string | null;
  job?: {
    sourceFilename?: string;
    sourceFingerprint?: string;
    durationSeconds?: number | null;
  };
  segments?: CutterTranscriptSegment[];
};

type CutterEditResponse = {
  ok?: boolean;
  error?: string;
  operation?: "extract" | "return" | "undo" | "update_clip";
  manifest?: CutterManifest;
  affectedClip?: CutterClip;
  sourcePlayheadSec?: number;
  workingTimeSec?: number;
  activeInSec?: number | null;
  sourceChanged?: boolean;
  sourceFingerprint?: string;
  migration?: { migratedCount?: number; skippedLegacyCount?: number };
};

type ProxyStatusResponse = {
  ok?: boolean;
  error?: string;
  proxyState?: ProxyState;
  videoUrl?: string | null;
  generation?: {
    state?: "preparing" | "ready" | "failed" | "cancelled";
    phase?: string;
    progressPct?: number;
    elapsedSec?: number;
    speed?: number | null;
    error?: string | null;
  } | null;
  readiness?: { state?: string; reason?: string };
};

const EMPTY_STATE: WorkspaceState = {
  activeJob: null,
  sourceFilename: "",
  sourceFingerprint: "",
  sourceDurationSec: 0,
  originalVideoUrl: "",
  proxyVideoUrl: "",
  sourceVideoUrl: "",
  activeMedia: "original_fallback",
  proxyState: "missing",
  proxyProgressPct: 0,
  proxyElapsedSec: 0,
  proxyMessage: "No editing proxy has been prepared",
  proxyMediaError: false,
  sourcePlayheadSec: 0,
  detailRangeStartSec: 0,
  detailRangeEndSec: 60,
  detailWindowDurationSec: 60,
  rangeInSec: null,
  rangeOutSec: null,
  activeSelectionEdge: null,
  extractedClips: [],
  remainingRanges: [],
  workingDurationSec: 0,
  selectedClipId: null,
  playbackMode: "paused",
  transcriptSegments: [],
  transcriptionStatus: "unavailable",
  thumbnailStatus: "idle",
  editHistory: [],
  saveStatus: "saved",
  statusMessage: "Restoring the last Cutter workspace…",
  errorMessage: "",
  sourceChanged: false,
  isLoading: true,
  isPlaying: false,
  sourceChooserOpen: false,
  jobs: [],
  chooserJobKey: "",
  chooserYear: 1969,
  pendingFile: null,
  overviewFrames: [],
  detailFrames: [],
};

function jobKey(job: CutterActiveJob): string {
  return `${job.year}:${job.jobSlug}`;
}

function parseJobKey(value: string): CutterActiveJob | null {
  const separator = value.indexOf(":");
  const year = Number(value.slice(0, separator));
  const jobSlug = value.slice(separator + 1);
  return Number.isInteger(year) && /^[a-z0-9-]+$/i.test(jobSlug)
    ? { year, jobSlug }
    : null;
}

function clampSourceTime(sourceTimeSec: number, sourceDurationSec: number): number {
  if (!Number.isFinite(sourceTimeSec) || sourceDurationSec <= 0) return 0;
  return Math.max(0, Math.min(sourceDurationSec, sourceTimeSec));
}

const formatSourceTime = formatPreciseTime;

const formatCompactDuration = formatDuration;

function detailRange(
  sourceTimeSec: number,
  sourceDurationSec: number,
  windowDurationSec: DetailWindowSeconds,
): SourceRange {
  const range = detailWindowRange(
    sourceTimeSec,
    sourceDurationSec,
    windowDurationSec,
  );
  return { sourceStartSec: range.start, sourceEndSec: range.end };
}

function manifestState(manifest: CutterManifest) {
  const remainingRanges = deriveRemainingRanges(
    manifest.sourceDurationSec,
    manifest.extractedClips,
  );
  return {
    extractedClips: manifest.extractedClips,
    remainingRanges,
    workingDurationSec: calculateWorkingDurationSec(remainingRanges),
    editHistory: manifest.editHistory,
  };
}

function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  );
}

async function responseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

export function MediaLabCutterWorkspace() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(EMPTY_STATE);
  const workspaceRef = useRef(workspace);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackGuardRef = useRef<number | null>(null);
  const playbackControllerRef = useRef<PlaybackControllerState>({
    mode: "paused",
    resumeMode: "working",
    previewClipId: null,
    handledBoundaryKey: null,
    seekInProgress: false,
  });
  const selectionPreviewRef = useRef<SourceRange | null>(null);
  const scrubStateRef = useRef<CutterScrubState>("idle");
  const programmaticSeekRef = useRef(false);
  const scrubSequenceRef = useRef(0);
  const scrubSeekRef = useRef<{
    lastSeekAtMs: number | null;
    pendingSourceTimeSec: number | null;
    timeoutId: number | null;
    animationFrameId: number | null;
    mediaSeekCount: number;
    interactionId: number;
  }>({
    lastSeekAtMs: null,
    pendingSourceTimeSec: null,
    timeoutId: null,
    animationFrameId: null,
    mediaSeekCount: 0,
    interactionId: 0,
  });
  const actionsRef = useRef<{
    setIn: () => void;
    setOut: () => void;
    extract: () => void;
    previewSelection: () => void;
    togglePlayback: () => void;
    nudgePlayhead: (delta: number) => void;
    clearSelection: () => void;
    undo: () => void;
  }>({
    setIn: () => undefined,
    extract: () => undefined,
    togglePlayback: () => undefined,
    nudgePlayhead: () => undefined,
    clearSelection: () => undefined,
    setOut: () => undefined,
    previewSelection: () => undefined,
    undo: () => undefined,
  });

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  const commitPlaybackController = useCallback(
    (next: PlaybackControllerState) => {
      playbackControllerRef.current = next;
      setWorkspace((current) =>
        current.playbackMode === next.mode
          ? current
          : { ...current, playbackMode: next.mode },
      );
    },
    [],
  );

  const savePreference = useCallback(
    async (
      overrides: Partial<
        Pick<
          WorkspaceState,
          | "activeJob"
          | "detailWindowDurationSec"
          | "selectedClipId"
          | "sourcePlayheadSec"
        >
      > = {},
    ) => {
      const current = workspaceRef.current;
      const body = {
        version: 1,
        activeJob: overrides.activeJob ?? current.activeJob,
        detailWindowDurationSec:
          overrides.detailWindowDurationSec ?? current.detailWindowDurationSec,
        selectedClipId:
          overrides.selectedClipId === undefined
            ? current.selectedClipId
            : overrides.selectedClipId,
        sourcePlayheadSec:
          overrides.sourcePlayheadSec === undefined
            ? current.sourcePlayheadSec
            : overrides.sourcePlayheadSec,
        updatedAt: new Date().toISOString(),
      };
      const response = await fetch("/api/ops/media-lab/cutter-workspace", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Could not save active Cutter job");
      }
    },
    [],
  );

  const loadJob = useCallback(
    async (
      activeJob: CutterActiveJob,
      preference?: CutterWorkspacePreference,
      jobs?: CutterJobOption[],
      resumedFromPreference = false,
    ) => {
      setWorkspace((current) => ({
        ...current,
        isLoading: true,
        errorMessage: "",
        statusMessage: "Loading saved source — no retranscription…",
        sourceChooserOpen: false,
      }));
      try {
        const query = new URLSearchParams({
          year: String(activeJob.year),
          jobSlug: activeJob.jobSlug,
        });
        const proxyStatusPromise = fetch(
          `/api/ops/media-lab/editing-proxy?${query}`,
        )
          .then(async (response) =>
            response.ok
              ? ((await response.json()) as ProxyStatusResponse)
              : null,
          )
          .catch(() => null);
        const [previewResponse, editorialResponse, cutterResponse, proxyStatus] =
          await Promise.all([
          fetch("/api/ops/media-lab/jobs/load", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(activeJob),
          }),
          fetch(`/api/ops/media-lab/editorial?${query}`),
          fetch(`/api/ops/media-lab/cutter-edit?${query}`),
          proxyStatusPromise,
        ]);
        const preview = await responseJson<{
          job?: {
            sourceFilename?: string;
            sourceFingerprint?: string;
            durationSeconds?: number | null;
          };
        }>(previewResponse);
        const editorial = await responseJson<EditorialResponse>(editorialResponse);
        const cutter = await responseJson<CutterEditResponse>(cutterResponse);
        if (!cutter.manifest || !editorial.videoUrl) {
          throw new Error("Saved job is missing its source video or Cutter state");
        }

        const sourceDurationSec =
          Number(
            editorial.job?.durationSeconds ??
              preview.job?.durationSeconds ??
              cutter.manifest.sourceDurationSec,
          ) || 0;
        const detailWindowDurationSec =
          preference?.detailWindowDurationSec ?? workspaceRef.current.detailWindowDurationSec;
        const requestedPlayhead = preference?.sourcePlayheadSec ?? 0;
        const sourcePlayheadSec = clampSourceTime(requestedPlayhead, sourceDurationSec);
        const range = detailRange(
          sourcePlayheadSec,
          sourceDurationSec,
          detailWindowDurationSec,
        );
        const selectedClipId =
          preference?.selectedClipId &&
          cutter.manifest.extractedClips.some(
            (clip) => clip.id === preference.selectedClipId,
          )
            ? preference.selectedClipId
            : null;
        const migrationMessage = cutter.migration?.migratedCount
          ? ` Migrated ${cutter.migration.migratedCount} valid manual clip${
              cutter.migration.migratedCount === 1 ? "" : "s"
            }.`
          : "";
        const restoredMessage = resumedFromPreference
          ? "Active job restored automatically."
          : "Saved job loaded.";
        const proxyReady =
          proxyStatus?.proxyState === "ready" && Boolean(proxyStatus.videoUrl);
        const proxyState = proxyStatus?.proxyState ?? "missing";
        const proxyMessage =
          proxyStatus?.readiness?.reason ??
          (proxyReady
            ? "Validated editing proxy is ready"
            : "Original source fallback is active");

        playbackControllerRef.current = {
          mode: "paused",
          resumeMode: "working",
          previewClipId: null,
          handledBoundaryKey: null,
          seekInProgress: false,
        };
        scrubStateRef.current = "idle";
        programmaticSeekRef.current = false;

        setWorkspace((current) => ({
          ...EMPTY_STATE,
          activeJob,
          sourceFilename:
            editorial.job?.sourceFilename ??
            preview.job?.sourceFilename ??
            cutter.manifest!.sourceFilename,
          sourceFingerprint:
            cutter.sourceFingerprint ??
            editorial.job?.sourceFingerprint ??
            cutter.manifest!.sourceFingerprint,
          sourceDurationSec,
          originalVideoUrl: editorial.videoUrl!,
          proxyVideoUrl: proxyStatus?.videoUrl ?? "",
          sourceVideoUrl:
            proxyReady && proxyStatus?.videoUrl
              ? proxyStatus.videoUrl
              : editorial.videoUrl!,
          activeMedia: proxyReady ? "editing_proxy" : "original_fallback",
          proxyState,
          proxyProgressPct: proxyStatus?.generation?.progressPct ?? 0,
          proxyElapsedSec: proxyStatus?.generation?.elapsedSec ?? 0,
          proxyMessage,
          proxyMediaError: false,
          sourcePlayheadSec,
          detailRangeStartSec: range.sourceStartSec,
          detailRangeEndSec: range.sourceEndSec,
          detailWindowDurationSec,
          selectedClipId,
          transcriptSegments: editorial.segments ?? [],
          transcriptionStatus:
            (editorial.segments?.length ?? 0) > 0
              ? "transcribed"
              : "not_transcribed",
          sourceChanged: Boolean(cutter.sourceChanged),
          saveStatus: cutter.sourceChanged ? "error" : "saved",
          statusMessage: `${restoredMessage} No retranscription. ${
            proxyReady ? "Validated editing proxy reused." : "Original fallback active."
          }${migrationMessage}`,
          errorMessage: cutter.sourceChanged
            ? "Source fingerprint changed. Editing is locked until the source is restored."
            : "",
          isLoading: false,
          sourceChooserOpen: false,
          jobs: jobs ?? current.jobs,
          chooserJobKey: jobKey(activeJob),
          chooserYear: activeJob.year,
          ...manifestState(cutter.manifest!),
        }));
        await savePreference({
          activeJob,
          detailWindowDurationSec,
          selectedClipId,
          sourcePlayheadSec,
        });
      } catch (error) {
        setWorkspace((current) => ({
          ...current,
          isLoading: false,
          statusMessage: "",
          errorMessage:
            error instanceof Error ? error.message : "Could not load saved source",
          sourceChooserOpen: true,
        }));
      }
    },
    [savePreference],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/ops/media-lab/cutter-workspace");
        const bootstrap = await responseJson<WorkspaceBootstrapResponse>(response);
        if (cancelled) return;
        const jobs = bootstrap.jobs ?? [];
        if (!bootstrap.preference?.activeJob) {
          setWorkspace((current) => ({
            ...current,
            jobs,
            isLoading: false,
            sourceChooserOpen: true,
            statusMessage: "No active source. Load a saved video to begin cutting.",
            chooserJobKey: jobs[0] ? jobKey(jobs[0]) : "",
          }));
          return;
        }
        setWorkspace((current) => ({
          ...current,
          jobs,
          chooserJobKey: jobKey(bootstrap.preference!.activeJob!),
          chooserYear: bootstrap.preference!.activeJob!.year,
        }));
        await loadJob(
          bootstrap.preference.activeJob,
          bootstrap.preference,
          jobs,
          Boolean(bootstrap.resumedFromPreference),
        );
      } catch (error) {
        if (cancelled) return;
        setWorkspace((current) => ({
          ...current,
          isLoading: false,
          sourceChooserOpen: true,
          statusMessage: "",
          errorMessage:
            error instanceof Error
              ? error.message
              : "Could not restore the Cutter workspace",
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadJob]);

  const applyProxyStatus = useCallback((payload: ProxyStatusResponse) => {
    setWorkspace((current) => {
      const proxyState = payload.proxyState ?? current.proxyState;
      const proxyVideoUrl = payload.videoUrl ?? "";
      const proxyMessage =
        payload.generation?.error ??
        payload.readiness?.reason ??
        (proxyState === "preparing"
          ? "Preparing editing proxy"
          : current.proxyMessage);
      return {
        ...current,
        proxyState,
        proxyVideoUrl,
        proxyProgressPct:
          payload.generation?.progressPct ??
          (proxyState === "ready" ? 100 : current.proxyProgressPct),
        proxyElapsedSec:
          payload.generation?.elapsedSec ?? current.proxyElapsedSec,
        proxyMessage,
      };
    });
  }, []);

  const refreshProxyStatus = useCallback(async () => {
    const current = workspaceRef.current;
    if (!current.activeJob) return null;
    const query = new URLSearchParams({
      year: String(current.activeJob.year),
      jobSlug: current.activeJob.jobSlug,
    });
    const response = await fetch(`/api/ops/media-lab/editing-proxy?${query}`);
    const payload = await responseJson<ProxyStatusResponse>(response);
    applyProxyStatus(payload);
    return payload;
  }, [applyProxyStatus]);

  useEffect(() => {
    if (workspace.proxyState !== "preparing" || !workspace.activeJob) return;
    const timer = window.setInterval(() => {
      void refreshProxyStatus().catch((error) => {
        setWorkspace((current) => ({
          ...current,
          proxyState: "failed",
          proxyMessage:
            error instanceof Error ? error.message : "Proxy status failed",
        }));
      });
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [refreshProxyStatus, workspace.activeJob, workspace.proxyState]);

  useEffect(() => {
    if (
      workspace.proxyState !== "ready" ||
      !workspace.proxyVideoUrl ||
      workspace.activeMedia === "editing_proxy" ||
      workspace.isPlaying ||
      workspace.proxyMediaError ||
      scrubStateRef.current !== "idle"
    ) {
      return;
    }
    const nextController = {
      ...pausePlayback(playbackControllerRef.current),
      previewClipId: null,
      handledBoundaryKey: null,
      seekInProgress: false,
    };
    playbackControllerRef.current = nextController;
    setWorkspace((current) => ({
      ...current,
      sourceVideoUrl: current.proxyVideoUrl,
      activeMedia: "editing_proxy",
      playbackMode: "paused",
      statusMessage: `Editing proxy active · source time preserved at ${formatSourceTime(
        current.sourcePlayheadSec,
      )}`,
    }));
  }, [
    workspace.activeMedia,
    workspace.isPlaying,
    workspace.proxyMediaError,
    workspace.proxyState,
    workspace.proxyVideoUrl,
  ]);

  const prepareEditingProxy = useCallback(() => {
    const current = workspaceRef.current;
    if (!current.activeJob || current.proxyState === "preparing") return;
    const query = new URLSearchParams({
      year: String(current.activeJob.year),
      jobSlug: current.activeJob.jobSlug,
    });
    setWorkspace((state) => ({
      ...state,
      proxyState: "preparing",
      proxyProgressPct: 0,
      proxyElapsedSec: 0,
      proxyMessage: "Preparing editing proxy",
      proxyMediaError: false,
      statusMessage: "Preparing editing proxy — the original remains available.",
      errorMessage: "",
    }));
    void fetch(`/api/ops/media-lab/editing-proxy?${query}`, { method: "POST" })
      .then((response) => responseJson<ProxyStatusResponse>(response))
      .then(applyProxyStatus)
      .catch((error) => {
        setWorkspace((state) => ({
          ...state,
          proxyState: "failed",
          proxyMessage:
            error instanceof Error ? error.message : "Proxy preparation failed",
          statusMessage: "Original fallback remains active.",
        }));
      });
  }, [applyProxyStatus]);

  const cancelEditingProxy = useCallback(() => {
    const current = workspaceRef.current;
    if (!current.activeJob || current.proxyState !== "preparing") return;
    const query = new URLSearchParams({
      year: String(current.activeJob.year),
      jobSlug: current.activeJob.jobSlug,
    });
    void fetch(`/api/ops/media-lab/editing-proxy?${query}`, {
      method: "DELETE",
    })
      .then((response) => responseJson<ProxyStatusResponse>(response))
      .then((payload) => {
        applyProxyStatus(payload);
        setWorkspace((state) => ({
          ...state,
          statusMessage: "Proxy cancellation requested. Original fallback is safe.",
        }));
      })
      .catch((error) => {
        setWorkspace((state) => ({
          ...state,
          errorMessage:
            error instanceof Error ? error.message : "Proxy cancellation failed",
        }));
      });
  }, [applyProxyStatus]);

  useEffect(() => {
    if (
      !workspace.activeJob ||
      !workspace.sourceFingerprint ||
      workspace.sourceDurationSec <= 0
    ) {
      return;
    }
    const controller = new AbortController();
    const query = new URLSearchParams({
      year: String(workspace.activeJob.year),
      jobSlug: workspace.activeJob.jobSlug,
      chapterId: "manual-overview",
      startSec: "0",
      endSec: String(workspace.sourceDurationSec),
      sourceFingerprint: workspace.sourceFingerprint,
      profile: "overview",
      count: "30",
    });
    setWorkspace((current) => ({
      ...current,
      thumbnailStatus: current.detailFrames.length ? "partial" : "loading",
    }));
    void fetch(`/api/ops/media-lab/editorial/filmstrip?${query}`, {
      signal: controller.signal,
    })
      .then((response) => responseJson<{ frames?: ThumbnailFrame[] }>(response))
      .then((data) => {
        if (controller.signal.aborted) return;
        setWorkspace((current) => ({
          ...current,
          overviewFrames: data.frames ?? [],
          thumbnailStatus: current.detailFrames.length ? "ready" : "partial",
        }));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setWorkspace((current) => ({
          ...current,
          thumbnailStatus: current.detailFrames.length ? "partial" : "unavailable",
          statusMessage: `Overview thumbnails unavailable: ${
            error instanceof Error ? error.message : "unknown error"
          }. Timeline navigation still works.`,
        }));
      });
    return () => controller.abort();
  }, [
    workspace.activeJob,
    workspace.sourceDurationSec,
    workspace.sourceFingerprint,
  ]);

  useEffect(() => {
    if (
      !workspace.activeJob ||
      !workspace.sourceFingerprint ||
      workspace.detailRangeEndSec <= workspace.detailRangeStartSec
    ) {
      return;
    }
    const controller = new AbortController();
    const visibleDuration =
      workspace.detailRangeEndSec - workspace.detailRangeStartSec;
    const query = new URLSearchParams({
      year: String(workspace.activeJob.year),
      jobSlug: workspace.activeJob.jobSlug,
      chapterId: "manual-detail",
      startSec: String(workspace.detailRangeStartSec),
      endSec: String(workspace.detailRangeEndSec),
      sourceFingerprint: workspace.sourceFingerprint,
      profile: "detail",
      count: String(Math.max(8, Math.min(48, Math.ceil(visibleDuration / 2.5)))),
    });
    setWorkspace((current) => ({
      ...current,
      thumbnailStatus: current.overviewFrames.length ? "partial" : "loading",
    }));
    void fetch(`/api/ops/media-lab/editorial/filmstrip?${query}`, {
      signal: controller.signal,
    })
      .then((response) => responseJson<{ frames?: ThumbnailFrame[] }>(response))
      .then((data) => {
        if (controller.signal.aborted) return;
        setWorkspace((current) => ({
          ...current,
          detailFrames: data.frames ?? [],
          thumbnailStatus: current.overviewFrames.length ? "ready" : "partial",
        }));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setWorkspace((current) => ({
          ...current,
          thumbnailStatus: current.overviewFrames.length ? "partial" : "unavailable",
          statusMessage: `Detail thumbnails unavailable: ${
            error instanceof Error ? error.message : "unknown error"
          }. Fine scrubbing still works.`,
        }));
      });
    return () => controller.abort();
  }, [
    workspace.activeJob,
    workspace.detailRangeEndSec,
    workspace.detailRangeStartSec,
    workspace.sourceFingerprint,
  ]);

  const reframeDetail = useCallback(
    (sourceTimeSec: number, windowDurationSec?: DetailWindowSeconds) => {
      const current = workspaceRef.current;
      const nextWindow = windowDurationSec ?? current.detailWindowDurationSec;
      const range = detailRange(sourceTimeSec, current.sourceDurationSec, nextWindow);
      setWorkspace((state) => ({
        ...state,
        detailRangeStartSec: range.sourceStartSec,
        detailRangeEndSec: range.sourceEndSec,
        detailWindowDurationSec: nextWindow,
      }));
    },
    [],
  );

  const seekMediaExact = useCallback((sourceTimeSec: number): Promise<void> => {
    const video = videoRef.current;
    if (!video) {
      programmaticSeekRef.current = false;
      return Promise.resolve();
    }
    const target = clampSourceTime(
      sourceTimeSec,
      workspaceRef.current.sourceDurationSec,
    );
    if (Math.abs(video.currentTime - target) <= 0.005 && !video.seeking) {
      programmaticSeekRef.current = false;
      return Promise.resolve();
    }
    programmaticSeekRef.current = true;
    return new Promise((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        video.removeEventListener("seeked", finish);
        window.clearTimeout(timeoutId);
        programmaticSeekRef.current = false;
        resolve();
      };
      const timeoutId = window.setTimeout(finish, 2_000);
      video.addEventListener("seeked", finish, { once: true });
      video.currentTime = target;
    });
  }, []);

  const clearScheduledScrubSeek = useCallback(() => {
    const schedule = scrubSeekRef.current;
    if (schedule.timeoutId != null) {
      window.clearTimeout(schedule.timeoutId);
      schedule.timeoutId = null;
    }
    if (schedule.animationFrameId != null) {
      cancelAnimationFrame(schedule.animationFrameId);
      schedule.animationFrameId = null;
    }
    schedule.pendingSourceTimeSec = null;
    schedule.interactionId += 1;
  }, []);

  const issueApproximateScrubSeek = useCallback((sourceTimeSec: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = clampSourceTime(
      sourceTimeSec,
      workspaceRef.current.sourceDurationSec,
    );
    const fastSeek = (
      video as HTMLVideoElement & { fastSeek?: (time: number) => void }
    ).fastSeek;
    programmaticSeekRef.current = true;
    try {
      if (
        mediaSeekMethod({
          exact: false,
          fastSeekSupported: typeof fastSeek === "function",
        }) === "fastSeek"
      ) {
        fastSeek!.call(video, target);
      } else {
        video.currentTime = target;
      }
    } catch {
      video.currentTime = target;
    }
    scrubSeekRef.current.lastSeekAtMs = performance.now();
    scrubSeekRef.current.mediaSeekCount += 1;
  }, []);

  const scheduleApproximateScrubSeek = useCallback(
    (sourceTimeSec: number, intervalMs = SCRUB_SEEK_INTERVAL_MS) => {
      const schedule = scrubSeekRef.current;
      schedule.pendingSourceTimeSec = sourceTimeSec;
      const requestLatest = () => {
        const interactionId = schedule.interactionId;
        schedule.animationFrameId = requestAnimationFrame(() => {
          schedule.animationFrameId = null;
          if (interactionId !== schedule.interactionId) return;
          const target = schedule.pendingSourceTimeSec;
          schedule.pendingSourceTimeSec = null;
          if (target != null) issueApproximateScrubSeek(target);
        });
      };
      const now = performance.now();
      if (
        shouldIssueScrubSeek(
          schedule.lastSeekAtMs,
          now,
          intervalMs,
        )
      ) {
        if (schedule.animationFrameId == null) requestLatest();
        return;
      }
      if (schedule.timeoutId != null) return;
      const waitMs = Math.max(
        0,
        intervalMs -
          (now - (schedule.lastSeekAtMs ?? now)),
      );
      schedule.timeoutId = window.setTimeout(() => {
        schedule.timeoutId = null;
        if (schedule.animationFrameId == null) requestLatest();
      }, waitMs);
    },
    [issueApproximateScrubSeek],
  );

  useEffect(() => clearScheduledScrubSeek, [clearScheduledScrubSeek]);

  const seekSource = useCallback(
    (
      sourceTimeSec: number,
      playbackMode: ActivePlaybackMode,
      options: { reframe?: boolean } = {},
    ) => {
      const current = workspaceRef.current;
      const bounded = clampSourceTime(sourceTimeSec, current.sourceDurationSec);
      const video = videoRef.current;
      if (video && !video.paused) video.pause();
      const paused = nativeSeekTransition(playbackControllerRef.current);
      commitPlaybackController({ ...paused, resumeMode: playbackMode });
      void seekMediaExact(bounded);
      setWorkspace((state) => {
        const range = options.reframe
          ? detailRange(bounded, state.sourceDurationSec, state.detailWindowDurationSec)
          : null;
        return {
          ...state,
          sourcePlayheadSec: bounded,
          ...(range
            ? {
                detailRangeStartSec: range.sourceStartSec,
                detailRangeEndSec: range.sourceEndSec,
              }
            : {}),
        };
      });
    },
    [commitPlaybackController, seekMediaExact],
  );

  const enforcePlaybackBoundaries = useCallback(() => {
    const video = videoRef.current;
    const current = workspaceRef.current;
    const controller = playbackControllerRef.current;
    if (!video || video.paused || current.sourceDurationSec <= 0) return;
    const previewClip =
      controller.mode === "clip_preview" && controller.previewClipId
        ? current.extractedClips.find(
            (clip) => clip.id === controller.previewClipId,
          ) ?? null
        : null;
    const previewRange = controller.previewClipId === "__selection__"
      ? selectionPreviewRef.current
      : previewClip
        ? { sourceStartSec: previewClip.sourceInSec, sourceEndSec: previewClip.sourceOutSec }
        : null;
    const decision = decidePlaybackBoundary({
      mode: controller.mode,
      sourceTimeSec: video.currentTime,
      remainingRanges: current.remainingRanges,
      previewRange,
      toleranceSec: boundaryToleranceSec(25),
      handledBoundaryKey: controller.handledBoundaryKey,
      seekInProgress: controller.seekInProgress,
      scrubState: scrubStateRef.current,
    });

    if (decision.type === "none") return;
    if (decision.type === "pause") {
      playbackControllerRef.current = {
        ...(decision.reason === "clip_preview_complete"
          ? completeClipPreview(controller)
          : pausePlayback(controller)),
        handledBoundaryKey: decision.boundaryKey,
      };
      commitPlaybackController(playbackControllerRef.current);
      video.pause();
      void seekMediaExact(decision.sourceTimeSec);
      setWorkspace((state) => ({
        ...state,
        sourcePlayheadSec: decision.sourceTimeSec,
        isPlaying: false,
        statusMessage:
          decision.reason === "clip_preview_complete"
            ? `Preview complete — ${previewClip?.title ?? "selection"}`
            : "Reached the end of the Working Timeline.",
      }));
      return;
    }

    const joinController: PlaybackControllerState = {
      ...controller,
      handledBoundaryKey: decision.boundaryKey,
      seekInProgress: true,
    };
    playbackControllerRef.current = joinController;
    setWorkspace((state) => ({
      ...state,
      sourcePlayheadSec: decision.sourceTimeSec,
      statusMessage: `Ripple join → ${formatSourceTime(decision.sourceTimeSec)}`,
    }));
    void seekMediaExact(decision.sourceTimeSec).then(() => {
      const latest = playbackControllerRef.current;
      if (
        latest.mode !== "working" ||
        latest.handledBoundaryKey !== decision.boundaryKey
      ) {
        return;
      }
      playbackControllerRef.current = { ...latest, seekInProgress: false };
      if (video.paused) {
        void video.play().catch((error) => {
          commitPlaybackController(pausePlayback(playbackControllerRef.current));
          setWorkspace((state) => ({
            ...state,
            errorMessage:
              error instanceof Error ? error.message : "Ripple playback failed",
          }));
        });
      }
    });
  }, [commitPlaybackController, seekMediaExact]);

  const stopPlaybackGuard = useCallback(() => {
    if (playbackGuardRef.current != null) {
      cancelAnimationFrame(playbackGuardRef.current);
      playbackGuardRef.current = null;
    }
  }, []);

  const startPlaybackGuard = useCallback(() => {
    stopPlaybackGuard();
    const tick = () => {
      enforcePlaybackBoundaries();
      if (videoRef.current && !videoRef.current.paused) {
        playbackGuardRef.current = requestAnimationFrame(tick);
      } else {
        playbackGuardRef.current = null;
      }
    };
    playbackGuardRef.current = requestAnimationFrame(tick);
  }, [enforcePlaybackBoundaries, stopPlaybackGuard]);

  useEffect(() => stopPlaybackGuard, [stopPlaybackGuard]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || scrubStateRef.current !== "idle") return;
    const sourceTimeSec = video.currentTime;
    setWorkspace((current) =>
      Math.abs(current.sourcePlayheadSec - sourceTimeSec) < 0.025
        ? current
        : { ...current, sourcePlayheadSec: sourceTimeSec },
    );
  }, []);

  const startMediaPlayback = useCallback(
    (
      mode: ActivePlaybackMode,
      options: { sourceTimeSec?: number; previewClipId?: string | null } = {},
    ) => {
      const video = videoRef.current;
      if (!video) return;
      const next = beginPlayback(
        playbackControllerRef.current,
        mode,
        options.previewClipId ?? null,
      );
      commitPlaybackController(next);
      void (async () => {
        if (options.sourceTimeSec != null) {
          await seekMediaExact(options.sourceTimeSec);
        }
        if (playbackControllerRef.current.mode !== mode) return;
        try {
          await video.play();
        } catch (error) {
          commitPlaybackController(pausePlayback(playbackControllerRef.current));
          setWorkspace((state) => ({
            ...state,
            errorMessage:
              error instanceof Error ? error.message : "Playback could not start",
          }));
        }
      })();
    },
    [commitPlaybackController, seekMediaExact],
  );

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    const current = workspaceRef.current;
    if (!video || !current.sourceVideoUrl) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    let requestedMode = playbackControllerRef.current.resumeMode;
    let previewClipId = playbackControllerRef.current.previewClipId;
    if (
      requestedMode === "clip_preview" &&
      !current.extractedClips.some((clip) => clip.id === previewClipId)
    ) {
      requestedMode = "working";
      previewClipId = null;
    }
    let sourceTimeSec: number | undefined;
    if (requestedMode === "working") {
      const range = nextRemainingPlaybackRange(
        current.sourcePlayheadSec,
        current.remainingRanges,
      );
      if (!range) {
        setWorkspace((state) => ({
          ...state,
          statusMessage: "No footage remains in the Working Timeline.",
        }));
        return;
      }
      if (
        current.sourcePlayheadSec < range.sourceStartSec ||
        current.sourcePlayheadSec >= range.sourceEndSec
      ) {
        sourceTimeSec = range.sourceStartSec;
        setWorkspace((state) => ({
          ...state,
          sourcePlayheadSec: range.sourceStartSec,
        }));
      }
    }
    startMediaPlayback(requestedMode, { sourceTimeSec, previewClipId });
  }, [startMediaPlayback]);

  const setIn = useCallback(() => {
    const current = workspaceRef.current;
    if (
      !Number.isFinite(current.sourcePlayheadSec) ||
      current.sourceDurationSec <= 0
    ) {
      setWorkspace((state) => ({
        ...state,
        errorMessage: "Load a source before setting In.",
      }));
      return;
    }
    setWorkspace((state) => ({
      ...state,
      rangeInSec: state.sourcePlayheadSec,
      saveStatus: state.saveStatus === "saved" ? "saved" : state.saveStatus,
      errorMessage: "",
      statusMessage: `${state.rangeInSec == null ? "IN SET" : "IN MOVED"} · ${formatSourceTime(state.sourcePlayheadSec)}`,
    }));
  }, []);

  const setOut = useCallback(() => {
    const current = workspaceRef.current;
    if (!Number.isFinite(current.sourcePlayheadSec) || current.sourceDurationSec <= 0) {
      setWorkspace((state) => ({ ...state, errorMessage: "Load a source before setting Out." }));
      return;
    }
    setWorkspace((state) => ({
      ...state,
      rangeOutSec: state.sourcePlayheadSec,
      errorMessage: "",
      statusMessage: `${state.rangeOutSec == null ? "OUT SET" : "OUT MOVED"} · ${formatSourceTime(state.sourcePlayheadSec)}`,
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setWorkspace((state) => ({ ...state, rangeInSec: null, rangeOutSec: null, activeSelectionEdge: null, errorMessage: "", statusMessage: "Selection cleared." }));
  }, []);

  const selectWorkingRange = useCallback((startSec: number, endSec: number, activeEdge: "start" | "end") => {
    const start = Math.min(startSec, endSec);
    const end = Math.max(startSec, endSec);
    if (end - start < 0.04) return;
    setWorkspace((state) => ({ ...state, rangeInSec: start, rangeOutSec: end, activeSelectionEdge: activeEdge, statusMessage: "Selection ready." }));
    seekSource(activeEdge === "start" ? start : end, "source_navigation", { reframe: true });
  }, [seekSource]);

  const clearIn = useCallback(() => {
    setWorkspace((current) => ({
      ...current,
      rangeInSec: null,
      rangeOutSec: null,
      saveStatus: "saved",
      errorMessage: "",
      statusMessage: "In mark cleared.",
    }));
  }, []);

  const applyCutterResponse = useCallback(
    (
      response: CutterEditResponse,
      statusMessage: (clip: CutterClip | undefined) => string,
    ) => {
      if (!response.manifest) throw new Error("Cutter response did not include edit state");
      const nextPlayhead = clampSourceTime(
        response.sourcePlayheadSec ?? workspaceRef.current.sourcePlayheadSec,
        response.manifest.sourceDurationSec,
      );
      const range = detailRange(
        nextPlayhead,
        response.manifest.sourceDurationSec,
        workspaceRef.current.detailWindowDurationSec,
      );
      playbackControllerRef.current = {
        mode: "paused",
        resumeMode: "working",
        previewClipId: null,
        handledBoundaryKey: null,
        seekInProgress: false,
      };
      setWorkspace((current) => ({
        ...current,
        ...manifestState(response.manifest!),
        sourcePlayheadSec: nextPlayhead,
        detailRangeStartSec: range.sourceStartSec,
        detailRangeEndSec: range.sourceEndSec,
        rangeInSec: null,
        rangeOutSec: null,
        activeSelectionEdge: null,
        selectedClipId:
          response.operation === "extract"
            ? response.affectedClip?.id ?? current.selectedClipId
            : response.operation === "return" &&
                current.selectedClipId === response.affectedClip?.id
              ? null
              : current.selectedClipId,
        playbackMode: "paused",
        saveStatus: "saved",
        errorMessage: "",
        statusMessage: statusMessage(response.affectedClip),
      }));
      void seekMediaExact(nextPlayhead);
    },
    [seekMediaExact],
  );

  const cutterOperation = useCallback(
    async (operation: Record<string, unknown>) => {
      const current = workspaceRef.current;
      if (!current.activeJob || !current.sourceFingerprint) {
        throw new Error("No active Cutter job");
      }
      const query = new URLSearchParams({
        year: String(current.activeJob.year),
        jobSlug: current.activeJob.jobSlug,
      });
      const response = await fetch(`/api/ops/media-lab/cutter-edit?${query}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedSourceFingerprint: current.sourceFingerprint,
          operation,
        }),
      });
      const data = (await response.json()) as CutterEditResponse;
      if (!response.ok || !data.ok) {
        const error = new Error(data.error || "Cutter edit failed");
        Object.assign(error, { status: response.status });
        throw error;
      }
      return data;
    },
    [],
  );

  const extract = useCallback(() => {
    const current = workspaceRef.current;
    if (current.saveStatus === "saving") return;
    if (current.rangeInSec == null || current.rangeOutSec == null) {
      setWorkspace((state) => ({
        ...state,
        errorMessage: "Set both In and Out before extracting.",
        statusMessage: "",
      }));
      return;
    }
    const sourceInSec = current.rangeInSec;
    const sourceOutSec = current.rangeOutSec;
    if (sourceInSec >= sourceOutSec) {
      setWorkspace((state) => ({ ...state, errorMessage: "REVERSED RANGE — MOVE IN BEFORE OUT", statusMessage: "" }));
      return;
    }
    setWorkspace((state) => ({
      ...state,
      saveStatus: "saving",
      errorMessage: "",
      statusMessage: "Extracting clip…",
    }));
    void cutterOperation({
      type: "extract",
      sourceInSec,
      sourceOutSec,
      sourcePlayheadSec: sourceOutSec,
    })
      .then((response) => {
        applyCutterResponse(
          response,
          (clip) =>
            clip
              ? `Extracted ${clip.title} · ${formatCompactDuration(clip.durationSec)}`
              : "Clip extracted.",
        );
      })
      .catch((error) => {
        const sourceChanged =
          (error as Error & { status?: number }).status === 409;
        setWorkspace((state) => ({
          ...state,
          saveStatus: "error",
          sourceChanged: state.sourceChanged || sourceChanged,
          errorMessage:
            error instanceof Error ? error.message : "Could not extract clip",
          statusMessage: "",
        }));
      });
  }, [applyCutterResponse, cutterOperation]);

  const previewSelection = useCallback(() => {
    const current = workspaceRef.current;
    if (current.rangeInSec == null || current.rangeOutSec == null || current.rangeInSec >= current.rangeOutSec) {
      setWorkspace((state) => ({ ...state, errorMessage: "Preview requires a valid In/Out range." }));
      return;
    }
    const start = current.rangeInSec;
    const end = current.rangeOutSec;
    const video = videoRef.current;
    if (!video) return;
    selectionPreviewRef.current = { sourceStartSec: start, sourceEndSec: end };
    commitPlaybackController({ ...playbackControllerRef.current, mode: "clip_preview", previewClipId: "__selection__" });
    void seekMediaExact(start).then(() => video.play()).catch(() => undefined);
    setWorkspace((state) => ({ ...state, playbackMode: "clip_preview", statusMessage: `Previewing selection · ${formatSourceTime(start)} → ${formatSourceTime(end)}` }));
  }, [commitPlaybackController, seekMediaExact]);

  const undo = useCallback(() => {
    const current = workspaceRef.current;
    if (current.saveStatus === "saving" || current.editHistory.length === 0) return;
    setWorkspace((state) => ({
      ...state,
      saveStatus: "saving",
      errorMessage: "",
      statusMessage: "Undoing last timeline edit…",
    }));
    void cutterOperation({ type: "undo" })
      .then((response) => {
        applyCutterResponse(response, (clip) =>
          response.activeInSec != null
            ? `Extraction undone · In restored at ${formatSourceTime(
                response.activeInSec,
              )}`
            : `Return undone · ${clip?.title ?? "clip"} extracted again`,
        );
      })
      .catch((error) => {
        setWorkspace((state) => ({
          ...state,
          saveStatus: "error",
          errorMessage: error instanceof Error ? error.message : "Undo failed",
          statusMessage: "",
        }));
      });
  }, [applyCutterResponse, cutterOperation]);

  const returnToTimeline = useCallback(
    (clipId: string) => {
      const current = workspaceRef.current;
      if (current.saveStatus === "saving") return;
      setWorkspace((state) => ({
        ...state,
        saveStatus: "saving",
        errorMessage: "",
        statusMessage: "Returning footage to the Working Timeline…",
      }));
      void cutterOperation({
        type: "return",
        clipId,
        sourcePlayheadSec: current.sourcePlayheadSec,
        activeInSec: current.rangeInSec,
      })
        .then((response) => {
          applyCutterResponse(
            response,
            (clip) => `${clip?.title ?? "Clip"} returned chronologically.`,
          );
        })
        .catch((error) => {
          setWorkspace((state) => ({
            ...state,
            saveStatus: "error",
            errorMessage:
              error instanceof Error ? error.message : "Return to Timeline failed",
            statusMessage: "",
          }));
        });
    },
    [applyCutterResponse, cutterOperation],
  );

  const updateClip = useCallback(
    (
      clipId: string,
      patch: { title?: string; includeForExport?: boolean; notes?: string },
    ) => {
      setWorkspace((state) => ({
        ...state,
        saveStatus: "saving",
        errorMessage: "",
        statusMessage: "Saving clip…",
      }));
      void cutterOperation({ type: "update_clip", clipId, ...patch })
        .then((response) => {
          if (!response.manifest) throw new Error("Clip save returned no manifest");
          setWorkspace((current) => ({
            ...current,
            ...manifestState(response.manifest!),
            saveStatus: "saved",
            statusMessage:
              patch.title !== undefined
                ? "Operator title saved."
                : "Include for Export saved.",
          }));
        })
        .catch((error) => {
          setWorkspace((state) => ({
            ...state,
            saveStatus: "error",
            errorMessage:
              error instanceof Error ? error.message : "Could not update clip",
            statusMessage: "",
          }));
        });
    },
    [cutterOperation],
  );

  const previewClip = useCallback(
    (clipId: string) => {
      const clip = workspaceRef.current.extractedClips.find(
        (item) => item.id === clipId,
      );
      if (!clip || !videoRef.current) return;
      setWorkspace((current) => ({
        ...current,
        selectedClipId: clipId,
        sourcePlayheadSec: clip.sourceInSec,
        statusMessage: `Clip Preview · ${clip.title}`,
        errorMessage: "",
      }));
      startMediaPlayback("clip_preview", {
        sourceTimeSec: clip.sourceInSec,
        previewClipId: clip.id,
      });
    },
    [startMediaPlayback],
  );

  const selectClip = useCallback(
    (clipId: string) => {
      const clip = workspaceRef.current.extractedClips.find(
        (item) => item.id === clipId,
      );
      if (!clip) return;
      seekSource(clip.sourceInSec, "source_navigation", { reframe: true });
      setWorkspace((current) => ({
        ...current,
        selectedClipId: clipId,
        statusMessage: `${clip.title} selected at ${formatSourceTime(
          clip.sourceInSec,
        )}`,
      }));
      void savePreference({
        selectedClipId: clipId,
        sourcePlayheadSec: clip.sourceInSec,
      }).catch(() => undefined);
    },
    [savePreference, seekSource],
  );

  const nudgePlayhead = useCallback(
    (delta: number) => {
      const current = workspaceRef.current;
      seekSource(
        current.sourcePlayheadSec + delta,
        "source_navigation",
      );
    },
    [seekSource],
  );

  actionsRef.current = {
    setIn,
    extract,
    togglePlayback,
    nudgePlayhead,
    clearSelection,
    setOut,
    previewSelection,
    undo,
  };

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (isTextEditingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "z") {
        event.preventDefault();
        actionsRef.current.undo();
        return;
      }
      if (event.metaKey || event.ctrlKey) return;
      if (key === "e" && !event.repeat) {
        event.preventDefault();
        actionsRef.current.extract();
      } else if (key === "p" && !event.repeat) {
        event.preventDefault();
        actionsRef.current.previewSelection();
      } else if (event.code === "Space") {
        event.preventDefault();
        actionsRef.current.togglePlayback();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const magnitude = event.altKey ? 1 : event.shiftKey ? 0.1 : 0.04;
        actionsRef.current.nudgePlayhead(
          event.key === "ArrowLeft" ? -magnitude : magnitude,
        );
      } else if (event.key === "Escape") {
        event.preventDefault();
        actionsRef.current.clearSelection();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const scrubSourceTime = useCallback(
    (
      sourceTimeSec: number,
      scrubState: Exclude<CutterScrubState, "idle">,
      phase: ScrubPhase,
      reframeOnRelease: boolean,
    ) => {
      const current = workspaceRef.current;
      const target = clampSourceTime(
        sourceTimeSec,
        current.sourceDurationSec,
      );
      if (phase === "start") {
        scrubSequenceRef.current += 1;
        clearScheduledScrubSeek();
        scrubSeekRef.current.lastSeekAtMs = null;
        scrubSeekRef.current.mediaSeekCount = 0;
        scrubStateRef.current = scrubState;
        const video = videoRef.current;
        if (video && !video.paused) video.pause();
        const transition = beginScrub(
          playbackControllerRef.current,
          scrubState,
        );
        commitPlaybackController(transition.playback);
      } else if (scrubStateRef.current !== scrubState) {
        return;
      }

      setWorkspace((state) => ({
        ...state,
        sourcePlayheadSec: target,
      }));

      if (phase === "start" || phase === "move") {
        scheduleApproximateScrubSeek(target, scrubState === "detail_drag" ? 50 : 100);
        return;
      }

      const sequence = scrubSequenceRef.current;
      clearScheduledScrubSeek();
      const mediaSeekCount = scrubSeekRef.current.mediaSeekCount + 1;
      void seekMediaExact(target).then(() => {
        if (scrubSequenceRef.current !== sequence) return;
        scrubStateRef.current = "idle";
        commitPlaybackController(
          finishScrub(playbackControllerRef.current, scrubState),
        );
        setWorkspace((state) => {
          const range = reframeOnRelease
            ? detailRange(
                target,
                state.sourceDurationSec,
                state.detailWindowDurationSec,
              )
            : null;
          return {
            ...state,
            sourcePlayheadSec: target,
            ...(range
              ? {
                  detailRangeStartSec: range.sourceStartSec,
                  detailRangeEndSec: range.sourceEndSec,
                }
              : {}),
            isPlaying: false,
            statusMessage: `${
              scrubState === "working_drag" ? "Working" : "Detail"
            } scrub · exact ${formatSourceTime(target)} · ${mediaSeekCount} media seek${
              mediaSeekCount === 1 ? "" : "s"
            }`,
          };
        });
      });
    },
    [
      clearScheduledScrubSeek,
      commitPlaybackController,
      scheduleApproximateScrubSeek,
      seekMediaExact,
    ],
  );

  const seekWorking = useCallback(
    (pointerPosition: number, phase: ScrubPhase) => {
      const current = workspaceRef.current;
      const sourceTimeSec = workingPointerPositionToSourceTime(
        pointerPosition,
        current.remainingRanges,
      );
      scrubSourceTime(sourceTimeSec, "working_drag", phase, true);
    },
    [scrubSourceTime],
  );

  const seekDetail = useCallback(
    (pointerPosition: number, phase: ScrubPhase) => {
      const current = workspaceRef.current;
      const sourceTimeSec =
        current.detailRangeStartSec +
        Math.max(0, Math.min(1, pointerPosition)) *
          (current.detailRangeEndSec - current.detailRangeStartSec);
      scrubSourceTime(sourceTimeSec, "detail_drag", phase, false);
    },
    [scrubSourceTime],
  );

  const loadChosenJob = useCallback(() => {
    const chosen = parseJobKey(workspaceRef.current.chooserJobKey);
    if (!chosen) {
      setWorkspace((current) => ({
        ...current,
        errorMessage: "Choose a saved Media Lab job.",
      }));
      return;
    }
    void loadJob(chosen, {
      version: 1,
      activeJob: chosen,
      detailWindowDurationSec: workspaceRef.current.detailWindowDurationSec,
      selectedClipId: null,
      sourcePlayheadSec: 0,
      updatedAt: new Date().toISOString(),
    });
  }, [loadJob]);

  const transcribeChosenFile = useCallback(() => {
    const current = workspaceRef.current;
    if (!current.pendingFile) {
      setWorkspace((state) => ({
        ...state,
        errorMessage: "Choose a new video file first.",
      }));
      return;
    }
    const form = new FormData();
    form.set("year", String(current.chooserYear));
    form.append("video", current.pendingFile);
    setWorkspace((state) => ({
      ...state,
      isLoading: true,
      errorMessage: "",
      statusMessage: "Transcribing the selected new source…",
    }));
    void fetch("/api/ops/media-lab/transcribe", { method: "POST", body: form })
      .then((response) =>
        responseJson<{ jobSlug?: string; error?: string }>(response),
      )
      .then(async (data) => {
        if (!data.jobSlug) throw new Error("Transcription returned no saved job");
        const bootstrap = await responseJson<WorkspaceBootstrapResponse>(
          await fetch("/api/ops/media-lab/cutter-workspace"),
        );
        const activeJob = { year: current.chooserYear, jobSlug: data.jobSlug };
        await loadJob(
          activeJob,
          {
            version: 1,
            activeJob,
            detailWindowDurationSec: current.detailWindowDurationSec,
            selectedClipId: null,
            sourcePlayheadSec: 0,
            updatedAt: new Date().toISOString(),
          },
          bootstrap.jobs,
        );
      })
      .catch((error) => {
        setWorkspace((state) => ({
          ...state,
          isLoading: false,
          errorMessage:
            error instanceof Error ? error.message : "Transcription failed",
          statusMessage: "",
        }));
      });
  }, [loadJob]);

  const workingSamples = useMemo(
    () => sampleWorkingTimelineSourceTimes(workspace.remainingRanges, 30),
    [workspace.remainingRanges],
  );

  const aroundPlayheadTranscript = useMemo(() => {
    if (workspace.transcriptSegments.length === 0) return [];
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    workspace.transcriptSegments.forEach((segment, index) => {
      const distance =
        workspace.sourcePlayheadSec < segment.start
          ? segment.start - workspace.sourcePlayheadSec
          : workspace.sourcePlayheadSec > segment.end
            ? workspace.sourcePlayheadSec - segment.end
            : 0;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    return workspace.transcriptSegments.slice(
      Math.max(0, nearestIndex - 2),
      Math.min(workspace.transcriptSegments.length, nearestIndex + 3),
    );
  }, [workspace.sourcePlayheadSec, workspace.transcriptSegments]);

  const activePlaybackLabel =
    workspace.playbackMode === "paused"
      ? `Paused · ${playbackControllerRef.current.resumeMode === "working" ? "Working" : playbackControllerRef.current.resumeMode === "clip_preview" ? "Clip Preview" : "Source"}`
      : workspace.playbackMode === "working"
      ? "Working"
      : workspace.playbackMode === "clip_preview"
        ? "Clip Preview"
        : "Source";
  const proxyStatusLabel =
    workspace.proxyState === "preparing"
      ? `Proxy Preparing · ${Math.floor(workspace.proxyProgressPct)}%`
      : workspace.proxyState === "ready"
        ? "Proxy Ready"
        : workspace.proxyState === "failed" || workspace.proxyState === "cancelled"
          ? "Proxy Failed"
          : workspace.proxyState === "stale"
            ? "Proxy Stale"
            : "Original";

  return (
    <section className="media-lab-cutter" aria-label="Media Lab Cutter workspace">
      <header className="media-lab-cutter__source-header">
        <div className="media-lab-cutter__source-identity">
          <span className="media-lab-cutter__eyebrow">Media Lab Cutter</span>
          <strong title={workspace.sourceFilename || "No source loaded"}>
            {workspace.sourceFilename || "No source loaded"}
          </strong>
          <span>
            {workspace.sourceDurationSec > 0
              ? formatSourceTime(workspace.sourceDurationSec)
              : "Load a saved source to begin"}
          </span>
        </div>
        <div className="media-lab-cutter__source-status">
          <span
            className={`media-lab-cutter__status-dot${
              workspace.sourceVideoUrl ? " is-ready" : ""
            }`}
          >
            {workspace.sourceVideoUrl ? "Loaded" : "Empty"}
          </span>
          <span
            className={`media-lab-cutter__status-dot${
              workspace.transcriptionStatus === "transcribed" ? " is-ready" : ""
            }`}
          >
            {workspace.transcriptionStatus === "transcribed"
              ? `Transcribed · ${workspace.transcriptSegments.length}`
              : "Not transcribed"}
          </span>
          <span
            className={`media-lab-cutter__status-dot${
              workspace.proxyState === "ready" ? " is-ready" : ""
            }`}
            title={workspace.proxyMessage}
          >
            {proxyStatusLabel}
          </span>
          <span title="All edit decisions remain in original source time">
            Active · {workspace.activeMedia === "editing_proxy" ? "Editing Proxy" : "Original Fallback"}
          </span>
          <span
            className={`media-lab-cutter__save-state is-${workspace.saveStatus}`}
          >
            {workspace.saveStatus === "saving"
              ? "Saving…"
              : workspace.saveStatus === "unsaved"
                ? "In unsaved"
                : workspace.saveStatus === "error"
                  ? "Save blocked"
                  : "Saved"}
          </span>
          <span className="media-lab-cutter__mode">Mode · {activePlaybackLabel}</span>
        </div>
        <div className="media-lab-cutter__header-actions">
          {workspace.sourceVideoUrl && workspace.proxyState !== "ready" ? (
            <button
              type="button"
              onClick={
                workspace.proxyState === "preparing"
                  ? cancelEditingProxy
                  : prepareEditingProxy
              }
            >
              {workspace.proxyState === "preparing"
                ? "Cancel Proxy"
                : workspace.proxyState === "failed" ||
                    workspace.proxyState === "cancelled" ||
                    workspace.proxyState === "stale"
                  ? "Retry Proxy"
                  : "Prepare Editing Proxy"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() =>
              setWorkspace((current) => ({
                ...current,
                sourceChooserOpen: !current.sourceChooserOpen,
                errorMessage: "",
              }))
            }
          >
            {workspace.sourceVideoUrl ? "Change Source" : "Load Video"}
          </button>
          {workspace.transcriptionStatus === "not_transcribed" ? (
            <button
              type="button"
              onClick={() =>
                setWorkspace((current) => ({
                  ...current,
                  sourceChooserOpen: true,
                  statusMessage: "Choose the source file to transcribe explicitly.",
                }))
              }
            >
              Transcribe
            </button>
          ) : null}
          <button
            type="button"
            disabled={workspace.editHistory.length === 0 || workspace.saveStatus === "saving"}
            onClick={undo}
          >
            Undo
          </button>
        </div>
      </header>

      {workspace.sourceChooserOpen ? (
        <section className="media-lab-cutter__source-chooser" aria-label="Source chooser">
          <label>
            <span>Saved source</span>
            <select
              value={workspace.chooserJobKey}
              onChange={(event) =>
                setWorkspace((current) => ({
                  ...current,
                  chooserJobKey: event.target.value,
                }))
              }
            >
              <option value="">Choose a saved Media Lab job…</option>
              {workspace.jobs.map((job) => (
                <option key={jobKey(job)} value={jobKey(job)}>
                  {job.year} · {job.sourceFilename}
                  {job.hasTranscript ? " · transcribed" : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!workspace.chooserJobKey || workspace.isLoading}
            onClick={loadChosenJob}
          >
            Load Saved Source
          </button>
          <span className="media-lab-cutter__chooser-divider">or add a new source</span>
          <label>
            <span>Year</span>
            <select
              value={workspace.chooserYear}
              onChange={(event) =>
                setWorkspace((current) => ({
                  ...current,
                  chooserYear: Number(event.target.value),
                }))
              }
            >
              {[1967, 1969, 1978, 1992].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="media-lab-cutter__file">
            <span>Video file</span>
            <input
              type="file"
              accept="video/*,.mp4,.mov,.mkv,.webm"
              onChange={(event) =>
                setWorkspace((current) => ({
                  ...current,
                  pendingFile: event.target.files?.[0] ?? null,
                }))
              }
            />
          </label>
          <button
            type="button"
            disabled={!workspace.pendingFile || workspace.isLoading}
            onClick={transcribeChosenFile}
          >
            Transcribe New Source
          </button>
        </section>
      ) : null}

      <div
        className={`media-lab-cutter__message${
          workspace.errorMessage ? " is-error" : ""
        }`}
        role={workspace.errorMessage ? "alert" : "status"}
      >
        {workspace.errorMessage ||
          workspace.statusMessage ||
          (workspace.isLoading ? "Loading…" : "\u00a0")}
      </div>

      <div className="media-lab-cutter__grid">
        <main className="media-lab-cutter__main">
          <div className="media-lab-cutter__video-console">
            <SelectionSummary
              startSec={workspace.rangeInSec}
              endSec={workspace.rangeOutSec}
              activeEdge={workspace.activeSelectionEdge}
            />
            <section className="media-lab-cutter__player-shell">
            {workspace.sourceVideoUrl ? (
              <video
                ref={videoRef}
                className="media-lab-cutter__video"
                src={workspace.sourceVideoUrl}
                controls
                preload={workspace.activeMedia === "editing_proxy" ? "auto" : "metadata"}
                onLoadedMetadata={(event) => {
                  programmaticSeekRef.current = true;
                  event.currentTarget.currentTime = workspaceRef.current.sourcePlayheadSec;
                }}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => {
                  const controller = playbackControllerRef.current;
                  if (controller.mode === "paused") {
                    commitPlaybackController(
                      beginPlayback(
                        controller,
                        controller.resumeMode,
                        controller.previewClipId,
                      ),
                    );
                  }
                  setWorkspace((current) => ({ ...current, isPlaying: true }));
                  startPlaybackGuard();
                }}
                onPause={() => {
                  if (!playbackControllerRef.current.seekInProgress) {
                    commitPlaybackController(
                      pausePlayback(playbackControllerRef.current),
                    );
                  }
                  setWorkspace((current) => ({ ...current, isPlaying: false }));
                  stopPlaybackGuard();
                }}
                onSeeking={(event) => {
                  if (
                    programmaticSeekRef.current ||
                    scrubStateRef.current !== "idle"
                  ) {
                    return;
                  }
                  event.currentTarget.pause();
                  scrubStateRef.current = "idle";
                  commitPlaybackController(
                    nativeSeekTransition(playbackControllerRef.current),
                  );
                }}
                onSeeked={(event) => {
                  programmaticSeekRef.current = false;
                  if (scrubStateRef.current !== "idle") return;
                  const sourceTimeSec = event.currentTarget.currentTime;
                  setWorkspace((current) => ({
                    ...current,
                    sourcePlayheadSec: sourceTimeSec,
                  }));
                }}
                onError={(event) => {
                  const current = workspaceRef.current;
                  if (
                    current.activeMedia === "editing_proxy" &&
                    current.originalVideoUrl
                  ) {
                    const sourcePlayheadSec = clampSourceTime(
                      event.currentTarget.currentTime || current.sourcePlayheadSec,
                      current.sourceDurationSec,
                    );
                    event.currentTarget.pause();
                    playbackControllerRef.current = pausePlayback(
                      playbackControllerRef.current,
                    );
                    setWorkspace((state) => ({
                      ...state,
                      sourceVideoUrl: state.originalVideoUrl,
                      sourcePlayheadSec,
                      activeMedia: "original_fallback",
                      proxyState: "failed",
                      proxyMediaError: true,
                      proxyMessage: "Safari could not load the editing proxy",
                      playbackMode: "paused",
                      isPlaying: false,
                      statusMessage: "Proxy playback failed. Original fallback restored.",
                    }));
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className="media-lab-cutter__empty-player"
                onClick={() =>
                  setWorkspace((current) => ({
                    ...current,
                    sourceChooserOpen: true,
                  }))
                }
              >
                <strong>Load Video</strong>
                <span>The Cutter will reopen here without a setup screen.</span>
              </button>
            )}
            </section>
            <ActionPanel
              canAct={workspace.rangeInSec != null && workspace.rangeOutSec != null && workspace.rangeInSec < workspace.rangeOutSec}
              hasSelection={workspace.rangeInSec != null || workspace.rangeOutSec != null}
              busy={workspace.saveStatus === "saving"}
              onPreview={previewSelection}
              onCut={extract}
              onClear={clearSelection}
            />
          </div>

          <section className="media-lab-cutter__edit-bar">
            <div className="media-lab-cutter__in-readout">
              <span>SELECTION START</span>
              <strong>
                {workspace.rangeInSec == null
                  ? "—"
                  : formatSourceTime(workspace.rangeInSec)}
              </strong>
              <span>SELECTION END</span><strong>{workspace.rangeOutSec == null ? "—:—:—.---" : formatSourceTime(workspace.rangeOutSec)}</strong>
            </div>
            <div className="media-lab-cutter__key-help">
              <strong>P</strong> Preview
              <strong>E</strong> Extract Clip
              <strong>Space</strong> Play/Pause
              <strong>← →</strong> ±0.1s
            </div>
            <div className="media-lab-cutter__fine-controls">
              <button type="button" onClick={previewSelection} disabled={workspace.rangeInSec == null || workspace.rangeOutSec == null || workspace.rangeInSec >= workspace.rangeOutSec}>Preview Selection</button>
              <button type="button" onClick={extract} disabled={workspace.rangeInSec == null || workspace.rangeOutSec == null || workspace.rangeInSec >= workspace.rangeOutSec || workspace.saveStatus === "saving"}>Extract Clip</button>
              <button
                type="button"
                onClick={clearIn}
                disabled={workspace.rangeInSec == null && workspace.rangeOutSec == null}
              >
                Clear Selection
              </button>
              <button
                type="button"
                disabled={workspace.rangeInSec == null}
                onClick={() => {
                  if (workspaceRef.current.rangeInSec != null) {
                    seekSource(
                      workspaceRef.current.rangeInSec,
                      "source_navigation",
                    );
                  }
                }}
              >
                Go to In
              </button>
              <button
                type="button"
                disabled={workspace.rangeInSec == null}
                onClick={() =>
                  setWorkspace((current) => ({
                    ...current,
                    rangeInSec:
                      current.rangeInSec == null
                        ? null
                        : clampSourceTime(
                            current.rangeInSec - 0.1,
                            current.sourceDurationSec,
                          ),
                    saveStatus: "unsaved",
                  }))
                }
              >
                In −0.1
              </button>
              <button
                type="button"
                disabled={workspace.rangeInSec == null}
                onClick={() =>
                  setWorkspace((current) => ({
                    ...current,
                    rangeInSec:
                      current.rangeInSec == null
                        ? null
                        : clampSourceTime(
                            current.rangeInSec + 0.1,
                            current.sourceDurationSec,
                          ),
                    saveStatus: "unsaved",
                  }))
                }
              >
                In +0.1
              </button>
              <div className="media-lab-cutter__window-controls">
                {DETAIL_WINDOWS.map((windowDurationSec) => (
                  <button
                    type="button"
                    key={windowDurationSec}
                    className={
                      workspace.detailWindowDurationSec === windowDurationSec
                        ? "is-active"
                        : ""
                    }
                    onClick={() => {
                      reframeDetail(workspace.sourcePlayheadSec, windowDurationSec);
                      void savePreference({
                        detailWindowDurationSec: windowDurationSec,
                      }).catch(() => undefined);
                    }}
                  >
                    {windowDurationSec < 60
                      ? `${windowDurationSec}s`
                      : windowDurationSec === 60
                        ? "1m"
                        : "5m"}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => reframeDetail(workspace.sourcePlayheadSec)}
                >
                  Recenter
                </button>
              </div>
            </div>
          </section>

          <WorkingTimeline
            remainingRanges={workspace.remainingRanges}
            workingDurationSec={workspace.workingDurationSec}
            originalDurationSec={workspace.sourceDurationSec}
            sourcePlayheadSec={workspace.sourcePlayheadSec}
            activeInSec={workspace.rangeInSec}
            rangeOutSec={workspace.rangeOutSec}
            activeSelectionEdge={workspace.activeSelectionEdge}
            overviewFrames={workspace.overviewFrames}
            sourceSamples={workingSamples}
            disabled={!workspace.sourceVideoUrl}
            onSeek={seekWorking}
            onSelectRange={selectWorkingRange}
            onAdjustEdge={(edge, sourceTimeSec, phase) => {
              if (edge === "start") {
                const next = Math.min(sourceTimeSec, (workspaceRef.current.rangeOutSec ?? sourceTimeSec) - 0.04);
                setWorkspace((state) => ({ ...state, rangeInSec: Math.max(0, next), activeSelectionEdge: "start" }));
                if (phase === "end") seekSource(next, "source_navigation", { reframe: true });
              } else {
                const next = Math.max(sourceTimeSec, (workspaceRef.current.rangeInSec ?? sourceTimeSec) + 0.04);
                setWorkspace((state) => ({ ...state, rangeOutSec: Math.min(state.sourceDurationSec, next), activeSelectionEdge: "end" }));
                if (phase === "end") seekSource(next, "source_navigation", { reframe: true });
              }
            }}
          />

          <AroundPlayheadTranscript
            segments={aroundPlayheadTranscript}
            allSegments={workspace.transcriptSegments}
            sourcePlayheadSec={workspace.sourcePlayheadSec}
            onSeek={(sourceTimeSec) =>
              seekSource(sourceTimeSec, "source_navigation", { reframe: true })
            }
          />
        </main>

        <ExtractedClipsPanel
          clips={workspace.extractedClips}
          selectedClipId={workspace.selectedClipId}
          transcriptSegments={workspace.transcriptSegments}
          overviewFrames={workspace.overviewFrames}
          disabled={workspace.saveStatus === "saving" || workspace.sourceChanged}
          onSelect={selectClip}
          onPreview={previewClip}
          onReturn={returnToTimeline}
          onUpdate={updateClip}
          onTranscriptSeek={(sourceTimeSec) =>
            seekSource(sourceTimeSec, "source_navigation", { reframe: true })
          }
        />
      </div>
    </section>
  );
}

function pointerPosition(
  event: ReactPointerEvent<HTMLElement>,
  element: HTMLElement,
): number {
  const bounds = element.getBoundingClientRect();
  if (bounds.width <= 0) return 0;
  return Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
}

function SelectionSummary({ startSec, endSec, activeEdge }: { startSec: number | null; endSec: number | null; activeEdge: "start" | "end" | null }) {
  const duration = startSec != null && endSec != null && endSec > startSec ? endSec - startSec : null;
  return <aside className="media-lab-cutter__selection-summary" aria-label="Selection summary">
    <div><span>START</span><strong>{formatOperatorTime(startSec ?? Number.NaN)}</strong></div>
    <div><span>END</span><strong>{formatOperatorTime(endSec ?? Number.NaN)}</strong></div>
    <div className="is-duration"><span>CLIP LENGTH</span><strong>{formatOperatorDuration(duration ?? Number.NaN)}</strong></div>
    <em>{activeEdge === "start" ? "TRIMMING START" : activeEdge === "end" ? "TRIMMING END" : "NO EDGE SELECTED"}</em>
  </aside>;
}

function ActionPanel({ canAct, hasSelection, busy, onPreview, onCut, onClear }: { canAct: boolean; hasSelection: boolean; busy: boolean; onPreview: () => void; onCut: () => void; onClear: () => void }) {
  return <aside className="media-lab-cutter__action-panel" aria-label="Clip actions">
    <button type="button" className="is-preview" disabled={!canAct || busy} onClick={onPreview}>PREVIEW CLIP</button>
    <button type="button" className="is-cut" disabled={!canAct || busy} onClick={onCut}>{busy ? "CUTTING…" : "CUT CLIP"}</button>
    <button type="button" className="is-clear" disabled={!hasSelection || busy} onClick={onClear}>CLEAR SELECTION</button>
  </aside>;
}

function TimingPanel({
  sourcePlayheadSec,
  workingPlayheadSec,
  outsideWorking,
  activeInSec,
  rangeOutSec,
  activeSelectionEdge,
}: {
  sourcePlayheadSec: number;
  workingPlayheadSec: number;
  outsideWorking: boolean;
  activeInSec: number | null;
  rangeOutSec: number | null;
  activeSelectionEdge: "start" | "end" | null;
}) {
  const selected = activeInSec != null && rangeOutSec != null ? rangeOutSec - activeInSec : null;
  const rangeStatus = activeInSec == null && rangeOutSec == null ? "EMPTY" : activeInSec == null ? "OUT ONLY" : rangeOutSec == null ? "IN ONLY" : activeInSec < rangeOutSec ? "VALID" : "REVERSED";
  return (
    <section className="media-lab-cutter__timing-panel" aria-label="Cutter timing">
      <div className="media-lab-cutter__timing-metric is-source"><span>SOURCE PLAYHEAD</span><strong>{formatSourceTime(sourcePlayheadSec)}</strong></div>
      <div className="media-lab-cutter__timing-metric"><span>WORKING PLAYHEAD</span><strong>{formatSourceTime(workingPlayheadSec)}</strong>{outsideWorking ? <em>OUTSIDE WORKING TIMELINE</em> : null}</div>
      <div className="media-lab-cutter__timing-metric"><span>SELECTION START</span><strong>{activeInSec == null ? "—:—:—.---" : formatSourceTime(activeInSec)}</strong></div>
      <div className="media-lab-cutter__timing-metric"><span>SELECTED</span><strong>{selected == null || selected <= 0 ? "—:—:—.---" : formatSourceTime(selected)}</strong><em>ACTIVE EDGE · {activeSelectionEdge?.toUpperCase() ?? "NONE"}</em></div>
      <div className="media-lab-cutter__timing-metric"><span>SELECTION END</span><strong>{rangeOutSec == null ? "—:—:—.---" : formatSourceTime(rangeOutSec)}</strong></div>
    </section>
  );
}

const TimelineRuler = memo(function TimelineRuler({
  startSec, endSec, playheadSec, activeInSec, working = false,
}: { startSec: number; endSec: number; playheadSec: number; activeInSec?: number | null; working?: boolean }) {
  const duration = Math.max(0.001, endSec - startSec);
  const position = (seconds: number) => Math.max(0, Math.min(1, (seconds - startSec) / duration));
  const ticks = generateRulerTicks(startSec, endSec, 800, 62, working ? [60, 120, 300, 600, 900] : [1, 5, 10, 60]);
  return <div className={`media-lab-cutter__ruler${working ? " is-working" : ""}`} aria-label={working ? "Working time ruler" : "Source time ruler"}>
    {ticks.map((tick, index) => <span key={`${tick.seconds}-${index}`} className="media-lab-cutter__ruler-tick" style={{ left: `${tick.position * 100}%` }}><i /><b>{tick.label}</b></span>)}
    {activeInSec != null && !working && activeInSec >= startSec && activeInSec <= endSec ? <span className="media-lab-cutter__ruler-in" style={{ left: `${position(activeInSec) * 100}%` }}>I</span> : null}
    <span className="media-lab-cutter__ruler-playhead" style={{ left: `${position(playheadSec) * 100}%` }} />
  </div>;
});

function TimelineFilmstrip({
  frames,
}: {
  frames: Array<ThumbnailFrame & { sampleSec?: number }>;
}) {
  return (
    <div className="media-lab-cutter__filmstrip" aria-hidden>
      {frames.length > 0 ? (
        frames.map((frame, index) => (
          <img
            key={`${frame.sampleSec ?? frame.sec}-${frame.sec}-${index}`}
            src={frame.url}
            alt=""
            draggable={false}
          />
        ))
      ) : (
        <span>Filmstrip loading…</span>
      )}
    </div>
  );
}

const DetailTimeline = memo(function DetailTimeline({
  range,
  sourceDurationSec,
  sourcePlayheadSec,
  activeInSec,
  rangeOutSec,
  extractedClips,
  frames,
  disabled,
  onSeek,
}: {
  range: SourceRange;
  sourceDurationSec: number;
  sourcePlayheadSec: number;
  activeInSec: number | null;
  rangeOutSec: number | null;
  extractedClips: CutterClip[];
  frames: ThumbnailFrame[];
  disabled: boolean;
  onSeek: (position: number, phase: ScrubPhase) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const duration = Math.max(0.001, range.sourceEndSec - range.sourceStartSec);
  const position = (sourceTimeSec: number) =>
    Math.max(
      0,
      Math.min(1, (sourceTimeSec - range.sourceStartSec) / duration),
    );
  const handlePointer = (
    event: ReactPointerEvent<HTMLDivElement>,
    phase: ScrubPhase,
  ) => {
    if (disabled || !trackRef.current) return;
    onSeek(pointerPosition(event, trackRef.current), phase);
  };
  const selectionStart = activeInSec != null && rangeOutSec != null ? Math.min(activeInSec, rangeOutSec) : activeInSec;
  const selectionEnd = activeInSec != null && rangeOutSec != null ? Math.max(activeInSec, rangeOutSec) : rangeOutSec;

  return (
    <section className="media-lab-cutter__timeline media-lab-cutter__detail">
      <header>
        <div>
          <strong>DETAIL WINDOW · {range.sourceEndSec - range.sourceStartSec >= 60 ? `${Math.round(range.sourceEndSec - range.sourceStartSec) / 60} MIN` : `${Math.round(range.sourceEndSec - range.sourceStartSec)} SEC`}</strong>
          <span>Source time · fine scrub</span>
        </div>
        <span>
          {formatSourceTime(range.sourceStartSec)} →{" "}
          {formatSourceTime(range.sourceEndSec)}
        </span>
      </header>
      <TimelineRuler startSec={range.sourceStartSec} endSec={range.sourceEndSec} playheadSec={sourcePlayheadSec} activeInSec={activeInSec} />
      <div
        ref={trackRef}
        className={`media-lab-cutter__timeline-track${disabled ? " is-disabled" : ""}`}
        role="slider"
        aria-label="Detail source timeline"
        aria-valuemin={range.sourceStartSec}
        aria-valuemax={range.sourceEndSec || sourceDurationSec}
        aria-valuenow={sourcePlayheadSec}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={(event) => {
          if (disabled) return;
          draggingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          handlePointer(event, "start");
        }}
        onPointerMove={(event) => {
          if (draggingRef.current) handlePointer(event, "move");
        }}
        onPointerUp={(event) => {
          if (!draggingRef.current) return;
          handlePointer(event, "end");
          draggingRef.current = false;
        }}
        onPointerCancel={(event) => {
          if (draggingRef.current) handlePointer(event, "cancel");
          draggingRef.current = false;
        }}
      >
        <TimelineFilmstrip frames={frames} />
        {extractedClips.map((clip) => {
          const start = Math.max(clip.sourceInSec, range.sourceStartSec);
          const end = Math.min(clip.sourceOutSec, range.sourceEndSec);
          return end > start ? (
            <span
              key={clip.id}
              className="media-lab-cutter__extracted-overlay"
              style={{
                left: `${position(start) * 100}%`,
                width: `${(position(end) - position(start)) * 100}%`,
              }}
              title={`Extracted: ${clip.title}`}
            />
          ) : null;
        })}
        {selectionStart != null &&
        selectionEnd != null &&
        selectionEnd >= range.sourceStartSec &&
        selectionStart <= range.sourceEndSec ? (
          <span
            className="media-lab-cutter__pending-range"
            style={{
              left: `${position(Math.max(selectionStart, range.sourceStartSec)) * 100}%`,
              width: `${
                (position(Math.min(selectionEnd, range.sourceEndSec)) -
                  position(Math.max(selectionStart, range.sourceStartSec))) *
                100
              }%`,
            }}
          />
        ) : null}
        {activeInSec != null &&
        activeInSec >= range.sourceStartSec &&
        activeInSec <= range.sourceEndSec ? (
          <span
            className="media-lab-cutter__in-marker"
            style={{ left: `${position(activeInSec) * 100}%` }}
          >
            I
          </span>
        ) : null}
        {rangeOutSec != null && rangeOutSec >= range.sourceStartSec && rangeOutSec <= range.sourceEndSec ? <span className="media-lab-cutter__out-marker" style={{ left: `${position(rangeOutSec) * 100}%` }}>O</span> : null}
        <span
          className="media-lab-cutter__playhead"
          style={{ left: `${position(sourcePlayheadSec) * 100}%` }}
        />
      </div>
    </section>
  );
});

function nearestFrame(
  frames: ThumbnailFrame[],
  sourceTimeSec: number,
): ThumbnailFrame | null {
  let nearest: ThumbnailFrame | null = null;
  let distance = Number.POSITIVE_INFINITY;
  for (const frame of frames) {
    const candidateDistance = Math.abs(frame.sec - sourceTimeSec);
    if (candidateDistance < distance) {
      nearest = frame;
      distance = candidateDistance;
    }
  }
  return nearest;
}

const WorkingTimeline = memo(function WorkingTimeline({
  remainingRanges,
  workingDurationSec,
  originalDurationSec,
  sourcePlayheadSec,
  activeInSec,
  rangeOutSec,
  activeSelectionEdge,
  overviewFrames,
  sourceSamples,
  disabled,
  onSeek,
  onSelectRange,
  onAdjustEdge,
}: {
  remainingRanges: SourceRange[];
  workingDurationSec: number;
  originalDurationSec: number;
  sourcePlayheadSec: number;
  activeInSec: number | null;
  rangeOutSec: number | null;
  activeSelectionEdge: "start" | "end" | null;
  overviewFrames: ThumbnailFrame[];
  sourceSamples: number[];
  disabled: boolean;
  onSeek: (position: number, phase: ScrubPhase) => void;
  onSelectRange: (startSec: number, endSec: number, edge: "start" | "end") => void;
  onAdjustEdge: (edge: "start" | "end", sourceTimeSec: number, phase: "start" | "move" | "end") => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<TimelineViewport>(() => fitTimeline(workingDurationSec));
  useEffect(() => setViewport((current) => current.endWorkingSec <= current.startWorkingSec || current.endWorkingSec > workingDurationSec ? fitTimeline(workingDurationSec) : current), [workingDurationSec]);
  const draggingRef = useRef(false);
  const selectionDragRef = useRef<{ anchor: number; startClientX: number; moved: boolean } | null>(null);
  const edgeDragRef = useRef<"start" | "end" | null>(null);
  const filmstripFrames = sourceSamples.flatMap((sourceTimeSec) => {
    const frame = nearestFrame(
      overviewFrames.filter((candidate) =>
        Boolean(
          identifyRangeContainingSourceTime(candidate.sec, remainingRanges),
        ),
      ),
      sourceTimeSec,
    );
    return frame ? [{ ...frame, sampleSec: sourceTimeSec }] : [];
  });
  const playheadPosition = sourceTimeToWorkingPointerPosition(
    sourcePlayheadSec,
    remainingRanges,
  );
  const inPosition =
    activeInSec == null
      ? null
      : sourceTimeToWorkingPointerPosition(activeInSec, remainingRanges);
  const joins: number[] = [];
  let workingCursor = 0;
  remainingRanges.forEach((range, index) => {
    workingCursor += range.sourceEndSec - range.sourceStartSec;
    if (index < remainingRanges.length - 1 && workingDurationSec > 0) {
      joins.push(workingCursor / workingDurationSec);
    }
  });

  const handlePointer = (
    event: ReactPointerEvent<HTMLDivElement>,
    phase: ScrubPhase,
  ) => {
    if (disabled || !trackRef.current) return;
    onSeek(pointerPosition(event, trackRef.current), phase);
  };
  const handleSelectionPointer = (event: ReactPointerEvent<HTMLElement>, phase: ScrubPhase) => {
    if (disabled || !trackRef.current) return;
    const workingPosition = pointerPosition(event, trackRef.current);
    const visibleWorking = viewport.startWorkingSec + workingPosition * (viewport.endWorkingSec - viewport.startWorkingSec);
    const sourceTime = workingPointerPositionToSourceTime(workingDurationSec <= 0 ? 0 : visibleWorking / workingDurationSec, remainingRanges);
    if (phase === "start") {
      event.stopPropagation();
      selectionDragRef.current = { anchor: sourceTime, startClientX: event.clientX, moved: false };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    const drag = selectionDragRef.current;
    if (!drag) return;
    if (phase === "move") {
      event.stopPropagation();
      if (Math.abs(event.clientX - drag.startClientX) >= WORKING_DRAG_THRESHOLD_PX) drag.moved = true;
      return;
    }
    if (phase === "end") {
      event.stopPropagation();
      selectionDragRef.current = null;
      if (drag.moved) onSelectRange(drag.anchor, sourceTime, sourceTime >= drag.anchor ? "end" : "start");
      else onSeek(pointerPosition(event, trackRef.current), "end");
    }
  };
  const toViewportPosition = (sourceTimeSec: number) => {
    const working = sourceTimeToWorkingTime(sourceTimeSec, remainingRanges);
    return viewport.endWorkingSec <= viewport.startWorkingSec ? 0 : Math.max(0, Math.min(1, (working - viewport.startWorkingSec) / (viewport.endWorkingSec - viewport.startWorkingSec)));
  };
  const startPosition = activeInSec == null ? null : toViewportPosition(activeInSec);
  const endPosition = rangeOutSec == null ? null : toViewportPosition(rangeOutSec);
  const visiblePlayheadPosition = toViewportPosition(sourcePlayheadSec);
  const handleEdgePointer = (event: ReactPointerEvent<HTMLButtonElement>, edge: "start" | "end", phase: "start" | "move" | "end") => {
    event.stopPropagation();
    if (phase === "start") {
      edgeDragRef.current = edge;
      event.currentTarget.setPointerCapture(event.pointerId);
    } else if (edgeDragRef.current !== edge) return;
    if (trackRef.current) {
      const visibleWorking = viewport.startWorkingSec + pointerPosition(event, trackRef.current) * (viewport.endWorkingSec - viewport.startWorkingSec);
      onAdjustEdge(edge, workingPointerPositionToSourceTime(workingDurationSec <= 0 ? 0 : visibleWorking / workingDurationSec, remainingRanges), phase);
    }
    if (phase === "end") edgeDragRef.current = null;
  };

  return (
    <section className="media-lab-cutter__timeline media-lab-cutter__working">
      <header>
        <div>
          <strong>Working Timeline</strong>
          <span>WORKING TIMELINE · Drag to select a clip</span>
        </div>
        <div className="media-lab-cutter__duration-pair">
          <strong>Remaining {formatCompactDuration(workingDurationSec)}</strong>
          <span>Extracted {formatCompactDuration(Math.max(0, originalDurationSec - workingDurationSec))}</span>
          <span>Original {formatCompactDuration(originalDurationSec)}</span>
        </div>
      </header>
      <div className="media-lab-cutter__viewport-controls"><button type="button" onClick={() => setViewport(fitTimeline(workingDurationSec))}>FIT</button>{[[300, "5 MIN"], [60, "1 MIN"], [30, "30 SEC"], [10, "10 SEC"]].map(([seconds, label]) => <button type="button" key={label} onClick={() => { const edge = activeSelectionEdge === "start" ? activeInSec : activeSelectionEdge === "end" ? rangeOutSec : sourcePlayheadSec; setViewport(edge == null ? fitTimeline(workingDurationSec) : edgeFocusViewport(sourceTimeToWorkingTime(edge, remainingRanges), Number(seconds), workingDurationSec)); }}>{label}</button>)}</div>
      <TimelineRuler startSec={viewport.startWorkingSec} endSec={viewport.endWorkingSec} playheadSec={sourceTimeToWorkingTime(sourcePlayheadSec, remainingRanges)} working />
      <div
        ref={trackRef}
        className={`media-lab-cutter__timeline-track${disabled ? " is-disabled" : ""}`}
        role="slider"
        aria-label="Working timeline"
        aria-valuemin={0}
        aria-valuemax={workingDurationSec}
        aria-valuenow={sourceTimeToWorkingTime(sourcePlayheadSec, remainingRanges)}
        tabIndex={disabled ? -1 : 0}
      >
        <TimelineFilmstrip frames={filmstripFrames} />
        {startPosition != null && endPosition != null ? <span className="media-lab-cutter__selection-body" style={{ left: `${Math.min(startPosition, endPosition) * 100}%`, width: `${Math.abs(endPosition - startPosition) * 100}%` }} /> : null}
        {joins.map((join) => (
          <span
            key={join}
            className="media-lab-cutter__join"
            style={{ left: `${join * 100}%` }}
            title="Virtual ripple join"
          >
            <i />
          </span>
        ))}
        {inPosition != null ? (
          <span
            className="media-lab-cutter__in-marker"
            style={{ left: `${inPosition * 100}%` }}
          >
            I
          </span>
        ) : null}
        {startPosition != null ? <button type="button" aria-label="Drag selection start" className={`media-lab-cutter__selection-handle is-start${activeSelectionEdge === "start" ? " is-active" : ""}`} style={{ left: `${startPosition * 100}%` }} onPointerDown={(event) => handleEdgePointer(event, "start", "start")} onPointerMove={(event) => handleEdgePointer(event, "start", "move")} onPointerUp={(event) => handleEdgePointer(event, "start", "end")} onPointerCancel={() => { edgeDragRef.current = null; }}>START</button> : null}
        {endPosition != null ? <button type="button" aria-label="Drag selection end" className={`media-lab-cutter__selection-handle is-end${activeSelectionEdge === "end" ? " is-active" : ""}`} style={{ left: `${endPosition * 100}%` }} onPointerDown={(event) => handleEdgePointer(event, "end", "start")} onPointerMove={(event) => handleEdgePointer(event, "end", "move")} onPointerUp={(event) => handleEdgePointer(event, "end", "end")} onPointerCancel={() => { edgeDragRef.current = null; }}>END</button> : null}
        <span
          className="media-lab-cutter__playhead"
          style={{ left: `${visiblePlayheadPosition * 100}%` }}
        />
        <span className="media-lab-cutter__selection-capture" onPointerDown={(event) => handleSelectionPointer(event, "start")} onPointerMove={(event) => handleSelectionPointer(event, "move")} onPointerUp={(event) => handleSelectionPointer(event, "end")} onPointerCancel={() => { selectionDragRef.current = null; }} />
      </div>
    </section>
  );
});

const AroundPlayheadTranscript = memo(function AroundPlayheadTranscript({
  segments,
  allSegments,
  sourcePlayheadSec,
  onSeek,
}: {
  segments: CutterTranscriptSegment[];
  allSegments: CutterTranscriptSegment[];
  sourcePlayheadSec: number;
  onSeek: (sourceTimeSec: number) => void;
}) {
  if (allSegments.length === 0) return null;
  return (
    <details className="media-lab-cutter__transcript-context">
      <summary>
        Around playhead · {formatSourceTime(sourcePlayheadSec)}
      </summary>
      <div>
        {segments.map((segment, index) => (
          <button
            type="button"
            key={`${segment.start}-${index}`}
            onClick={() => onSeek(segment.start)}
          >
            <time>{formatSourceTime(segment.start)}</time>
            <span>{segment.text}</span>
          </button>
        ))}
      </div>
    </details>
  );
});

const ExtractedClipsPanel = memo(function ExtractedClipsPanel({
  clips,
  selectedClipId,
  transcriptSegments,
  overviewFrames,
  disabled,
  onSelect,
  onPreview,
  onReturn,
  onUpdate,
  onTranscriptSeek,
}: {
  clips: CutterClip[];
  selectedClipId: string | null;
  transcriptSegments: CutterTranscriptSegment[];
  overviewFrames: ThumbnailFrame[];
  disabled: boolean;
  onSelect: (clipId: string) => void;
  onPreview: (clipId: string) => void;
  onReturn: (clipId: string) => void;
  onUpdate: (
    clipId: string,
    patch: { title?: string; includeForExport?: boolean; notes?: string },
  ) => void;
  onTranscriptSeek: (sourceTimeSec: number) => void;
}) {
  const transcriptById = useMemo(
    () =>
      new Map(
        transcriptSegments.map((segment, index) => [
          transcriptSegmentId(segment, index),
          segment,
        ]),
      ),
    [transcriptSegments],
  );
  return (
    <aside className="media-lab-cutter__clips" aria-label="Extracted Clips">
      <header>
        <div>
          <span>EXTRACTED CLIPS</span>
          <strong>{clips.length}</strong>
        </div>
        <div className="media-lab-cutter__clips-summary"><span>CLIPS <b>{clips.length}</b></span><span>TOTAL EXTRACTED <b>{formatCompactDuration(clips.reduce((total, clip) => total + clip.durationSec, 0))}</b></span><span>SELECTED FOR EXPORT <b>{clips.filter((clip) => clip.includeForExport).length}</b></span><span>SELECTED DURATION <b>{formatCompactDuration(clips.filter((clip) => clip.includeForExport).reduce((total, clip) => total + clip.durationSec, 0))}</b></span></div>
      </header>
      <div className="media-lab-cutter__clip-list">
        {clips.length === 0 ? (
          <div className="media-lab-cutter__clips-empty">
            <strong>No clips extracted</strong>
            <span>Scrub, press I, move to the end, then press O.</span>
          </div>
        ) : (
          clips.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              selected={clip.id === selectedClipId}
              thumbnail={nearestFrame(overviewFrames, clip.sourceInSec)}
              transcriptById={transcriptById}
              disabled={disabled}
              onSelect={onSelect}
              onPreview={onPreview}
              onReturn={onReturn}
              onUpdate={onUpdate}
              onTranscriptSeek={onTranscriptSeek}
            />
          ))
        )}
      </div>
    </aside>
  );
});

function ClipCard({
  clip,
  selected,
  thumbnail,
  transcriptById,
  disabled,
  onSelect,
  onPreview,
  onReturn,
  onUpdate,
  onTranscriptSeek,
}: {
  clip: CutterClip;
  selected: boolean;
  thumbnail: ThumbnailFrame | null;
  transcriptById: Map<string, CutterTranscriptSegment>;
  disabled: boolean;
  onSelect: (clipId: string) => void;
  onPreview: (clipId: string) => void;
  onReturn: (clipId: string) => void;
  onUpdate: (
    clipId: string,
    patch: { title?: string; includeForExport?: boolean; notes?: string },
  ) => void;
  onTranscriptSeek: (sourceTimeSec: number) => void;
}) {
  const [draftTitle, setDraftTitle] = useState(clip.title);
  useEffect(() => setDraftTitle(clip.title), [clip.title]);
  const transcriptLines = clip.transcriptSegmentIds.flatMap((id) => {
    const segment = transcriptById.get(id);
    return segment ? [segment] : [];
  });
  return (
    <article
      className={`media-lab-cutter__clip-card${selected ? " is-selected" : ""}`}
      onClick={() => onSelect(clip.id)}
    >
      <div className="media-lab-cutter__clip-number">
        {String(clip.sequence).padStart(2, "0")}
      </div>
      <div className="media-lab-cutter__clip-thumb">
        {thumbnail ? <img src={thumbnail.url} alt="" draggable={false} /> : <span />}
      </div>
      <div className="media-lab-cutter__clip-content">
        <input
          aria-label={`Title for clip ${clip.sequence}`}
          value={draftTitle}
          disabled={disabled}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => setDraftTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onUpdate(clip.id, { title: draftTitle });
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setDraftTitle(clip.title);
              event.currentTarget.blur();
            }
          }}
          onBlur={() => setDraftTitle(clip.title)}
        />
        <span className="media-lab-cutter__clip-duration-label">DURATION</span>
        <strong className="media-lab-cutter__clip-duration">{formatCompactDuration(clip.durationSec)}</strong>
        {isLongClip(clip.durationSec) ? <span className="media-lab-cutter__long-clip-warning">LONG CLIP — REVIEW BOUNDARY</span> : null}
        <div className="media-lab-cutter__clip-timecodes">
          <span>SOURCE</span>
          <span>{formatSourceTime(clip.sourceInSec)}</span>
          <span>→</span>
          <span>{formatSourceTime(clip.sourceOutSec)}</span>
          <strong>{formatCompactDuration(clip.durationSec)}</strong>
        </div>
        {clip.transcriptExcerpt ? (
          <p>{clip.transcriptExcerpt}</p>
        ) : (
          <p className="is-muted">No overlapping transcript text.</p>
        )}
        <div className="media-lab-cutter__clip-actions">
          <label onClick={(event) => event.stopPropagation()}>
            <input
              type="checkbox"
              checked={clip.includeForExport}
              disabled={disabled}
              onChange={(event) =>
                onUpdate(clip.id, { includeForExport: event.target.checked })
              }
            />
            Include for Export
          </label>
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onPreview(clip.id);
            }}
          >
            Preview
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onReturn(clip.id);
            }}
          >
            Return to Timeline
          </button>
        </div>
        {transcriptLines.length > 0 ? (
          <details onClick={(event) => event.stopPropagation()}>
            <summary>Transcript · {clip.transcriptCoverage}</summary>
            {transcriptLines.map((segment, index) => (
              <button
                type="button"
                key={`${segment.start}-${index}`}
                onClick={() => onTranscriptSeek(segment.start)}
              >
                <time>{formatSourceTime(segment.start)}</time>
                <span>{segment.text}</span>
              </button>
            ))}
          </details>
        ) : null}
      </div>
    </article>
  );
}
