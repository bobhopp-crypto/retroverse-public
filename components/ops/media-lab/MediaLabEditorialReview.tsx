"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MediaLabChapterMode } from "@/lib/ops/media-lab/chapter-mode";
import type { TranscriptSegment } from "@/lib/ops/media-lab/build-chapters-from-segments";
import type { EditorialChapterRow } from "@/lib/ops/media-lab/editorial/editorial-types";
import type { MergeSuggestion } from "@/lib/ops/media-lab/editorial/merge-suggestions";
import type { ClipOcrInput } from "@/lib/ops/media-lab/editorial/transcript-suggestions";
import {
  displayNameFromTitle,
  normalizeNameKey,
  regenerateClipName,
} from "@/lib/ops/media-lab/editorial/name-regeneration";
import {
  formatTypedTitle,
  parseTypedTitle,
  suggestClipTag,
  type ContentType,
} from "@/lib/ops/media-lab/editorial/transcript-suggestions";
import {
  summarizeClipReviewCounts,
  type ClipReviewStatus,
  type SourceReviewStatus,
  SOURCE_REVIEW_STATUSES,
} from "@/lib/ops/media-lab/editorial/review-status";
import {
  filterChapterIds,
  type EditorialReviewFilter,
} from "@/lib/ops/media-lab/editorial/filters";
import {
  computeChapterReviewFlags,
  summarizeReviewMetrics,
} from "@/lib/ops/media-lab/editorial/review-metrics";
import { suggestAdjacentMerges } from "@/lib/ops/media-lab/editorial/merge-suggestions";
import { formatChapterClock, secToTimecode } from "@/lib/ops/media-lab/chapter-time";

import { ClipTimeline } from "./ClipTimeline";
import { ChapterFilmstrip } from "./ChapterFilmstrip";
import { ChapterThumbTriplet } from "./ChapterThumbTriplet";
import { selectionLengthSeconds, type ClipSelectionState } from "./ClipSelectionPanel";
import { ClipTranscriptStrip, TranscriptModeControls, type TranscriptStripMode } from "./ClipTranscriptStrip";
import { EditorialChapterTags } from "./EditorialChapterTags";
import { curatorCategoryForKey } from "./curator-categories";
import { FocusReviewDeck } from "./FocusReviewDeck";
import { HarvestExportConflictModal } from "./HarvestExportConflictModal";
import { MediaLabMobileReview } from "./MediaLabMobileReview";
import { useEditorialChapterOcr } from "./useEditorialChapterOcr";
import { useMediaLabMobileReview } from "./useMediaLabMobileReview";
import { useEditorialTableThumbnails } from "./useEditorialTableThumbnails";

type EditorialBundleResponse = {
  ok?: boolean;
  error?: string;
  chapters?: EditorialChapterRow[];
  suggestions?: MergeSuggestion[];
  videoUrl?: string | null;
  chapterMode?: MediaLabChapterMode;
  reviewMetrics?: {
    totalClips: number;
    under15Sec: number;
    sameBrandNeighbor: number;
    mergeEligible: number;
  };
  job?: {
    durationSeconds: number | null;
    chapterCount: number;
    sourceFilename?: string;
  };
  segments?: TranscriptSegment[];
  sourceReviewStatus?: SourceReviewStatus;
  clipAssetsDir?: string;
  sourceArchiveDir?: string;
  assetRoutes?: { contentType: string; folder: string; path: string }[];
};

type MediaLabEditorialReviewProps = {
  year: number;
  jobSlug: string;
  outputDir: string;
  chapterMode: MediaLabChapterMode;
  workstationMode?: boolean;
  onOpenSetup?: () => void;
  onNotice?: (message: string) => void;
  onError?: (message: string) => void;
  onExported?: (patch: {
    chaptersPreview?: { start: string; end: string; title: string; clock?: string }[];
    job?: { chapterCount: number; segmentLabelCount?: number };
  }) => void;
};

type HarvestDuplicateAction = "skip" | "replace" | "replace_all";

type HarvestExportConflict = {
  exportedPath: string;
  title: string;
  type: string;
};

function formatDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function humanizeJobSlug(slug: string): string {
  return slug
    .replace(/-\d{4}-\d{2}-\d{2}T[\d-]+$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const MIN_CLIP_SEC = 1;

function patchChapterRow(
  ch: EditorialChapterRow,
  patch: { startSec?: number; endSec?: number },
  segments: TranscriptSegment[] = [],
  ocr?: ClipOcrInput | null,
): EditorialChapterRow {
  const startSec = patch.startSec ?? ch.startSec;
  const endSec = patch.endSec ?? ch.endSec;
  const row: EditorialChapterRow = {
    ...ch,
    startSec,
    endSec,
    start: secToTimecode(startSec),
    end: secToTimecode(endSec),
    durationSec: Math.round((endSec - startSec) * 10) / 10,
    clock: formatChapterClock(startSec),
  };
  if (segments.length > 0) {
    row.tagSuggestion = suggestClipTag(row, segments, ocr);
  }
  return row;
}

export function MediaLabEditorialReview(props: MediaLabEditorialReviewProps) {
  const [chapters, setChapters] = useState<EditorialChapterRow[]>([]);
  const [suggestions, setSuggestions] = useState<MergeSuggestion[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<EditorialReviewFilter>("all");
  const [mergeTitle, setMergeTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [titleAcceptedById, setTitleAcceptedById] = useState<Record<string, boolean>>({});
  const [nameHistoryById, setNameHistoryById] = useState<Record<string, string[]>>({});
  const [nameRegenCountById, setNameRegenCountById] = useState<Record<string, number>>({});
  const [harvestConflicts, setHarvestConflicts] = useState<HarvestExportConflict[] | null>(null);
  const [harvestRefreshKey, setHarvestRefreshKey] = useState(0);
  const [queueCloseSignal, setQueueCloseSignal] = useState(0);
  const [reviewMetrics, setReviewMetrics] = useState<
    EditorialBundleResponse["reviewMetrics"] | null
  >(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [splitId, setSplitId] = useState<string | null>(null);
  const [splitAtSec, setSplitAtSec] = useState("");
  const [playheadSec, setPlayheadSec] = useState(0);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [sourceReviewStatus, setSourceReviewStatus] = useState<SourceReviewStatus | undefined>();
  const [clipAssetsDirPath, setClipAssetsDirPath] = useState("");
  const [sourceArchiveDirPath, setSourceArchiveDirPath] = useState("");
  const [assetRoutes, setAssetRoutes] = useState<
    { contentType: string; folder: string; path: string }[]
  >([]);
  const [mobileCardIndex, setMobileCardIndex] = useState(0);
  const [focusMode, setFocusMode] = useState(true);
  const [transcriptMode, setTranscriptMode] = useState<TranscriptStripMode>("live");
  const [draftSelection, setDraftSelection] = useState<ClipSelectionState>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sourceFilename, setSourceFilename] = useState("");
  const [showDurationSec, setShowDurationSec] = useState(0);
  const mobileReview = useMediaLabMobileReview();
  const videoRef = useRef<HTMLVideoElement>(null);
  const trimWasPlayingRef = useRef(false);
  const chapterUndoRef = useRef<{ chapters: EditorialChapterRow[]; previewId: string | null }[]>(
    [],
  );
  const [timelineFlashIds, setTimelineFlashIds] = useState<string[]>([]);
  const timelineFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const transcriptPreview = useMemo(() => {
    if (segments.length === 0) return "";
    return segments
      .map((s) => s.text)
      .join(" ")
      .trim()
      .slice(0, 1200);
  }, [segments]);

  const load = useCallback(async (resumePreviewId?: string | null) => {
    setBusy("load");
    try {
      const res = await fetch(
        `/api/ops/media-lab/editorial?year=${props.year}&jobSlug=${encodeURIComponent(props.jobSlug)}`,
      );
      const data = (await res.json()) as EditorialBundleResponse;
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load editorial review");
      }
      setChapters(data.chapters ?? []);
      setSuggestions(data.suggestions ?? []);
      setVideoUrl(data.videoUrl ?? null);
      setReviewMetrics(data.reviewMetrics ?? null);
      setSourceFilename(data.job?.sourceFilename ?? "");
      setShowDurationSec(
        data.job?.durationSeconds ??
          (data.chapters?.length ? data.chapters[data.chapters.length - 1].endSec : 0),
      );
      setSegments(data.segments ?? []);
      setSourceReviewStatus(data.sourceReviewStatus);
      setClipAssetsDirPath(data.clipAssetsDir ?? "");
      setSourceArchiveDirPath(data.sourceArchiveDir ?? "");
      setAssetRoutes(data.assetRoutes ?? []);
      setDirty(false);
      setSelected(new Set());
      setTitleAcceptedById({});
      chapterUndoRef.current = [];
      const keepPreviewId = resumePreviewId ?? null;
      const first = data.chapters?.[0];
      if (first) {
        const nextPreviewId =
          keepPreviewId && data.chapters?.some((c) => c.id === keepPreviewId)
            ? keepPreviewId
            : first.id;
        setPreviewId(nextPreviewId);
        setSplitId(null);
      }
      videoRef.current?.pause();
    } catch (e) {
      props.onError?.(e instanceof Error ? e.message : "Load failed");
    } finally {
      setBusy(null);
    }
  }, [props]);

  useEffect(() => {
    void load();
  }, [load]);

  const flagMap = useMemo(() => {
    const m = new Map<string, NonNullable<EditorialChapterRow["reviewFlags"]>>();
    for (const ch of chapters) {
      if (ch.reviewFlags) m.set(ch.id, ch.reviewFlags);
    }
    return m;
  }, [chapters]);

  const reviewStatusMap = useMemo(() => {
    const m = new Map<string, ClipReviewStatus | undefined>();
    for (const ch of chapters) m.set(ch.id, ch.reviewStatus);
    return m;
  }, [chapters]);

  const reviewCounts = useMemo(() => summarizeClipReviewCounts(chapters), [chapters]);

  const visibleIds = useMemo(
    () => filterChapterIds(chapters, suggestions, filter, flagMap, reviewStatusMap),
    [chapters, filter, suggestions, flagMap, reviewStatusMap],
  );

  const visibleChapters = chapters.filter((c) => visibleIds.has(c.id));

  useEffect(() => {
    setMobileCardIndex(0);
  }, [filter]);

  useEffect(() => {
    if (mobileCardIndex >= visibleChapters.length) {
      setMobileCardIndex(Math.max(0, visibleChapters.length - 1));
    }
  }, [mobileCardIndex, visibleChapters.length]);

  useEffect(() => {
    if (!mobileReview) return;
    setPreviewId(null);
    setSplitId(null);
  }, [mobileReview]);

  const previewChapter = chapters.find((c) => c.id === previewId) ?? null;
  const previewNameHistory = useMemo(() => {
    if (!previewChapter) return [];
    const currentKey = normalizeNameKey(displayNameFromTitle(previewChapter.title));
    return (nameHistoryById[previewChapter.id] ?? []).filter(
      (name) => normalizeNameKey(name) !== currentKey,
    );
  }, [nameHistoryById, previewChapter]);
  const splitChapter = chapters.find((c) => c.id === splitId) ?? null;
  const reviewMode = previewId != null && splitId == null;
  const previewIndex =
    previewId != null ? chapters.findIndex((c) => c.id === previewId) : -1;
  const videoDurationSec =
    chapters.length > 0 ? chapters[chapters.length - 1].endSec : 0;

  const thumbBoundsKey = useMemo(
    () =>
      chapters
        .map((c) => `${c.id}:${c.startSec.toFixed(2)}:${c.endSec.toFixed(2)}`)
        .join("|"),
    [chapters],
  );

  const {
    thumbs: chapterThumbs,
    loading: thumbsLoading,
    error: thumbsError,
  } = useEditorialTableThumbnails({
    year: props.year,
    jobSlug: props.jobSlug,
    chapters: chapters.map(({ id, startSec, endSec }) => ({ id, startSec, endSec })),
    boundsKey: thumbBoundsKey,
    onError: (message) => props.onError?.(message),
  });

  const {
    ocr: chapterOcr,
    loading: ocrLoading,
    error: ocrError,
  } = useEditorialChapterOcr({
    year: props.year,
    jobSlug: props.jobSlug,
    chapters: chapters.map(({ id, startSec, endSec }) => ({ id, startSec, endSec })),
    boundsKey: thumbBoundsKey,
    enabled: chapters.length > 0,
    onError: (message) => props.onError?.(message),
  });

  useEffect(() => {
    if (segments.length === 0 || ocrLoading) return;
    setChapters((rows) =>
      rows.map((ch) => ({
        ...ch,
        tagSuggestion: suggestClipTag(ch, segments, chapterOcr[ch.id] ?? null),
      })),
    );
  }, [chapterOcr, ocrLoading, segments, thumbBoundsKey]);

  const adjustChapterStart = useCallback((chapterId: string, newStartSec: number) => {
    let clampedStart = newStartSec;
    setChapters((prev) => {
      const idx = prev.findIndex((c) => c.id === chapterId);
      if (idx < 0) return prev;
      const cur = prev[idx];
      const prevCh = idx > 0 ? prev[idx - 1] : null;
      const minStart = prevCh ? prevCh.startSec + MIN_CLIP_SEC : 0;
      const maxStart = cur.endSec - MIN_CLIP_SEC;
      clampedStart =
        Math.round(Math.max(minStart, Math.min(maxStart, newStartSec)) * 100) / 100;

      const next = [...prev];
      next[idx] = patchChapterRow(cur, { startSec: clampedStart }, segments);
      if (prevCh) next[idx - 1] = patchChapterRow(prevCh, { endSec: clampedStart }, segments);
      return next;
    });
    const v = videoRef.current;
    if (v && v.currentTime < clampedStart) {
      v.currentTime = clampedStart;
      setPlayheadSec(clampedStart);
    }
    setDirty(true);
  }, [segments]);

  const adjustChapterEnd = useCallback((chapterId: string, newEndSec: number) => {
    let clampedEnd = newEndSec;
    setChapters((prev) => {
      const idx = prev.findIndex((c) => c.id === chapterId);
      if (idx < 0) return prev;
      const cur = prev[idx];
      const nextCh = idx < prev.length - 1 ? prev[idx + 1] : null;
      const minEnd = cur.startSec + MIN_CLIP_SEC;
      const maxEnd = nextCh ? nextCh.endSec - MIN_CLIP_SEC : videoDurationSec;
      clampedEnd =
        Math.round(Math.max(minEnd, Math.min(maxEnd, newEndSec)) * 100) / 100;

      const next = [...prev];
      next[idx] = patchChapterRow(cur, { endSec: clampedEnd }, segments);
      if (nextCh) next[idx + 1] = patchChapterRow(nextCh, { startSec: clampedEnd }, segments);
      return next;
    });
    const v = videoRef.current;
    if (v && v.currentTime > clampedEnd) {
      v.currentTime = clampedEnd;
      v.pause();
      setPlayheadSec(clampedEnd);
    }
    setDirty(true);
  }, [segments, videoDurationSec]);

  async function persist(exportFiles: boolean) {
    if (exportFiles && reviewCounts.exportable === 0) {
      props.onError?.("Mark at least one clip Keep before exporting.");
      return;
    }
    setBusy(exportFiles ? "export" : "save");
    try {
      const res = await fetch(
        exportFiles
          ? "/api/ops/media-lab/editorial/export"
          : "/api/ops/media-lab/editorial",
        {
          method: exportFiles ? "POST" : "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            year: props.year,
            jobSlug: props.jobSlug,
            chapters: chapters.map(({ id, startSec, endSec, title }) => ({
              id,
              startSec,
              endSec,
              title,
            })),
            chapterMeta: Object.fromEntries(
              chapters
                .filter(
                  (ch) =>
                    ch.reviewStatus ||
                    ch.favorite ||
                    ch.category ||
                    ch.inSeconds != null,
                )
                .map((ch) => [
                  ch.id,
                  {
                    reviewStatus: ch.reviewStatus,
                    ...(ch.favorite ? { favorite: true } : {}),
                    ...(ch.category ? { category: ch.category } : {}),
                    ...(ch.inSeconds != null &&
                    ch.outSeconds != null &&
                    ch.lengthSeconds != null
                      ? {
                          inSeconds: ch.inSeconds,
                          outSeconds: ch.outSeconds,
                          lengthSeconds: ch.lengthSeconds,
                        }
                      : {}),
                  },
                ]),
            ),
            sourceReviewStatus: sourceReviewStatus ?? null,
          }),
        },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        exportCount?: number;
        chapterCount?: number;
        message?: string;
        sourcePath?: string | null;
        clipPaths?: string[];
        chaptersPreview?: { start: string; end: string; title: string }[];
        job?: { chapterCount: number; segmentLabelCount?: number };
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Save failed");
      }
      setDirty(false);
      props.onNotice?.(
        exportFiles
          ? data.message ??
              `Exported ${data.exportCount ?? 0} clips to ASSETS/ by type.${
                data.sourcePath ? " Source in ARCHIVE/." : ""
              }`
          : "Saved chapter edits.",
      );
      if (exportFiles) {
        props.onExported?.({
          chaptersPreview: data.chaptersPreview,
          job: data.job,
        });
      }
      videoRef.current?.pause();
      await load(previewId);
    } catch (e) {
      props.onError?.(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function refreshSuggestions() {
    setBusy("suggest");
    try {
      if (segments.length > 0) {
        refreshTranscriptHeuristics();
        props.onNotice?.("Refreshed tag + merge heuristics from segments.json.");
        return;
      }
      const res = await fetch("/api/ops/media-lab/editorial/suggest-merges", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ year: props.year, jobSlug: props.jobSlug }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        suggestions?: MergeSuggestion[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Suggestions failed");
      }
      setSuggestions(data.suggestions ?? []);
      props.onNotice?.(`Found ${data.suggestions?.length ?? 0} merge suggestions.`);
    } catch (e) {
      props.onError?.(e instanceof Error ? e.message : "Suggestions failed");
    } finally {
      setBusy(null);
    }
  }

  function refreshTranscriptHeuristics() {
    if (segments.length === 0) return;
    const editorialChapters = chapters.map(({ id, startSec, endSec, title }) => ({
      id,
      startSec,
      endSec,
      title,
    }));
    const merge = suggestAdjacentMerges(editorialChapters, segments);
    const flagMap = computeChapterReviewFlags(editorialChapters, segments, merge);
    setSuggestions(merge);
    setReviewMetrics(summarizeReviewMetrics(flagMap));
    setChapters((rows) =>
      rows.map((ch) => ({
        ...ch,
        tagSuggestion: suggestClipTag(ch, segments, chapterOcr[ch.id] ?? null),
        reviewFlags: flagMap.get(ch.id),
      })),
    );
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateTitle(id: string, title: string) {
    setTitleAcceptedById((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setChapters((rows) =>
      rows.map((c) => (c.id === id ? { ...c, title } : c)),
    );
    setDirty(true);
  }

  function updateSourceReviewStatus(status: SourceReviewStatus) {
    setSourceReviewStatus((prev) => (prev === status ? undefined : status));
    setDirty(true);
  }

  function updateReviewStatus(id: string, reviewStatus: ClipReviewStatus | undefined) {
    patchChapterReview(id, { reviewStatus });
  }

  function patchChapterReview(
    id: string,
    patch: {
      reviewStatus?: ClipReviewStatus;
      favorite?: boolean;
      category?: string;
      inSeconds?: number;
      outSeconds?: number;
      lengthSeconds?: number;
      clearSelection?: boolean;
    },
  ) {
    setChapters((rows) =>
      rows.map((c) => {
        if (c.id !== id) return c;
        const next = { ...c };
        if (patch.reviewStatus !== undefined) {
          next.reviewStatus = patch.reviewStatus;
          if (patch.reviewStatus !== "Keep") next.favorite = undefined;
        }
        if (patch.favorite === true) {
          next.favorite = true;
          next.reviewStatus = "Keep";
        } else if (patch.favorite === false) {
          next.favorite = undefined;
        }
        if (patch.category !== undefined) {
          next.category = patch.category || undefined;
        }
        if (patch.clearSelection) {
          delete next.inSeconds;
          delete next.outSeconds;
          delete next.lengthSeconds;
        } else {
          if (patch.inSeconds !== undefined) next.inSeconds = patch.inSeconds;
          if (patch.outSeconds !== undefined) next.outSeconds = patch.outSeconds;
          if (patch.lengthSeconds !== undefined) next.lengthSeconds = patch.lengthSeconds;
        }
        return next;
      }),
    );
    setDirty(true);
  }

  function selectionPayloadFromDraft(
    selection: ClipSelectionState,
  ): Pick<EditorialChapterRow, "inSeconds" | "outSeconds" | "lengthSeconds"> {
    const lengthSeconds = selectionLengthSeconds(selection);
    if (lengthSeconds == null) return {};
    return {
      inSeconds: selection.inSeconds,
      outSeconds: selection.outSeconds,
      lengthSeconds,
    };
  }

  const updateDraftSelection = useCallback((next: ClipSelectionState) => {
    setDraftSelection(next);
  }, []);

  function applySuggestedTitle(id: string) {
    setTitleAcceptedById((prev) => ({ ...prev, [id]: true }));
  }

  function applyContentType(id: string, type: ContentType) {
    if (titleAcceptedById[id]) return;
    const ch = chapters.find((c) => c.id === id);
    if (!ch) return;
    const parsed = parseTypedTitle(ch.title);
    const subject =
      parsed.type && parsed.subject
        ? parsed.subject
        : ch.tagSuggestion?.subject ?? parsed.subject ?? "Segment";
    updateTitle(id, formatTypedTitle(type, subject));
  }

  function mergeSelectedLocal() {
    const ids = [...selected].sort(
      (a, b) =>
        chapters.findIndex((c) => c.id === a) - chapters.findIndex((c) => c.id === b),
    );
    if (ids.length < 2) {
      props.onError?.("Select at least two adjacent chapters.");
      return;
    }
    for (let i = 1; i < ids.length; i++) {
      const ai = chapters.findIndex((c) => c.id === ids[i]);
      const bi = chapters.findIndex((c) => c.id === ids[i - 1]);
      if (ai !== bi + 1) {
        props.onError?.("Only adjacent chapters can be merged.");
        return;
      }
    }
    const firstIdx = chapters.findIndex((c) => c.id === ids[0]);
    const lastIdx = chapters.findIndex((c) => c.id === ids[ids.length - 1]);
    const title =
      mergeTitle.trim() ||
      chapters[firstIdx].title ||
      "Commercial - Merged";
    const merged: EditorialChapterRow = {
      ...chapters[firstIdx],
      endSec: chapters[lastIdx].endSec,
      end: chapters[lastIdx].end,
      title,
      durationSec:
        Math.round((chapters[lastIdx].endSec - chapters[firstIdx].startSec) * 10) / 10,
    };
    const out = [
      ...chapters.slice(0, firstIdx),
      merged,
      ...chapters.slice(lastIdx + 1),
    ].map((ch, i) => ({ ...ch, id: `ch-${i}` }));
    setChapters(out);
    setSelected(new Set());
    setMergeTitle("");
    setDirty(true);
  }

  function applySuggestion(s: MergeSuggestion) {
    const leftIdx = chapters.findIndex((c) => c.id === s.leftChapterId);
    const rightIdx = chapters.findIndex((c) => c.id === s.rightChapterId);
    if (leftIdx < 0 || rightIdx !== leftIdx + 1) return;

    const merged: EditorialChapterRow = {
      ...chapters[leftIdx],
      endSec: chapters[rightIdx].endSec,
      end: chapters[rightIdx].end,
      title: s.suggestedTitle,
      durationSec:
        Math.round((chapters[rightIdx].endSec - chapters[leftIdx].startSec) * 10) / 10,
    };
    const out = [
      ...chapters.slice(0, leftIdx),
      merged,
      ...chapters.slice(rightIdx + 1),
    ].map((ch, i) => ({ ...ch, id: `ch-${i}` }));
    setChapters(out);
    setDirty(true);
    props.onNotice?.(`Merged into “${s.suggestedTitle}”.`);
  }

  function deleteChapterLocal(id: string) {
    const out = chapters.filter((c) => c.id !== id).map((ch, i) => ({ ...ch, id: `ch-${i}` }));
    setChapters(out);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setDirty(true);
  }

  function pushChapterUndo() {
    chapterUndoRef.current.push({
      chapters: chapters.map((ch) => ({ ...ch })),
      previewId,
    });
    if (chapterUndoRef.current.length > 48) {
      chapterUndoRef.current.shift();
    }
  }

  function triggerTimelineFlash(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return;
    if (timelineFlashTimerRef.current) {
      clearTimeout(timelineFlashTimerRef.current);
    }
    setTimelineFlashIds(unique);
    timelineFlashTimerRef.current = setTimeout(() => {
      setTimelineFlashIds([]);
      timelineFlashTimerRef.current = null;
    }, 250);
  }

  function reindexChapters(
    rows: EditorialChapterRow[],
    keepPreviewId: string | null,
  ): { rows: EditorialChapterRow[]; previewId: string | null } {
    const keepIdx = keepPreviewId ? rows.findIndex((c) => c.id === keepPreviewId) : -1;
    const reindexed = rows.map((ch, i) => ({ ...ch, id: `ch-${i}` }));
    return {
      rows: reindexed,
      previewId: keepIdx >= 0 ? reindexed[keepIdx].id : keepPreviewId,
    };
  }

  const undoChapterEdit = useCallback(() => {
    const prev = chapterUndoRef.current.pop();
    if (!prev) return;
    setChapters(prev.chapters);
    setPreviewId(prev.previewId);
    setDirty(true);
    props.onNotice?.("Undo");
  }, [props]);

  const mergeChaptersAtBoundary = useCallback(
    (boundaryIndex: number) => {
      const leftIdx = boundaryIndex;
      const rightIdx = boundaryIndex + 1;
      if (leftIdx < 0 || rightIdx >= chapters.length) return;

      pushChapterUndo();
      const left = chapters[leftIdx];
      const right = chapters[rightIdx];
      const merged: EditorialChapterRow = {
        ...left,
        endSec: right.endSec,
        end: right.end,
        durationSec: Math.round((right.endSec - left.startSec) * 10) / 10,
      };
      const out = [
        ...chapters.slice(0, leftIdx),
        merged,
        ...chapters.slice(rightIdx + 1),
      ];
      const keepPreview =
        previewId === left.id || previewId === right.id ? left.id : previewId;
      const { rows, previewId: nextPreviewId } = reindexChapters(out, keepPreview);
      setChapters(rows);
      if (nextPreviewId) setPreviewId(nextPreviewId);
      triggerTimelineFlash([rows[leftIdx]?.id].filter(Boolean) as string[]);
      setDirty(true);
    },
    [chapters, previewId],
  );

  const splitChapterAtSec = useCallback(
    (chapterId: string, at: number) => {
      const idx = chapters.findIndex((c) => c.id === chapterId);
      if (idx < 0) return false;
      const ch = chapters[idx];
      const splitAt = Math.round(at * 100) / 100;
      if (splitAt <= ch.startSec + MIN_CLIP_SEC || splitAt >= ch.endSec - MIN_CLIP_SEC) {
        return false;
      }

      pushChapterUndo();
      const left: EditorialChapterRow = {
        ...ch,
        endSec: splitAt,
        end: formatTimecode(splitAt),
        durationSec: Math.round((splitAt - ch.startSec) * 10) / 10,
        inSeconds: ch.inSeconds != null && ch.inSeconds < splitAt ? ch.inSeconds : undefined,
        outSeconds: ch.outSeconds != null && ch.outSeconds <= splitAt ? ch.outSeconds : undefined,
        lengthSeconds:
          ch.inSeconds != null &&
          ch.outSeconds != null &&
          ch.outSeconds <= splitAt
            ? ch.outSeconds - ch.inSeconds
            : undefined,
      };
      const right: EditorialChapterRow = {
        id: `${ch.id}-r`,
        startSec: splitAt,
        endSec: ch.endSec,
        start: formatTimecode(splitAt),
        end: ch.end,
        title: `${ch.title} (cont.)`,
        durationSec: Math.round((ch.endSec - splitAt) * 10) / 10,
        clock: formatChapterClock(splitAt),
      };
      const out = [...chapters.slice(0, idx), left, right, ...chapters.slice(idx + 1)];
      const { rows, previewId: nextPreviewId } = reindexChapters(out, ch.id);
      setChapters(rows);
      if (nextPreviewId) setPreviewId(nextPreviewId);
      setDraftSelection({ inSeconds: left.startSec, outSeconds: left.endSec });
      setPlayheadSec(splitAt);
      triggerTimelineFlash([rows[idx]?.id, rows[idx + 1]?.id].filter(Boolean) as string[]);
      setDirty(true);
      return true;
    },
    [chapters],
  );

  const deleteChapterFromTimeline = useCallback(
    (id: string) => {
      const idx = chapters.findIndex((c) => c.id === id);
      if (idx < 0) return;

      pushChapterUndo();
      const out = chapters.filter((c) => c.id !== id);
      let keepPreview = previewId;
      if (previewId === id) {
        const fallback = chapters[idx + 1] ?? chapters[idx - 1];
        keepPreview = fallback?.id ?? null;
      }

      const { rows, previewId: nextPreviewId } = reindexChapters(out, keepPreview);
      const flashIds: string[] = [];
      if (idx > 0) flashIds.push(rows[idx - 1]?.id);
      if (idx < rows.length) flashIds.push(rows[idx]?.id);

      setChapters(rows);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      if (previewId === id) {
        if (nextPreviewId) {
          setPreviewId(nextPreviewId);
          const ch = rows.find((c) => c.id === nextPreviewId);
          if (ch) {
            requestAnimationFrame(() => {
              const v = videoRef.current;
              if (v) {
                v.currentTime = ch.startSec;
                setPlayheadSec(ch.startSec);
              }
            });
          }
        } else {
          setPreviewId(null);
        }
      } else if (nextPreviewId) {
        setPreviewId(nextPreviewId);
      }

      triggerTimelineFlash(flashIds.filter(Boolean) as string[]);
      setDirty(true);
      props.onNotice?.("Clip deleted — Undo (⌘Z)");
    },
    [chapters, previewId, props],
  );

  const splitPreviewChapterAtPlayhead = useCallback(() => {
    if (!previewChapter) return;
    const at = videoRef.current?.currentTime ?? playheadSec;
    splitChapterAtSec(previewChapter.id, at);
  }, [playheadSec, previewChapter, splitChapterAtSec]);

  function splitChapterLocal() {
    if (!splitChapter) return;
    const at = Number(splitAtSec);
    if (!Number.isFinite(at) || at <= splitChapter.startSec + 1 || at >= splitChapter.endSec - 1) {
      props.onError?.("Enter a split time inside the chapter (seconds).");
      return;
    }
    if (splitChapterAtSec(splitChapter.id, at)) {
      setSplitId(null);
      setSplitAtSec("");
    }
  }

  function formatTimecode(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
  }

  const pauseVideo = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const seekToChapter = useCallback((ch: EditorialChapterRow, autoplay = false) => {
    requestAnimationFrame(() => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = ch.startSec;
      setPlayheadSec(ch.startSec);
      if (autoplay) void v.play().catch(() => undefined);
    });
  }, []);

  const seekToSec = useCallback((sec: number, autoplay = false) => {
    requestAnimationFrame(() => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = sec;
      setPlayheadSec(sec);
      if (autoplay) void v.play().catch(() => undefined);
    });
  }, []);

  const handleTrimDragStart = useCallback(() => {
    const v = videoRef.current;
    trimWasPlayingRef.current = !!(v && !v.paused);
    v?.pause();
  }, []);

  const handleTrimPreview = useCallback((sec: number) => {
    requestAnimationFrame(() => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = sec;
      setPlayheadSec(sec);
    });
  }, []);

  const handleTrimDragEnd = useCallback((sec: number) => {
    requestAnimationFrame(() => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = sec;
      setPlayheadSec(sec);
      if (trimWasPlayingRef.current) {
        void v.play().catch(() => undefined);
      }
    });
  }, []);

  const openPreview = useCallback(
    (ch: EditorialChapterRow, opts?: { autoplay?: boolean }) => {
      pauseVideo();
      setPreviewId(ch.id);
      setSplitId(null);
      seekToChapter(ch, opts?.autoplay ?? false);
      if (!props.workstationMode) {
        requestAnimationFrame(() => {
          workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          cardRefs.current.get(ch.id)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
      }
    },
    [pauseVideo, props.workstationMode, seekToChapter],
  );

  const closeReview = useCallback(() => {
    setPreviewId(null);
    videoRef.current?.pause();
  }, []);

  const goToClipIndex = useCallback(
    (index: number) => {
      const ch = chapters[index];
      if (!ch) return;
      openPreview(ch);
    },
    [chapters, openPreview],
  );

  const prevClip = useCallback(() => {
    if (previewIndex > 0) goToClipIndex(previewIndex - 1);
  }, [goToClipIndex, previewIndex]);

  const nextClip = useCallback(() => {
    if (previewIndex >= 0 && previewIndex < chapters.length - 1) {
      goToClipIndex(previewIndex + 1);
    }
  }, [chapters.length, goToClipIndex, previewIndex]);

  const togglePlayPause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  }, []);

  const regenerateTitle = useCallback(() => {
    if (!previewChapter || segments.length === 0) return;
    const id = previewChapter.id;
    const inSec = draftSelection.inSeconds ?? previewChapter.startSec;
    const outSec = draftSelection.outSeconds ?? previewChapter.endSec;
    const currentName = displayNameFromTitle(previewChapter.title);
    const history = nameHistoryById[id] ?? [];
    const usedNames = new Set<string>([
      ...history.map(normalizeNameKey),
      normalizeNameKey(currentName),
    ]);

    const result = regenerateClipName({
      startSec: inSec,
      endSec: outSec,
      title: previewChapter.title,
      segments,
      ocr: chapterOcr[id] ?? null,
      usedNames,
      regenPass: nameRegenCountById[id] ?? 0,
    });

    if (!result) {
      props.onError?.("No name suggestions available for this clip.");
      return;
    }

    if (currentName.trim()) {
      setNameHistoryById((prev) => {
        const prior = prev[id] ?? [];
        const nextHistory = [
          currentName,
          ...prior.filter((n) => normalizeNameKey(n) !== normalizeNameKey(currentName)),
        ];
        return { ...prev, [id]: nextHistory };
      });
    }

    setNameRegenCountById((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    updateTitle(id, result.name);
    setChapters((rows) =>
      rows.map((c) => (c.id === id ? { ...c, tagSuggestion: result.suggestion } : c)),
    );
    if (result.exhausted) {
      props.onNotice?.("All unique name candidates used — reusing a prior suggestion.");
    }
  }, [
    chapterOcr,
    draftSelection,
    nameHistoryById,
    nameRegenCountById,
    previewChapter,
    props,
    segments,
  ]);

  const restorePreviousName = useCallback(
    (name: string) => {
      if (!previewChapter) return;
      const id = previewChapter.id;
      const currentName = displayNameFromTitle(previewChapter.title);
      if (currentName.trim() && normalizeNameKey(currentName) !== normalizeNameKey(name)) {
        setNameHistoryById((prev) => {
          const prior = prev[id] ?? [];
          const withoutTarget = prior.filter((n) => normalizeNameKey(n) !== normalizeNameKey(name));
          const nextHistory = [
            currentName,
            ...withoutTarget.filter((n) => normalizeNameKey(n) !== normalizeNameKey(currentName)),
          ];
          return { ...prev, [id]: nextHistory };
        });
      }
      updateTitle(id, name);
    },
    [previewChapter],
  );

  const removeFromQueue = useCallback((id: string) => {
    setChapters((rows) =>
      rows.map((c) => {
        if (c.id !== id) return c;
        const next = { ...c };
        delete next.reviewStatus;
        delete next.favorite;
        delete next.category;
        delete next.inSeconds;
        delete next.outSeconds;
        delete next.lengthSeconds;
        return next;
      }),
    );
    setDirty(true);
  }, []);

  const keepClipAndNext = useCallback(() => {
    if (!previewChapter) return;
    patchChapterReview(previewChapter.id, {
      reviewStatus: "Keep",
      ...selectionPayloadFromDraft(draftSelection),
    });
    nextClip();
  }, [draftSelection, nextClip, previewChapter]);

  const favoriteClipAndNext = useCallback(() => {
    if (!previewChapter) return;
    patchChapterReview(previewChapter.id, {
      favorite: true,
      ...selectionPayloadFromDraft(draftSelection),
    });
    nextClip();
  }, [draftSelection, nextClip, previewChapter]);

  const categorizeAndAdvance = useCallback(
    (category: { contentType: ContentType; label: string }) => {
      if (!previewChapter) return;
      const selection =
        draftSelection.inSeconds != null && draftSelection.outSeconds != null
          ? draftSelection
          : {
              inSeconds: previewChapter.inSeconds ?? previewChapter.startSec,
              outSeconds: previewChapter.outSeconds ?? previewChapter.endSec,
            };
      patchChapterReview(previewChapter.id, {
        reviewStatus: "Keep",
        category: category.label,
        ...selectionPayloadFromDraft(selection),
      });
      nextClip();
    },
    [draftSelection, nextClip, previewChapter],
  );

  const runHarvestExport = useCallback(
    async (duplicateAction?: HarvestDuplicateAction) => {
      const kept = chapters.filter((ch) => ch.reviewStatus === "Keep");
      if (kept.length === 0) {
        props.onError?.("No clips in queue to export.");
        return;
      }
      setBusy("export-queue");
      try {
        const payload = {
          year: props.year,
          jobSlug: props.jobSlug,
          sourceProgram: humanizeJobSlug(props.jobSlug),
          items: kept.map((ch) => ({
            chapterId: ch.id,
            title: ch.title,
            category: ch.category,
            inSeconds: ch.inSeconds ?? ch.startSec,
            outSeconds: ch.outSeconds ?? ch.endSec,
            artist: ch.tagSuggestion?.subject?.trim() || undefined,
            displayTitle: ch.title.trim(),
          })),
        };

        let action = duplicateAction;
        if (!action) {
          const checkRes = await fetch("/api/ops/media-lab/editorial/export-queue", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...payload, checkOnly: true }),
          });
          const checkData = (await checkRes.json()) as {
            ok?: boolean;
            error?: string;
            conflictCount?: number;
            conflicts?: HarvestExportConflict[];
          };
          if (!checkRes.ok || !checkData.ok) {
            throw new Error(checkData.error ?? "Export check failed");
          }
          if ((checkData.conflictCount ?? 0) > 0) {
            setHarvestConflicts(checkData.conflicts ?? []);
            return;
          }
          action = "skip";
        }

        const res = await fetch("/api/ops/media-lab/editorial/export-queue", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...payload, duplicateAction: action }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          exportedCount?: number;
          skippedCount?: number;
          failedCount?: number;
          libraryRoot?: string;
          message?: string;
        };
        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? "Export failed");
        }
        setHarvestConflicts(null);
        setHarvestRefreshKey((n) => n + 1);
        setQueueCloseSignal((n) => n + 1);
        videoRef.current?.pause();
        const skippedNote =
          (data.skippedCount ?? 0) > 0 ? `\nSkipped ${data.skippedCount} existing.` : "";
        const failedNote =
          (data.failedCount ?? 0) > 0 ? `\nFailed ${data.failedCount}.` : "";
        props.onNotice?.(
          `${data.message ?? `Harvested ${data.exportedCount ?? 0} clips`}\n\n${data.libraryRoot ?? "~/MEDIA_LAB_LIBRARY/"}${skippedNote}${failedNote}`,
        );
      } catch (e) {
        props.onError?.(e instanceof Error ? e.message : "Export failed");
      } finally {
        setBusy(null);
      }
    },
    [chapters, props.jobSlug, props.onError, props.onNotice, props.year],
  );

  const exportQueue = useCallback(() => void runHarvestExport(), [runHarvestExport]);

  useEffect(() => {
    if (!previewChapter) {
      setDraftSelection({});
      return;
    }
    const { inSeconds, outSeconds, startSec, endSec } = previewChapter;
    if (
      inSeconds != null &&
      outSeconds != null &&
      outSeconds > inSeconds &&
      inSeconds >= startSec &&
      outSeconds <= endSec
    ) {
      setDraftSelection({ inSeconds, outSeconds });
    } else {
      setDraftSelection({ inSeconds: startSec, outSeconds: endSec });
    }
  }, [previewChapter?.id]);

  useEffect(() => {
    if (!reviewMode) return;

    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const key = e.key.toLowerCase();

      if (focusMode) {
        if (e.key === " ") {
          e.preventDefault();
          togglePlayPause();
          return;
        }
        if (key === "p") {
          e.preventDefault();
          prevClip();
          return;
        }
        if (key === "n") {
          e.preventDefault();
          nextClip();
          return;
        }
        if (key === "a" && previewChapter) {
          e.preventDefault();
          applySuggestedTitle(previewChapter.id);
          return;
        }
        if (key === "f" && previewChapter) {
          e.preventDefault();
          favoriteClipAndNext();
          return;
        }
        const category = curatorCategoryForKey(e.key);
        if (category && previewChapter) {
          e.preventDefault();
          categorizeAndAdvance(category);
          return;
        }
        if ((e.metaKey || e.ctrlKey) && key === "z") {
          e.preventDefault();
          undoChapterEdit();
          return;
        }
        if (key === "escape") {
          e.preventDefault();
          closeReview();
        }
        return;
      }

      if (key === "j") {
        e.preventDefault();
        prevClip();
      } else if (key === "k") {
        e.preventDefault();
        togglePlayPause();
      } else if (key === "l") {
        e.preventDefault();
        nextClip();
      } else if (key === "a" && previewChapter) {
        e.preventDefault();
        applySuggestedTitle(previewChapter.id);
      } else if (key === "y" && previewChapter) {
        e.preventDefault();
        updateReviewStatus(previewChapter.id, "Keep");
      } else if (key === "x" && previewChapter) {
        e.preventDefault();
        updateReviewStatus(previewChapter.id, "Reject");
      } else if (key === "e" && previewChapter) {
        e.preventDefault();
        workspaceRef.current?.querySelector<HTMLInputElement>(".ops-ml-chapter-tags__title")?.focus();
      } else if (key === "escape") {
        e.preventDefault();
        closeReview();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    applySuggestedTitle,
    categorizeAndAdvance,
    closeReview,
    favoriteClipAndNext,
    focusMode,
    nextClip,
    previewChapter,
    prevClip,
    reviewMode,
    togglePlayPause,
    undoChapterEdit,
  ]);

  function handleVideoTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    setPlayheadSec(v.currentTime);
    if (!reviewMode || !previewChapter) return;
    if (v.currentTime < previewChapter.endSec - 0.08) return;
    v.pause();
    v.currentTime = previewChapter.endSec;
    setPlayheadSec(previewChapter.endSec);
  }

  function setStartHere() {
    if (!previewChapter) return;
    const sec = videoRef.current?.currentTime ?? playheadSec;
    adjustChapterStart(previewChapter.id, sec);
    setPlayheadSec(sec);
  }

  function setEndHere() {
    if (!previewChapter) return;
    const sec = videoRef.current?.currentTime ?? playheadSec;
    adjustChapterEnd(previewChapter.id, sec);
    setPlayheadSec(sec);
  }

  function handleVideoClick(e: React.MouseEvent<HTMLVideoElement>) {
    if (!splitChapter || !videoRef.current) return;
    const v = videoRef.current;
    const rect = v.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const abs = splitChapter.startSec + frac * (splitChapter.endSec - splitChapter.startSec);
    setSplitAtSec(abs.toFixed(2));
  }

  const modeLabel =
    props.chapterMode === "commercial"
      ? "Commercial review"
      : props.chapterMode === "content"
        ? "Content review"
        : "Editorial review";

  return (
    <section
      className={[
        "ops-ml-editorial",
        "ops-ml-editorial--editor",
        focusMode && !mobileReview ? "ops-ml-editorial--focus" : "",
        props.workstationMode && focusMode && !mobileReview
          ? "ops-ml-editorial--workstation"
          : "",
        mobileReview ? "ops-ml-editorial--mobile" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!focusMode || mobileReview ? (
        <header className="ops-ml-editorial__head">
          <div>
            <h3 className="ops-ml-panel__title">Editorial review — {modeLabel}</h3>
            <p className="ops-dim ops-ml-editorial__hint">
              Full view: filters, clip queue, merge tools. <kbd>Y</kbd> keep · <kbd>X</kbd> reject ·{" "}
              <kbd>A</kbd> accept · <kbd>J</kbd>/<kbd>L</kbd> prev/next
            </p>
          </div>
          <div className="ops-ml-editorial__head-actions">
            {!mobileReview ? (
              <button
                type="button"
                className={`ops-btn ops-ml-focus-toggle${focusMode ? " ops-ml-focus-toggle--on" : ""}`}
                aria-pressed={focusMode}
                onClick={() => setFocusMode((v) => !v)}
              >
                Focus {focusMode ? "On" : "Off"}
              </button>
            ) : null}
            <button
              type="button"
              className="ops-btn"
              disabled={busy != null}
              onClick={() => void load()}
            >
              Reload
            </button>
            <button
              type="button"
              className="ops-btn ops-btn--info"
              disabled={busy != null || !dirty}
              onClick={() => void persist(false)}
            >
              {busy === "save" ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              className="ops-btn ops-btn--ok"
              disabled={busy != null || reviewCounts.exportable === 0}
              title={
                reviewCounts.exportable === 0
                  ? "Mark at least one clip Keep first"
                  : "Export Keep clips to typed asset folders"
              }
              onClick={() => void persist(true)}
            >
              {busy === "export"
                ? "Exporting…"
                : `Export Keep clips (${reviewCounts.exportable})`}
            </button>
          </div>
        </header>
      ) : null}

      {!mobileReview && !focusMode ? (
        <div className="ops-ml-editorial__filters ops-ml-editorial__filters--triage">
          {(
            [
              ["all", "All"],
              ["unreviewed", "Todo"],
              ["keep", "Keep"],
              ["reject", "Reject"],
              ["exportable", "Export"],
              ["under15", "<15s"],
              ["mergeEligible", "Merge"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`ops-btn ops-ml-filter${filter === id ? " ops-ml-filter--on" : ""}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
          <span className="ops-dim ops-ml-editorial__filter-count">
            {visibleChapters.length}/{chapters.length}
            {dirty ? " · unsaved" : ""}
          </span>
        </div>
      ) : null}

      {!mobileReview && !focusMode ? (
        <div className="ops-ml-editorial__folds">
          {transcriptPreview ? (
            <details className="ops-ml-fold-panel">
              <summary className="ops-ml-fold-panel__summary">Transcript</summary>
              <p className="ops-ml-fold-panel__body ops-dim">{transcriptPreview}…</p>
            </details>
          ) : null}

          <details className="ops-ml-fold-panel">
            <summary className="ops-ml-fold-panel__summary">Source video</summary>
            <div className="ops-ml-fold-panel__body">
              <div className="ops-ml-source-review__actions">
                {SOURCE_REVIEW_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`ops-btn ops-ml-source-review__btn${
                      sourceReviewStatus === status ? " ops-ml-source-review__btn--on" : ""
                    }${status === "Keep Source" ? " ops-btn--ok" : " ops-btn--bad"}`}
                    onClick={() => updateSourceReviewStatus(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
              {clipAssetsDirPath || sourceArchiveDirPath ? (
                <p className="ops-dim ops-ml-source-review__paths">
                  ASSETS → <code className="ops-mono">{clipAssetsDirPath}</code>
                  {" · "}
                  ARCHIVE → <code className="ops-mono">{sourceArchiveDirPath}</code>
                </p>
              ) : null}
            </div>
          </details>

          {assetRoutes.length > 0 ? (
            <details className="ops-ml-fold-panel">
              <summary className="ops-ml-fold-panel__summary">Asset routing</summary>
              <ul className="ops-ml-asset-routes__list ops-ml-fold-panel__body">
                {assetRoutes.map((route) => (
                  <li key={route.contentType} className="ops-ml-asset-routes__item">
                    <span className="ops-ml-asset-routes__type">{route.contentType}</span>
                    <span className="ops-dim">→</span>
                    <code className="ops-mono ops-ml-asset-routes__folder">
                      ASSETS/{route.folder}/
                    </code>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {reviewMetrics ? (
            <details className="ops-ml-fold-panel">
              <summary className="ops-ml-fold-panel__summary">
                Metrics · {reviewCounts.Keep} keep · {reviewCounts.Reject} reject ·{" "}
                {reviewCounts.unreviewed} todo
              </summary>
              <div className="ops-ml-review-metrics ops-ml-fold-panel__body">
                <span className="ops-ml-review-metrics__item">
                  <strong>{reviewMetrics.totalClips}</strong> clips
                </span>
                {reviewMetrics.under15Sec > 0 ? (
                  <span className="ops-ml-review-metrics__item ops-ml-review-metrics__item--warn">
                    <strong>{reviewMetrics.under15Sec}</strong> under 15s
                  </span>
                ) : null}
                {reviewMetrics.mergeEligible > 0 ? (
                  <span className="ops-ml-review-metrics__item ops-ml-review-metrics__item--warn">
                    <strong>{reviewMetrics.mergeEligible}</strong> merge-eligible
                  </span>
                ) : null}
                {reviewCounts.exportable > 0 ? (
                  <span className="ops-ml-review-metrics__item ops-ml-review-metrics__item--export">
                    <strong>{reviewCounts.exportable}</strong> exportable
                  </span>
                ) : null}
              </div>
            </details>
          ) : null}

          <details className="ops-ml-fold-panel">
            <summary className="ops-ml-fold-panel__summary">
              Merge suggestions{suggestions.length > 0 ? ` (${suggestions.length})` : ""}
            </summary>
            <div className="ops-ml-fold-panel__body">
              <div className="ops-ml-editorial__toolbar">
                <button
                  type="button"
                  className="ops-btn"
                  disabled={busy != null}
                  onClick={() => void refreshSuggestions()}
                >
                  {busy === "suggest" ? "Analyzing…" : "Refresh heuristics"}
                </button>
                <input
                  className="ops-ml-field__input ops-ml-editorial__merge-title"
                  placeholder="Merged title (optional)"
                  value={mergeTitle}
                  onChange={(e) => setMergeTitle(e.target.value)}
                />
                <button
                  type="button"
                  className="ops-btn ops-btn--warn"
                  disabled={selected.size < 2}
                  onClick={() => mergeSelectedLocal()}
                >
                  Merge selected ({selected.size})
                </button>
              </div>
              {suggestions.length > 0 ? (
                <ul className="ops-ml-suggestions__list">
                  {suggestions.slice(0, 8).map((s) => (
                    <li
                      key={`${s.leftChapterId}-${s.rightChapterId}`}
                      className="ops-ml-suggestions__item"
                    >
                      <span className="ops-ml-suggestions__pair">
                        {s.leftTitle} + {s.rightTitle}
                      </span>
                      <button
                        type="button"
                        className="ops-btn ops-btn--sm"
                        onClick={() => applySuggestion(s)}
                      >
                        → {s.suggestedTitle}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ops-dim">No merge suggestions yet.</p>
              )}
            </div>
          </details>
        </div>
      ) : null}

      {!focusMode && thumbsError ? (
        <p className="ops-ml-editorial__thumb-error ops-dim">{thumbsError}</p>
      ) : null}
      {!focusMode && ocrError ? (
        <p className="ops-ml-editorial__thumb-error ops-dim">{ocrError}</p>
      ) : null}

      {!mobileReview && focusMode && previewChapter && videoUrl && !splitChapter ? (
        <div
          ref={workspaceRef}
          className={props.workstationMode ? "ops-ml-editorial__workspace" : undefined}
        >
          <FocusReviewDeck
            showTitle={humanizeJobSlug(props.jobSlug)}
            videoRef={videoRef}
            videoUrl={videoUrl}
            onTimeUpdate={handleVideoTimeUpdate}
            clip={previewChapter}
            playheadSec={playheadSec}
            showDurationSec={showDurationSec}
            selection={draftSelection}
            onSelectionChange={updateDraftSelection}
            onSeek={(sec) => seekToSec(sec, false)}
            onTrimDragStart={handleTrimDragStart}
            onTrimPreview={handleTrimPreview}
            onTrimDragEnd={handleTrimDragEnd}
            onTitleChange={(title) => updateTitle(previewChapter.id, title)}
            onRegenerateTitle={() => regenerateTitle()}
            nameHistory={previewNameHistory}
            onRestorePreviousName={(name) => restorePreviousName(name)}
            nameRegenCount={nameRegenCountById[previewChapter.id] ?? 0}
            previewIndex={previewIndex}
            totalClips={chapters.length}
            kept={reviewCounts.Keep}
            isFavorite={previewChapter.favorite === true}
            onFavoriteClip={() => favoriteClipAndNext()}
            onAcceptSuggestion={() => applySuggestedTitle(previewChapter.id)}
            titleAccepted={titleAcceptedById[previewChapter.id] === true}
            titleAcceptedIds={titleAcceptedById}
            onCategorize={(category) => categorizeAndAdvance(category)}
            onPrevious={() => prevClip()}
            onNext={() => nextClip()}
            canPrevious={previewIndex > 0}
            canNext={previewIndex < chapters.length - 1}
            chapters={chapters}
            chapterThumbs={chapterThumbs}
            thumbsLoading={thumbsLoading}
            onSelectClip={(ch) => openPreview(ch, { autoplay: false })}
            onRemoveFromQueue={(id) => removeFromQueue(id)}
            showAdvanced={showAdvanced}
            onToggleAdvanced={() => setShowAdvanced((v) => !v)}
            onToggleFocus={() => setFocusMode(false)}
            onOpenSetup={props.onOpenSetup}
            onMergeBoundary={mergeChaptersAtBoundary}
            onSplitAtPlayhead={splitPreviewChapterAtPlayhead}
            onDeleteChapter={deleteChapterFromTimeline}
            timelineFlashIds={timelineFlashIds}
            onExportQueue={() => void exportQueue()}
            exportQueueBusy={busy === "export-queue"}
            harvestRefreshKey={harvestRefreshKey}
            queueCloseSignal={queueCloseSignal}
            segments={segments}
            advancedPanel={
              <div className="ops-ml-deck-advanced">
                <TranscriptModeControls
                  mode={transcriptMode}
                  onModeChange={setTranscriptMode}
                />
                {previewChapter ? (
                  <ClipTranscriptStrip
                    variant="deck"
                    segments={segments}
                    clipStartSec={previewChapter.startSec}
                    clipEndSec={previewChapter.endSec}
                    playheadSec={playheadSec}
                    mode={transcriptMode}
                    onModeChange={setTranscriptMode}
                  />
                ) : null}
                <p className="ops-ml-deck-advanced__path">
                  Job: <code className="ops-mono">{props.jobSlug}</code>
                </p>
                {clipAssetsDirPath || sourceArchiveDirPath ? (
                  <p className="ops-dim ops-ml-deck-advanced__paths">
                    ASSETS → <code className="ops-mono">{clipAssetsDirPath}</code>
                    {" · "}
                    ARCHIVE → <code className="ops-mono">{sourceArchiveDirPath}</code>
                  </p>
                ) : null}
                <div className="ops-ml-deck-advanced__actions">
                  <button
                    type="button"
                    className="ops-btn"
                    disabled={busy != null}
                    onClick={() => void load()}
                  >
                    Reload
                  </button>
                  <button
                    type="button"
                    className="ops-btn"
                    disabled={busy != null || !dirty}
                    onClick={() => void persist(false)}
                  >
                    {busy === "save" ? "Saving…" : "Save draft"}
                  </button>
                  <button
                    type="button"
                    className="ops-btn ops-btn--ok"
                    disabled={busy != null || reviewCounts.exportable === 0}
                    onClick={() => void persist(true)}
                  >
                    {busy === "export"
                      ? "Exporting…"
                      : `Export Keep (${reviewCounts.exportable})`}
                  </button>
                </div>
                <label className="ops-ml-deck-advanced__label">
                  Chapter title
                  <input
                    className="ops-ml-field__input"
                    value={previewChapter.title}
                    onChange={(e) => updateTitle(previewChapter.id, e.target.value)}
                  />
                </label>
                {previewChapter.tagSuggestion ? (
                  <div className="ops-ml-chapter-tags__details">
                    <span>Confidence {previewChapter.tagSuggestion.confidence}%</span>
                    <span>Type {previewChapter.tagSuggestion.type}</span>
                    {previewChapter.tagSuggestion.ocrSubject ? (
                      <span>OCR {previewChapter.tagSuggestion.ocrSubject}</span>
                    ) : null}
                  </div>
                ) : null}
                <p className="ops-dim">
                  {previewChapter.clock} · {formatDur(previewChapter.durationSec)}
                </p>
                {thumbsError ? <p className="ops-dim">{thumbsError}</p> : null}
                {ocrError ? <p className="ops-dim">{ocrError}</p> : null}
                {reviewMetrics ? (
                  <p className="ops-dim">
                    Metrics: {reviewMetrics.totalClips} clips · {reviewMetrics.mergeEligible} merge-eligible
                  </p>
                ) : null}
                {suggestions.length > 0 ? (
                  <ul className="ops-ml-deck-advanced__merges">
                    {suggestions.slice(0, 5).map((s) => (
                      <li key={`${s.leftChapterId}-${s.rightChapterId}`}>
                        Merge {s.leftTitle} + {s.rightTitle}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            }
          />
          {harvestConflicts && harvestConflicts.length > 0 ? (
            <HarvestExportConflictModal
              conflicts={harvestConflicts}
              busy={busy === "export-queue"}
              onSkip={() => void runHarvestExport("skip")}
              onReplace={() => void runHarvestExport("replace")}
              onReplaceAll={() => void runHarvestExport("replace_all")}
              onCancel={() => setHarvestConflicts(null)}
            />
          ) : null}
        </div>
      ) : !mobileReview ? (
        <div className="ops-ml-editor-layout">
          <div ref={workspaceRef} className="ops-ml-editor-workspace">
            {splitChapter && videoUrl ? (
              <>
                <header className="ops-ml-editor-workspace__head">
                  <h4 className="ops-ml-editor-workspace__title">Split: {splitChapter.title}</h4>
                </header>
                <video
                  ref={videoRef}
                  className="ops-ml-editor-workspace__video"
                  src={videoUrl}
                  controls
                  preload="metadata"
                  onClick={handleVideoClick}
                />
                <div className="ops-ml-split-controls">
                  <input
                    className="ops-ml-field__input"
                    type="number"
                    step="0.1"
                    value={splitAtSec}
                    onChange={(e) => setSplitAtSec(e.target.value)}
                    placeholder="Split at (seconds)"
                  />
                  <button
                    type="button"
                    className="ops-btn ops-btn--ok"
                    onClick={() => splitChapterLocal()}
                  >
                    Split
                  </button>
                  <button
                    type="button"
                    className="ops-btn"
                    onClick={() => {
                      setSplitId(null);
                      setSplitAtSec("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : previewChapter && videoUrl ? (
              <>
                <header className="ops-ml-editor-workspace__head">
                  <div className="ops-ml-editor-workspace__meta">
                    <span className="ops-ml-editor-workspace__counter">
                      Clip {previewIndex + 1} of {chapters.length}
                    </span>
                    <span className="ops-dim ops-ml-editor-workspace__times">
                      {previewChapter.clock} · {formatDur(previewChapter.durationSec)}
                    </span>
                  </div>
                  <div className="ops-ml-editor-workspace__nav">
                    <button
                      type="button"
                      className="ops-btn"
                      disabled={previewIndex <= 0}
                      onClick={() => prevClip()}
                    >
                      ← Prev
                    </button>
                    <button
                      type="button"
                      className="ops-btn ops-btn--info"
                      onClick={() => togglePlayPause()}
                    >
                      Play
                    </button>
                    <button
                      type="button"
                      className="ops-btn"
                      disabled={previewIndex >= chapters.length - 1}
                      onClick={() => nextClip()}
                    >
                      Next →
                    </button>
                  </div>
                </header>
                <video
                  ref={videoRef}
                  className="ops-ml-editor-workspace__video"
                  src={videoUrl}
                  controls
                  preload="metadata"
                  onTimeUpdate={handleVideoTimeUpdate}
                />
                <EditorialChapterTags
                  variant="editor"
                  title={previewChapter.title}
                  suggestion={previewChapter.tagSuggestion ?? null}
                  reviewStatus={previewChapter.reviewStatus}
                  onTitleChange={(title) => updateTitle(previewChapter.id, title)}
                  onApplySuggestedTitle={() => applySuggestedTitle(previewChapter.id)}
                  onApplyContentType={(type) => applyContentType(previewChapter.id, type)}
                  onReviewStatusChange={(status) =>
                    updateReviewStatus(previewChapter.id, status)
                  }
                />
                {!focusMode ? (
                <details className="ops-ml-fold-panel ops-ml-fold-panel--inline">
                  <summary className="ops-ml-fold-panel__summary">Trim & timeline</summary>
                  <div className="ops-ml-fold-panel__body">
                    <div className="ops-ml-review-workspace__mark">
                      <span className="ops-dim ops-ml-review-workspace__mark-pos">
                        {formatChapterClock(playheadSec)}
                      </span>
                      <button
                        type="button"
                        className="ops-btn ops-btn--sm"
                        onClick={() => setStartHere()}
                      >
                        Set start
                      </button>
                      <button
                        type="button"
                        className="ops-btn ops-btn--sm"
                        onClick={() => setEndHere()}
                      >
                        Set end
                      </button>
                    </div>
                    <ChapterFilmstrip
                      year={props.year}
                      jobSlug={props.jobSlug}
                      chapterId={previewChapter.id}
                      startSec={previewChapter.startSec}
                      endSec={previewChapter.endSec}
                      playheadSec={playheadSec}
                      onSeek={(sec) => seekToSec(sec, false)}
                    />
                    <ClipTimeline
                      videoDurationSec={videoDurationSec}
                      chapters={chapters.map(({ id, startSec, endSec, title }) => ({
                        id,
                        startSec,
                        endSec,
                        title,
                      }))}
                      activeChapterId={previewChapter.id}
                      playheadSec={playheadSec}
                      onAdjustStart={adjustChapterStart}
                      onAdjustEnd={adjustChapterEnd}
                    />
                  </div>
                </details>
                ) : null}
              </>
            ) : (
              <p className="ops-dim ops-ml-editor-workspace__empty">Select a clip to preview.</p>
            )}
          </div>

          {!focusMode ? (
          <div className="ops-ml-clip-queue" role="list" aria-label="Clip queue">
            {visibleChapters.map((ch) => (
              <article
                key={ch.id}
                role="listitem"
                className={`ops-ml-clip-card${
                  previewId === ch.id ? " ops-ml-clip-card--active" : ""
                }${ch.reviewStatus === "Keep" ? " ops-ml-clip-card--keep" : ""}${
                  ch.reviewStatus === "Reject" ? " ops-ml-clip-card--reject" : ""
                }`}
              >
                <div className="ops-ml-clip-card__top">
                  <label className="ops-ml-clip-card__select">
                    <input
                      type="checkbox"
                      checked={selected.has(ch.id)}
                      onChange={() => toggleSelect(ch.id)}
                      aria-label={`Select ${ch.title} for merge`}
                    />
                  </label>
                  <span className="ops-mono ops-ml-clip-card__time">
                    {ch.clock} · {formatDur(ch.durationSec)}
                  </span>
                  <button
                    type="button"
                    ref={(el) => {
                      if (el) cardRefs.current.set(ch.id, el);
                      else cardRefs.current.delete(ch.id);
                    }}
                    className="ops-btn ops-btn--sm ops-ml-clip-card__preview"
                    onClick={() => openPreview(ch)}
                  >
                    Preview
                  </button>
                </div>
                <div className="ops-ml-clip-card__thumbs">
                  <ChapterThumbTriplet
                    thumbs={chapterThumbs[ch.id] ?? null}
                    loading={thumbsLoading && !chapterThumbs[ch.id]}
                    onSelect={(sec) => {
                      openPreview(ch);
                      seekToSec(sec, false);
                    }}
                  />
                </div>
                <EditorialChapterTags
                  variant="card"
                  title={ch.title}
                  suggestion={ch.tagSuggestion ?? null}
                  reviewStatus={ch.reviewStatus}
                  onTitleChange={(title) => updateTitle(ch.id, title)}
                  onApplySuggestedTitle={() => applySuggestedTitle(ch.id)}
                  onApplyContentType={(type) => applyContentType(ch.id, type)}
                  onReviewStatusChange={(status) => updateReviewStatus(ch.id, status)}
                />
                <div className="ops-ml-clip-card__actions">
                  <button
                    type="button"
                    className="ops-btn ops-btn--sm"
                    onClick={() => {
                      setSplitId(ch.id);
                      setPreviewId(null);
                      setSplitAtSec(String(Math.round((ch.startSec + ch.endSec) / 2)));
                      requestAnimationFrame(() => {
                        const v = videoRef.current;
                        if (v) {
                          v.currentTime = ch.startSec;
                          v.pause();
                        }
                        workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      });
                    }}
                  >
                    Split
                  </button>
                  <button
                    type="button"
                    className="ops-btn ops-btn--sm ops-btn--bad"
                    onClick={() => deleteChapterLocal(ch.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
          ) : null}
        </div>
      ) : null}

      {mobileReview ? (
        <>
          <div className="ops-ml-editorial__filters ops-ml-editorial__filters--mobile">
            {(
              [
                ["all", "All"],
                ["unreviewed", "Todo"],
                ["keep", "Keep"],
                ["reject", "Reject"],
                ["exportable", "Export"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`ops-btn ops-ml-filter${filter === id ? " ops-ml-filter--on" : ""}`}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <MediaLabMobileReview
            chapters={visibleChapters}
            videoUrl={videoUrl}
            cardIndex={mobileCardIndex}
            onCardIndexChange={setMobileCardIndex}
            onReviewStatus={(id, status) => updateReviewStatus(id, status)}
            onApplyContentType={(id, type) => applyContentType(id, type)}
            onApplySuggestedTitle={(id) => applySuggestedTitle(id)}
            onTitleChange={(id, title) => updateTitle(id, title)}
          />
        </>
      ) : null}

    </section>
  );
}
