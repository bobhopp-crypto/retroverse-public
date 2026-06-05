"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MediaLabChapterMode } from "@/lib/ops/media-lab/chapter-mode";
import type { EditorialChapterRow } from "@/lib/ops/media-lab/editorial/load-editorial";
import type { MergeSuggestion } from "@/lib/ops/media-lab/editorial/merge-suggestions";
import {
  filterChapterIds,
  type EditorialReviewFilter,
} from "@/lib/ops/media-lab/editorial/filters";

type EditorialBundleResponse = {
  ok?: boolean;
  error?: string;
  chapters?: EditorialChapterRow[];
  suggestions?: MergeSuggestion[];
  videoUrl?: string | null;
  chapterMode?: MediaLabChapterMode;
  job?: { durationSeconds: number | null; chapterCount: number };
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

export function MediaLabEditorialReview(props: MediaLabEditorialReviewProps) {
  const [chapters, setChapters] = useState<EditorialChapterRow[]>([]);
  const [suggestions, setSuggestions] = useState<MergeSuggestion[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<EditorialReviewFilter>("all");
  const [mergeTitle, setMergeTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [splitId, setSplitId] = useState<string | null>(null);
  const [splitAtSec, setSplitAtSec] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const visibleIds = useMemo(
    () => filterChapterIds(chapters, suggestions, filter),
    [chapters, filter, suggestions],
  );

  const visibleChapters = chapters.filter((c) => visibleIds.has(c.id));

  const previewChapter = chapters.find((c) => c.id === previewId) ?? null;
  const splitChapter = chapters.find((c) => c.id === splitId) ?? null;

  async function persist(exportFiles: boolean) {
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
          }),
        },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        chaptersPreview?: { start: string; end: string; title: string }[];
        job?: { chapterCount: number; segmentLabelCount?: number };
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Save failed");
      }
      setDirty(false);
      props.onNotice?.(
        exportFiles
          ? "Exported chapters.csv and segment-labels.txt."
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

  function openPreview(ch: EditorialChapterRow) {
    setPreviewId(ch.id);
    setSplitId(null);
    requestAnimationFrame(() => {
      const v = videoRef.current;
      if (v) {
        v.currentTime = ch.startSec;
        void v.play().catch(() => undefined);
      }
    });
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
    <section className="ops-ml-editorial">
      <header className="ops-ml-editorial__head">
        <div>
          <h3 className="ops-ml-panel__title">Editorial review — {modeLabel}</h3>
          <p className="ops-dim ops-ml-editorial__hint">
            Clean up chapters before LosslessCut. Works with any chapter mode (TV / commercial /
            music later).
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
            disabled={busy != null}
            onClick={() => void persist(true)}
          >
            {busy === "export" ? "Exporting…" : "Export for LosslessCut"}
          </button>
        </div>
      </header>

      <div className="ops-ml-editorial__filters">
        <span className="ops-ml-field__label">Review filters</span>
        {(
          [
            ["all", "All clips"],
            ["under20", "Under 20s"],
            ["sameBrand", "Same-brand neighbors"],
            ["lowConfidence", "Needs review"],
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
        </span>
      </div>

      <div className="ops-ml-editorial__toolbar">
        <button
          type="button"
          className="ops-btn"
          disabled={busy != null}
          onClick={() => void refreshSuggestions()}
        >
          {busy === "suggest" ? "Analyzing…" : "Suggest merges"}
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
              <li key={`${s.leftChapterId}-${s.rightChapterId}`} className="ops-ml-suggestions__item">
                <div className="ops-ml-suggestions__pair">
                  <span>{s.leftTitle}</span>
                  <span className="ops-dim">+</span>
                  <span>{s.rightTitle}</span>
                </div>
                <p className="ops-ml-suggestions__suggest">
                  → <strong>{s.suggestedTitle}</strong>
                  <span className="ops-ml-suggestions__conf">{s.confidence}%</span>
                </p>
                <p className="ops-dim ops-ml-suggestions__reasons">{s.reasons.join(" · ")}</p>
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

      {(previewChapter || splitChapter) && videoUrl ? (
        <div className="ops-ml-preview-panel">
          <h4 className="ops-ml-preview-panel__title">
            {splitChapter ? `Split: ${splitChapter.title}` : `Preview: ${previewChapter?.title}`}
          </h4>
          <video
            ref={videoRef}
            className="ops-ml-preview-video"
            src={videoUrl}
            controls
            preload="metadata"
            onClick={splitChapter ? handleVideoClick : undefined}
          />
          {splitChapter ? (
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
          ) : null}
        </div>
      ) : null}

      <div className="ops-ml-editorial__table-wrap">
        <table className="ops-ml-table ops-ml-editorial-table">
          <thead>
            <tr>
              <th />
              <th>Start</th>
              <th>End</th>
              <th>Dur</th>
              <th>Title</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibleChapters.map((ch) => (
              <tr
                key={ch.id}
                className={selected.has(ch.id) ? "ops-ml-editorial-table__row--on" : undefined}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(ch.id)}
                    onChange={() => toggleSelect(ch.id)}
                    aria-label={`Select ${ch.title}`}
                  />
                </td>
                <td className="ops-mono">{ch.clock}</td>
                <td className="ops-mono">{ch.end.slice(3, 11)}</td>
                <td className="ops-mono">{formatDur(ch.durationSec)}</td>
                <td>
                  <input
                    className="ops-ml-editorial-table__title"
                    value={ch.title}
                    onChange={(e) => updateTitle(ch.id, e.target.value)}
                  />
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
                        if (v) v.currentTime = ch.startSec;
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
