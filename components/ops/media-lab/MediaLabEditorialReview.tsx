"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MediaLabChapterMode } from "@/lib/ops/media-lab/chapter-mode";
import type { TranscriptSegment } from "@/lib/ops/media-lab/build-chapters-from-segments";
import type { EditorialChapterRow } from "@/lib/ops/media-lab/editorial/load-editorial";
import type { MergeSuggestion } from "@/lib/ops/media-lab/editorial/merge-suggestions";
import type { ClipOcrInput } from "@/lib/ops/media-lab/editorial/transcript-suggestions";
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
import { EditorialChapterTags } from "./EditorialChapterTags";
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
  job?: { durationSeconds: number | null; chapterCount: number };
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
  onNotice?: (message: string) => void;
  onError?: (message: string) => void;
  onExported?: (patch: {
    chaptersPreview?: { start: string; end: string; title: string; clock?: string }[];
    job?: { chapterCount: number; segmentLabelCount?: number };
  }) => void;
};

function formatDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
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
  const mobileReview = useMediaLabMobileReview();
  const videoRef = useRef<HTMLVideoElement>(null);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const load = useCallback(async () => {
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
      setSegments(data.segments ?? []);
      setSourceReviewStatus(data.sourceReviewStatus);
      setClipAssetsDirPath(data.clipAssetsDir ?? "");
      setSourceArchiveDirPath(data.sourceArchiveDir ?? "");
      setAssetRoutes(data.assetRoutes ?? []);
      setDirty(false);
      setSelected(new Set());
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
  const splitChapter = chapters.find((c) => c.id === splitId) ?? null;
  const reviewMode = previewId != null && splitId == null;
  const previewIndex =
    previewId != null ? chapters.findIndex((c) => c.id === previewId) : -1;
  const tableChapters = reviewMode ? chapters : visibleChapters;
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
                .filter((ch) => ch.reviewStatus)
                .map((ch) => [ch.id, { reviewStatus: ch.reviewStatus }]),
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
      await load();
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
    setChapters((rows) =>
      rows.map((c) => (c.id === id ? { ...c, reviewStatus } : c)),
    );
    setDirty(true);
  }

  function applySuggestedTitle(id: string) {
    const ch = chapters.find((c) => c.id === id);
    if (!ch?.tagSuggestion) return;
    updateTitle(id, ch.tagSuggestion.title);
  }

  function applyContentType(id: string, type: ContentType) {
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

  function splitChapterLocal() {
    if (!splitChapter) return;
    const at = Number(splitAtSec);
    if (!Number.isFinite(at) || at <= splitChapter.startSec + 1 || at >= splitChapter.endSec - 1) {
      props.onError?.("Enter a split time inside the chapter (seconds).");
      return;
    }
    const idx = chapters.findIndex((c) => c.id === splitChapter.id);
    const left: EditorialChapterRow = {
      ...splitChapter,
      endSec: at,
      end: formatTimecode(at),
      durationSec: Math.round((at - splitChapter.startSec) * 10) / 10,
    };
    const right: EditorialChapterRow = {
      id: `${splitChapter.id}-r`,
      startSec: at,
      endSec: splitChapter.endSec,
      start: formatTimecode(at),
      end: splitChapter.end,
      title: `${splitChapter.title} (cont.)`,
      durationSec: Math.round((splitChapter.endSec - at) * 10) / 10,
      clock: splitChapter.clock,
    };
    const out = [
      ...chapters.slice(0, idx),
      left,
      right,
      ...chapters.slice(idx + 1),
    ].map((ch, i) => ({ ...ch, id: `ch-${i}` }));
    setChapters(out);
    setSplitId(null);
    setSplitAtSec("");
    setDirty(true);
  }

  function formatTimecode(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
  }

  const seekToChapter = useCallback((ch: EditorialChapterRow, autoplay = true) => {
    requestAnimationFrame(() => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = ch.startSec;
      setPlayheadSec(ch.startSec);
      if (autoplay) void v.play().catch(() => undefined);
    });
  }, []);

  const seekToSec = useCallback((sec: number, autoplay = true) => {
    requestAnimationFrame(() => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = sec;
      setPlayheadSec(sec);
      if (autoplay) void v.play().catch(() => undefined);
    });
  }, []);

  const openPreview = useCallback(
    (ch: EditorialChapterRow) => {
      setPreviewId(ch.id);
      setSplitId(null);
      seekToChapter(ch);
    },
    [seekToChapter],
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

  useEffect(() => {
    if (!reviewMode) return;

    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const key = e.key.toLowerCase();
      if (key === "j") {
        e.preventDefault();
        prevClip();
      } else if (key === "k") {
        e.preventDefault();
        togglePlayPause();
      } else if (key === "l") {
        e.preventDefault();
        nextClip();
      } else if (key === "escape") {
        e.preventDefault();
        closeReview();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeReview, nextClip, prevClip, reviewMode, togglePlayPause]);

  useEffect(() => {
    if (!previewId) return;
    const row = rowRefs.current.get(previewId);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [previewId]);

  useEffect(() => {
    if (!reviewMode) return;
    document
      .querySelector(".ops-ml-review-workspace")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [reviewMode, previewId]);

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
        reviewMode ? "ops-ml-editorial--review" : "",
        mobileReview ? "ops-ml-editorial--mobile" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="ops-ml-editorial__head">
        <div>
          <h3 className="ops-ml-panel__title">Editorial review — {modeLabel}</h3>
          <p className="ops-dim ops-ml-editorial__hint">
            Transcript suggests type + title. Click Accept, tag Keep/Reject, export — clips route
            into <code className="ops-mono">VIDEO/ASSETS/</code> by type; source →{" "}
            <code className="ops-mono">VIDEO/ARCHIVE/</code>.
          </p>
        </div>
        <div className="ops-ml-editorial__head-actions">
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

      <div className="ops-ml-source-review">
        <span className="ops-ml-source-review__label">Source video</span>
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
            ASSETS root → <code className="ops-mono">{clipAssetsDirPath}</code>
            {" · "}
            ARCHIVE → <code className="ops-mono">{sourceArchiveDirPath}</code>
          </p>
        ) : null}
      </div>

      {assetRoutes.length > 0 ? (
        <details className="ops-ml-asset-routes">
          <summary className="ops-ml-asset-routes__summary">Asset routing map</summary>
          <ul className="ops-ml-asset-routes__list">
            {assetRoutes.map((route) => (
              <li key={route.contentType} className="ops-ml-asset-routes__item">
                <span className="ops-ml-asset-routes__type">{route.contentType}</span>
                <span className="ops-dim">→</span>
                <code className="ops-mono ops-ml-asset-routes__folder">ASSETS/{route.folder}/</code>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {reviewMetrics && !reviewMode ? (
        <div className="ops-ml-review-metrics">
          <span className="ops-ml-review-metrics__item">
            <strong>{reviewMetrics.totalClips}</strong> clips
          </span>
          {reviewMetrics.under15Sec > 0 ? (
            <span className="ops-ml-review-metrics__item ops-ml-review-metrics__item--warn">
              <strong>{reviewMetrics.under15Sec}</strong> under 15s
            </span>
          ) : null}
          {reviewMetrics.sameBrandNeighbor > 0 ? (
            <span className="ops-ml-review-metrics__item ops-ml-review-metrics__item--warn">
              <strong>{reviewMetrics.sameBrandNeighbor}</strong> same-brand neighbors
            </span>
          ) : null}
          {reviewMetrics.mergeEligible > 0 ? (
            <span className="ops-ml-review-metrics__item ops-ml-review-metrics__item--warn">
              <strong>{reviewMetrics.mergeEligible}</strong> merge-eligible
            </span>
          ) : null}
          <span className="ops-ml-review-metrics__item ops-ml-review-metrics__item--keep">
            <strong>{reviewCounts.Keep}</strong> keep
          </span>
          <span className="ops-ml-review-metrics__item ops-ml-review-metrics__item--reject">
            <strong>{reviewCounts.Reject}</strong> reject
          </span>
          {reviewCounts.exportable > 0 ? (
            <span className="ops-ml-review-metrics__item ops-ml-review-metrics__item--export">
              <strong>{reviewCounts.exportable}</strong> exportable
            </span>
          ) : null}
          {reviewCounts.unreviewed > 0 ? (
            <span className="ops-ml-review-metrics__item">
              <strong>{reviewCounts.unreviewed}</strong> unreviewed
            </span>
          ) : null}
        </div>
      ) : null}

      {!reviewMode && !mobileReview ? (
        <>
          <div className="ops-ml-editorial__filters">
            <span className="ops-ml-field__label">Review filters</span>
            {(
              [
                ["all", "All clips"],
                ["exportable", "Keep"],
                ["keep", "Keep"],
                ["reject", "Reject"],
                ["unreviewed", "Unreviewed"],
                ["under15", "Under 15s"],
                ["mergeEligible", "Merge eligible"],
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
            <span className="ops-dim">
              Showing {visibleChapters.length} of {chapters.length}
              {dirty ? " · unsaved edits" : ""}
              {thumbsLoading ? " · generating thumbnails…" : ""}
              {ocrLoading ? " · running OCR…" : ""}
            </span>
          </div>

          {thumbsError ? (
            <p className="ops-ml-editorial__thumb-error ops-dim">{thumbsError}</p>
          ) : null}
          {ocrError ? (
            <p className="ops-ml-editorial__thumb-error ops-dim">{ocrError}</p>
          ) : null}

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
            <div className="ops-ml-suggestions">
              <h4 className="ops-ml-suggestions__title">Merge suggestions</h4>
              <ul className="ops-ml-suggestions__list">
                {suggestions.slice(0, 12).map((s) => (
                  <li
                    key={`${s.leftChapterId}-${s.rightChapterId}`}
                    className="ops-ml-suggestions__item"
                  >
                    <div className="ops-ml-suggestions__pair">
                      <span>{s.leftTitle}</span>
                      <span className="ops-dim">+</span>
                      <span>{s.rightTitle}</span>
                    </div>
                    <p className="ops-ml-suggestions__suggest">
                      → <strong>{s.suggestedTitle}</strong>
                      <span className="ops-ml-suggestions__conf">{s.confidence}%</span>
                    </p>
                    <p className="ops-dim ops-ml-suggestions__reasons">
                      {s.reasons.join(" · ")}
                    </p>
                    <button
                      type="button"
                      className="ops-btn ops-btn--sm"
                      onClick={() => applySuggestion(s)}
                    >
                      Apply merge
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {reviewMode && previewChapter && videoUrl && !mobileReview ? (
        <div className="ops-ml-review-workspace">
          <header className="ops-ml-review-workspace__head">
            <div className="ops-ml-review-workspace__meta">
              <span className="ops-ml-review-workspace__counter">
                Clip {previewIndex + 1} of {chapters.length}
              </span>
              <h4 className="ops-ml-review-workspace__title">{previewChapter.title}</h4>
              <span className="ops-dim ops-ml-review-workspace__times">
                {previewChapter.clock} · {formatDur(previewChapter.durationSec)}
                {previewChapter.tagSuggestion
                  ? ` · suggested ${previewChapter.tagSuggestion.confidence}%`
                  : ""}
              </span>
            </div>
            <div className="ops-ml-review-workspace__nav">
              <button
                type="button"
                className="ops-btn"
                disabled={previewIndex <= 0}
                onClick={() => prevClip()}
              >
                ← Previous
              </button>
              <button type="button" className="ops-btn ops-btn--info" onClick={() => togglePlayPause()}>
                Play / Pause
              </button>
              <button
                type="button"
                className="ops-btn"
                disabled={previewIndex >= chapters.length - 1}
                onClick={() => nextClip()}
              >
                Next →
              </button>
              <button type="button" className="ops-btn" onClick={() => closeReview()}>
                Close
              </button>
            </div>
          </header>
          <video
            ref={videoRef}
            className="ops-ml-preview-video ops-ml-review-workspace__video"
            src={videoUrl}
            controls
            preload="metadata"
            onTimeUpdate={handleVideoTimeUpdate}
          />
          <div className="ops-ml-review-workspace__mark">
            <span className="ops-dim ops-ml-review-workspace__mark-pos">
              Playhead {formatChapterClock(playheadSec)}
            </span>
            <button type="button" className="ops-btn ops-btn--sm" onClick={() => setStartHere()}>
              Set Start Here
            </button>
            <button type="button" className="ops-btn ops-btn--sm" onClick={() => setEndHere()}>
              Set End Here
            </button>
          </div>
          <EditorialChapterTags
            title={previewChapter.title}
            suggestion={previewChapter.tagSuggestion ?? null}
            reviewStatus={previewChapter.reviewStatus}
            onTitleChange={(title) => updateTitle(previewChapter.id, title)}
            onApplySuggestedTitle={() => applySuggestedTitle(previewChapter.id)}
            onApplyContentType={(type) => applyContentType(previewChapter.id, type)}
            onReviewStatusChange={(status) => updateReviewStatus(previewChapter.id, status)}
          />
          <ChapterFilmstrip
            year={props.year}
            jobSlug={props.jobSlug}
            chapterId={previewChapter.id}
            startSec={previewChapter.startSec}
            endSec={previewChapter.endSec}
            playheadSec={playheadSec}
            onSeek={(sec) => seekToSec(sec)}
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
          <p className="ops-dim ops-ml-review-workspace__keys">
            <kbd>J</kbd> previous · <kbd>K</kbd> play/pause · <kbd>L</kbd> next ·{" "}
            <kbd>Esc</kbd> close
          </p>
        </div>
      ) : null}

      {splitChapter && videoUrl && !mobileReview ? (
        <div className="ops-ml-preview-panel">
          <h4 className="ops-ml-preview-panel__title">Split: {splitChapter.title}</h4>
          <video
            ref={videoRef}
            className="ops-ml-preview-video"
            src={videoUrl}
            controls
            preload="metadata"
            onClick={handleVideoClick}
          />
          <div className="ops-ml-split-controls">
            <p className="ops-dim">
              Click the video to set split time, or enter seconds ({splitChapter.startSec}–
              {splitChapter.endSec}).
            </p>
            <input
              className="ops-ml-field__input"
              type="number"
              step="0.1"
              value={splitAtSec}
              onChange={(e) => setSplitAtSec(e.target.value)}
              placeholder="Split at (seconds)"
            />
            <button type="button" className="ops-btn ops-btn--ok" onClick={() => splitChapterLocal()}>
              Split chapter
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

      <div
        className={`ops-ml-editorial__table-wrap${reviewMode ? " ops-ml-editorial__table-wrap--folded" : ""}`}
      >
        {reviewMode ? (
          <h4 className="ops-ml-editorial__table-fold-label">Chapter list</h4>
        ) : null}
        <table className="ops-ml-table ops-ml-editorial-table">
          <thead>
            <tr>
              <th />
              <th>Thumbs</th>
              <th>Start</th>
              <th>End</th>
              <th>Dur</th>
              <th>Title</th>
              <th>Flags</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tableChapters.map((ch) => (
              <tr
                key={ch.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(ch.id, el);
                  else rowRefs.current.delete(ch.id);
                }}
                className={[
                  selected.has(ch.id) ? "ops-ml-editorial-table__row--on" : "",
                  previewId === ch.id ? "ops-ml-editorial-table__row--preview" : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(ch.id)}
                    onChange={() => toggleSelect(ch.id)}
                    aria-label={`Select ${ch.title}`}
                  />
                </td>
                <td className="ops-ml-editorial-table__thumbs">
                  <ChapterThumbTriplet
                    thumbs={chapterThumbs[ch.id] ?? null}
                    loading={thumbsLoading && !chapterThumbs[ch.id]}
                    onSelect={(sec) => {
                      openPreview(ch);
                      seekToSec(sec, false);
                    }}
                  />
                </td>
                <td className="ops-mono">{ch.clock}</td>
                <td className="ops-mono">{ch.end.slice(3, 11)}</td>
                <td className="ops-mono">{formatDur(ch.durationSec)}</td>
                <td>
                  <EditorialChapterTags
                    compact
                    title={ch.title}
                    suggestion={ch.tagSuggestion ?? null}
                    reviewStatus={ch.reviewStatus}
                    onTitleChange={(title) => updateTitle(ch.id, title)}
                    onApplySuggestedTitle={() => applySuggestedTitle(ch.id)}
                    onApplyContentType={(type) => applyContentType(ch.id, type)}
                    onReviewStatusChange={(status) => updateReviewStatus(ch.id, status)}
                  />
                </td>
                <td className="ops-ml-editorial-table__flags">
                  {ch.reviewStatus ? (
                    <span className="ops-ml-flag ops-ml-flag--review" title="Review status">
                      {ch.reviewStatus}
                    </span>
                  ) : null}
                  {ch.reviewFlags?.under15Sec ? (
                    <span className="ops-ml-flag ops-ml-flag--short" title="Under 15 seconds">
                      &lt;15s
                    </span>
                  ) : null}
                  {ch.reviewFlags?.sameBrandNeighbor ? (
                    <span className="ops-ml-flag ops-ml-flag--brand" title="Same brand as neighbor">
                      brand
                    </span>
                  ) : null}
                  {ch.reviewFlags?.mergeEligible ? (
                    <span className="ops-ml-flag ops-ml-flag--merge" title="Likely merge candidate">
                      merge
                    </span>
                  ) : null}
                </td>
                <td className="ops-ml-editorial-table__actions">
                  <button type="button" className="ops-btn ops-btn--sm" onClick={() => openPreview(ch)}>
                    Preview
                  </button>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
