"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { MediaLabEditorialReview } from "@/components/ops/media-lab/MediaLabEditorialReview";
import type { MediaLabChapterMode } from "@/lib/ops/media-lab/chapter-mode";
import type { MediaLabJobSummary } from "@/lib/ops/media-lab/job-summary";
import {
  MEDIA_LAB_YEAR_OPTIONS,
  OPS_FOCUS_YEAR,
} from "@/lib/ops/ops-focus-year";

type Preview = {
  jobSlug: string;
  outputDir: string;
  transcriptPreview: string;
  chaptersPreview: { start: string; end: string; title: string; clock?: string }[];
  chapterTitlesPreview?: { clock: string; title: string }[];
  segmentLabelsPreview?: { start: string; end: string; label: string; clock: string }[];
  segmentLabelLinesPreview?: string;
  job: {
    durationSeconds: number | null;
    segmentCount: number;
    chapterCount: number;
    segmentLabelCount?: number;
    sourceFilename: string;
    chapterMode?: MediaLabChapterMode;
    files?: string[];
  };
};

function jobHasArtifact(
  job: Preview["job"],
  name: string,
  preview: Preview,
): boolean {
  if (job.files?.includes(name)) return true;
  if (name === "chapters.csv") {
    return job.chapterCount > 0 || preview.chaptersPreview.length > 0;
  }
  if (name === "segment-labels.txt") {
    return (
      (job.segmentLabelCount ?? 0) > 0 ||
      (preview.segmentLabelsPreview?.length ?? 0) > 0
    );
  }
  if (name === "chapters-export.csv") {
    return job.files?.includes("chapters-export.csv") ?? false;
  }
  return false;
}

type OpsMediaLabProps = {
  defaultYear?: number;
};

export function OpsMediaLab({ defaultYear = OPS_FOCUS_YEAR }: OpsMediaLabProps) {
  const [year, setYear] = useState(defaultYear);
  const [chapterMode, setChapterMode] = useState<MediaLabChapterMode>("content");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"transcript" | "chapters" | "labels" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pathCopied, setPathCopied] = useState(false);
  const [opening, setOpening] = useState<"folder" | "chapters" | "chaptersExport" | "labels" | null>(null);
  const [savedJobs, setSavedJobs] = useState<MediaLabJobSummary[]>([]);
  const [selectedJobSlug, setSelectedJobSlug] = useState("");
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const workstationMode = preview != null && !showSetup;

  const fetchSavedJobs = useCallback(async (y: number) => {
    setLoadingJobs(true);
    try {
      const res = await fetch(`/api/ops/media-lab/jobs?year=${y}`);
      const data = (await res.json()) as { ok?: boolean; jobs?: MediaLabJobSummary[] };
      if (res.ok && data.ok) {
        setSavedJobs(data.jobs ?? []);
      }
    } catch {
      setSavedJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    void fetchSavedJobs(year);
  }, [year, fetchSavedJobs]);

  async function copyOutputDir() {
    if (!preview?.outputDir) return;
    try {
      await navigator.clipboard.writeText(preview.outputDir);
      setPathCopied(true);
      window.setTimeout(() => setPathCopied(false), 2000);
    } catch {
      setError("Could not copy path to clipboard.");
    }
  }

  async function openLocal(target: "folder" | "chapters" | "chaptersExport" | "labels") {
    if (!preview?.outputDir) return;
    setOpening(target);
    setError(null);
    try {
      const res = await fetch("/api/ops/media-lab/open-local", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outputDir: preview.outputDir, target }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not open in Finder");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open in Finder");
    } finally {
      setOpening(null);
    }
  }

  async function loadSavedJob(jobSlug?: string) {
    const slug = (jobSlug ?? selectedJobSlug).trim();
    if (!slug) {
      setError("Choose a saved job to load.");
      return;
    }
    setBusy("transcript");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/ops/media-lab/jobs/load", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ year, jobSlug: slug }),
      });
      const data = (await res.json()) as Preview & { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not load job");
      }
      if (data.job.chapterMode) setChapterMode(data.job.chapterMode);
      setShowSetup(false);
      setPreview({
        jobSlug: data.jobSlug,
        outputDir: data.outputDir,
        transcriptPreview: data.transcriptPreview,
        chaptersPreview: data.chaptersPreview,
        chapterTitlesPreview: data.chapterTitlesPreview,
        segmentLabelsPreview: data.segmentLabelsPreview ?? [],
        segmentLabelLinesPreview: data.segmentLabelLinesPreview ?? "",
        job: data.job,
      });
      setSelectedJobSlug(slug);
      setNotice("Loaded saved job from disk — no retranscribe.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setBusy(null);
    }
  }

  async function generateTranscript() {
    if (!file) {
      setError("Choose a video file first.");
      return;
    }
    setBusy("transcript");
    setError(null);
    setNotice(null);
    try {
      const form = new FormData();
      form.set("year", String(year));
      form.append("video", file);
      const res = await fetch("/api/ops/media-lab/transcribe", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as Preview & {
        ok?: boolean;
        error?: string;
        detail?: string;
        hint?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(
          [data.error, data.detail, data.hint].filter(Boolean).join(" — ") ||
            "Transcription failed",
        );
      }
      setShowSetup(false);
      setPreview({
        jobSlug: data.jobSlug,
        outputDir: data.outputDir,
        transcriptPreview: data.transcriptPreview,
        chaptersPreview: data.chaptersPreview,
        chapterTitlesPreview: data.chapterTitlesPreview,
        segmentLabelsPreview: data.segmentLabelsPreview ?? [],
        segmentLabelLinesPreview: data.segmentLabelLinesPreview ?? "",
        job: data.job,
      });
      setSelectedJobSlug(data.jobSlug);
      void fetchSavedJobs(year);
      setNotice("Transcript saved once. Regenerate chapters, labels, and review heuristics anytime.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function generateSegmentLabels() {
    if (!preview?.jobSlug) {
      setError("Run Generate Transcript first.");
      return;
    }
    setBusy("labels");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/ops/media-lab/segment-labels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ year, jobSlug: preview.jobSlug }),
      });
      const data = (await res.json()) as Preview & { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Segment label generation failed");
      }
      setShowSetup(false);
      setPreview({
        jobSlug: data.jobSlug,
        outputDir: data.outputDir,
        transcriptPreview: data.transcriptPreview,
        chaptersPreview: data.chaptersPreview,
        chapterTitlesPreview: data.chapterTitlesPreview,
        segmentLabelsPreview: data.segmentLabelsPreview ?? [],
        segmentLabelLinesPreview: data.segmentLabelLinesPreview ?? "",
        job: data.job,
      });
      setNotice(
        "segment-labels.json, segment-labels.txt, and chapters.csv are ready for LosslessCut export.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function generateChapters() {
    if (!preview?.jobSlug) {
      setError("Run Generate Transcript first.");
      return;
    }
    setBusy("chapters");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/ops/media-lab/chapters", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ year, jobSlug: preview.jobSlug, chapterMode }),
      });
      const data = (await res.json()) as Preview & { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Chapter generation failed");
      }
      if (data.job.chapterMode) setChapterMode(data.job.chapterMode);
      setShowSetup(false);
      setPreview({
        jobSlug: data.jobSlug,
        outputDir: data.outputDir,
        transcriptPreview: data.transcriptPreview,
        chaptersPreview: data.chaptersPreview,
        chapterTitlesPreview: data.chapterTitlesPreview,
        segmentLabelsPreview: data.segmentLabelsPreview ?? preview.segmentLabelsPreview,
        segmentLabelLinesPreview:
          data.segmentLabelLinesPreview ?? preview.segmentLabelLinesPreview,
        job: data.job,
      });
      setNotice(
        chapterMode === "commercial"
          ? "Chapters regenerated from segments.json (commercial mode)."
          : "Chapters regenerated from segments.json.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`ops-ml${workstationMode ? " ops-ml--workstation" : ""}`}>
      <section className={`ops-ml-form${workstationMode ? " ops-ml-form--hidden" : ""}`}>
        <h2 className="ops-ml-form__title">Turn a video into year assets</h2>
        <p className="ops-dim ops-ml-form__hint">
          Transcribe once. Everything after that reads{" "}
          <code className="ops-mono">segments.json</code> and is nearly instant — chapters,
          labels, merge heuristics, tag suggestions, editorial review.{" "}
          <Link className="ops-link" href="/ops/media-lab/performances">
            Performance Browser →
          </Link>
        </p>

        <label className="ops-ml-field">
          <span className="ops-ml-field__label">Saved jobs ({year})</span>
          <div className="ops-ml-job-load">
            <select
              className="ops-ml-field__input"
              value={selectedJobSlug}
              onChange={(e) => setSelectedJobSlug(e.target.value)}
              disabled={loadingJobs || savedJobs.length === 0}
            >
              <option value="">
                {loadingJobs
                  ? "Loading jobs…"
                  : savedJobs.length
                    ? "Select a previous job…"
                    : "No saved jobs for this year"}
              </option>
              {savedJobs.map((j) => (
                <option key={j.jobSlug} value={j.jobSlug}>
                  {j.sourceFilename} · {j.segmentCount} seg · {j.chapterCount} ch
                </option>
              ))}
            </select>
            <button
              type="button"
              className="ops-btn"
              disabled={busy != null || !selectedJobSlug}
              onClick={() => void loadSavedJob()}
            >
              Load Job
            </button>
          </div>
        </label>

        <label className="ops-ml-field">
          <span className="ops-ml-field__label">Year</span>
          <select
            className="ops-ml-field__input"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {MEDIA_LAB_YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className="ops-ml-field">
          <span className="ops-ml-field__label">Chapter mode (regenerate)</span>
          <select
            className="ops-ml-field__input"
            value={chapterMode}
            onChange={(e) => setChapterMode(e.target.value as MediaLabChapterMode)}
          >
            <option value="content">Content (TV / topics)</option>
            <option value="commercial">Commercial compilation</option>
          </select>
          <span className="ops-dim ops-ml-field__file">
            Commercial mode: 30–90s spots, same-brand merge, fewer LosslessCut segments.
          </span>
        </label>

        <label className="ops-ml-field">
          <span className="ops-ml-field__label">Video file (transcribe once)</span>
          <input
            className="ops-ml-field__input"
            type="file"
            accept="video/*,.mp4,.mov,.mkv,.webm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <span className="ops-dim ops-ml-field__file">{file.name}</span>
          ) : null}
        </label>

        <div className="ops-ml-actions">
          <button
            type="button"
            className="ops-btn ops-btn--ok"
            disabled={busy != null || !file}
            onClick={() => void generateTranscript()}
          >
            {busy === "transcript" ? "Working…" : "Transcribe (once)"}
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--info"
            disabled={busy != null || !preview}
            onClick={() => void generateChapters()}
          >
            {busy === "chapters" ? "Working…" : "Regenerate Chapters"}
          </button>
          <button
            type="button"
            className="ops-btn"
            disabled={busy != null || !preview}
            onClick={() => void generateSegmentLabels()}
          >
            {busy === "labels" ? "Working…" : "Regenerate Labels"}
          </button>
        </div>

        <p className="ops-dim ops-ml-form__hint">
          Saves under{" "}
          <code className="ops-mono">RETROVERSE_DATA/YEARS/{year}/production/metadata/</code>
        </p>

        {error ? (
          <p className="ops-ml-error" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="ops-notice" role="status">
            {notice}
          </p>
        ) : null}
      </section>

      {preview ? (
        <div
          className={`ops-ml-results${workstationMode ? " ops-ml-results--workstation" : ""}`}
        >
          {workstationMode && (error || notice) ? (
            <div
              className={`ops-ml-workstation-alert${
                error ? " ops-ml-workstation-alert--error" : ""
              }`}
              role={error ? "alert" : "status"}
            >
              {error ?? notice}
            </div>
          ) : null}
          {!workstationMode ? (
          <>
          <div className="ops-ml-path-row">
            <p className="ops-ml-results__path ops-mono">{preview.outputDir}</p>
            <button
              type="button"
              className="ops-btn"
              title="Copy path"
              onClick={() => void copyOutputDir()}
            >
              {pathCopied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="ops-ml-open-actions">
            <button
              type="button"
              className="ops-btn"
              disabled={opening != null || !preview.outputDir}
              onClick={() => void openLocal("folder")}
            >
              {opening === "folder" ? "Opening…" : "Open Job Folder"}
            </button>
            <button
              type="button"
              className="ops-btn ops-btn--info"
              disabled={
                opening != null || !jobHasArtifact(preview.job, "chapters.csv", preview)
              }
              onClick={() => void openLocal("chapters")}
            >
              {opening === "chapters" ? "Opening…" : "Open chapters.csv"}
            </button>
            <button
              type="button"
              className="ops-btn ops-btn--ok"
              disabled={
                opening != null ||
                !jobHasArtifact(preview.job, "chapters-export.csv", preview)
              }
              onClick={() => void openLocal("chaptersExport")}
            >
              {opening === "chaptersExport" ? "Opening…" : "Open chapters-export.csv"}
            </button>
            <button
              type="button"
              className="ops-btn"
              disabled={
                opening != null ||
                !jobHasArtifact(preview.job, "segment-labels.txt", preview)
              }
              onClick={() => void openLocal("labels")}
            >
              {opening === "labels" ? "Opening…" : "Open segment-labels.txt"}
            </button>
          </div>
          <p className="ops-dim ops-ml-results__meta">
            {preview.job.sourceFilename}
            {preview.job.durationSeconds != null
              ? ` · ${Math.round(preview.job.durationSeconds)}s`
              : ""}
            {" · "}
            {preview.job.segmentCount} segments · {preview.job.chapterCount} chapters
            {preview.job.segmentLabelCount != null
              ? ` · ${preview.job.segmentLabelCount} labels`
              : ""}
          </p>

          <section className="ops-ml-panel ops-ml-panel--transcript">
            <h3 className="ops-ml-panel__title">Transcript preview</h3>
            <pre className="ops-ml-preview">{preview.transcriptPreview || "(empty)"}</pre>
          </section>
          </>
          ) : null}

          {preview.job.chapterCount > 0 || preview.chaptersPreview.length > 0 ? (
            <MediaLabEditorialReview
              year={year}
              jobSlug={preview.jobSlug}
              outputDir={preview.outputDir}
              chapterMode={preview.job.chapterMode ?? chapterMode}
              workstationMode={workstationMode}
              onOpenSetup={() => setShowSetup(true)}
              onNotice={setNotice}
              onError={setError}
              onExported={(patch) => {
                setPreview((prev) =>
                  prev
                    ? {
                        ...prev,
                        chaptersPreview: patch.chaptersPreview ?? prev.chaptersPreview,
                        job: patch.job ? { ...prev.job, ...patch.job } : prev.job,
                      }
                    : prev,
                );
              }}
            />
          ) : (
            <p className="ops-empty">
              Generate chapters to open the editorial review table.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
