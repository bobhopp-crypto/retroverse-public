"use client";

import { useState } from "react";

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
  };
};

type OpsMediaLabProps = {
  defaultYear?: number;
};

export function OpsMediaLab({ defaultYear = OPS_FOCUS_YEAR }: OpsMediaLabProps) {
  const [year, setYear] = useState(defaultYear);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"transcript" | "chapters" | "labels" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

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
      setNotice("Saved transcript and captions. Generate chapters, then segment labels for LosslessCut.");
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
        body: JSON.stringify({ year, jobSlug: preview.jobSlug }),
      });
      const data = (await res.json()) as Preview & { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Chapter generation failed");
      }
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
      setNotice("Chapters updated. Click Generate Segment Labels for export filenames.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="ops-ml">
      <section className="ops-ml-form">
        <h2 className="ops-ml-form__title">Turn a video into year assets</h2>
        <p className="ops-dim ops-ml-form__hint">
          Pick a year and a video on your Mac. We write a transcript, subtitles, and a chapter
          list you can open in LosslessCut. Everything saves under{" "}
          <code className="ops-mono">RETROVERSE_DATA/YEARS/{year}/production/metadata/</code>
        </p>

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
          <span className="ops-ml-field__label">Video file</span>
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
            {busy === "transcript" ? "Working…" : "Generate Transcript"}
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--info"
            disabled={busy != null || !preview}
            onClick={() => void generateChapters()}
          >
            {busy === "chapters" ? "Working…" : "Generate Chapters"}
          </button>
          <button
            type="button"
            className="ops-btn"
            disabled={busy != null || !preview}
            onClick={() => void generateSegmentLabels()}
          >
            {busy === "labels" ? "Working…" : "Generate Segment Labels"}
          </button>
        </div>

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
        <div className="ops-ml-results">
          <p className="ops-ml-results__path ops-mono">{preview.outputDir}</p>
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

          <section className="ops-ml-panel">
            <h3 className="ops-ml-panel__title">Transcript preview</h3>
            <pre className="ops-ml-preview">{preview.transcriptPreview || "(empty)"}</pre>
          </section>

          <section className="ops-ml-panel ops-ml-panel--chapters">
            <h3 className="ops-ml-panel__title">Chapter titles — review before export</h3>
            {(preview.chapterTitlesPreview ?? preview.chaptersPreview).length === 0 ? (
              <p className="ops-empty">
                No chapters yet. Click <strong>Generate Chapters</strong> after transcript.
              </p>
            ) : (
              <ol className="ops-ml-chapter-list">
                {(preview.chapterTitlesPreview ??
                  preview.chaptersPreview.map((ch) => ({
                    clock: ch.clock ?? ch.start.slice(3, 8),
                    title: ch.title,
                  }))).map((ch, i) => (
                  <li key={`${ch.clock}-${ch.title}-${i}`} className="ops-ml-chapter-list__item">
                    <span className="ops-mono ops-ml-chapter-list__time">{ch.clock}</span>
                    <span className="ops-ml-chapter-list__title">{ch.title}</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="ops-dim ops-ml-panel__foot">
              Happy with this list? Import <strong>chapters.csv</strong> in LosslessCut.
            </p>
          </section>

          <section className="ops-ml-panel ops-ml-panel--labels">
            <h3 className="ops-ml-panel__title">Segment labels — for LosslessCut export</h3>
            {preview.segmentLabelsPreview && preview.segmentLabelsPreview.length > 0 ? (
              <>
                <ol className="ops-ml-chapter-list">
                  {preview.segmentLabelsPreview.map((row, i) => (
                    <li
                      key={`${row.start}-${row.label}-${i}`}
                      className="ops-ml-chapter-list__item"
                    >
                      <span className="ops-mono ops-ml-chapter-list__time">{row.clock}</span>
                      <span className="ops-ml-chapter-list__title">{row.label}</span>
                    </li>
                  ))}
                </ol>
                <p className="ops-dim ops-ml-panel__foot">
                  Copy labels into LosslessCut segment names, or use{" "}
                  <strong>segment-labels.txt</strong> from the job folder.
                </p>
                <label className="ops-ml-field">
                  <span className="ops-ml-field__label">Labels only (copy/paste)</span>
                  <textarea
                    className="ops-ml-field__input ops-ml-labels-copy"
                    readOnly
                    rows={6}
                    value={preview.segmentLabelLinesPreview ?? ""}
                  />
                </label>
              </>
            ) : (
              <p className="ops-empty">
                No segment labels yet. Click <strong>Generate Segment Labels</strong>.
              </p>
            )}
          </section>

          <section className="ops-ml-panel">
            <h3 className="ops-ml-panel__title">Chapter times (LosslessCut)</h3>
            {preview.chaptersPreview.length === 0 ? (
              <p className="ops-empty">No chapter times yet.</p>
            ) : (
              <table className="ops-ml-table">
                <thead>
                  <tr>
                    <th>Start</th>
                    <th>End</th>
                    <th>Title</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.chaptersPreview.map((ch, i) => (
                    <tr key={`${ch.start}-${i}`}>
                      <td className="ops-mono">{ch.start}</td>
                      <td className="ops-mono">{ch.end}</td>
                      <td>{ch.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
