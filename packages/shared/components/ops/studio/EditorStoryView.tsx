"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { SongWorkspaceTabs } from "@/components/ops/studio/SongWorkspaceTabs";
import type { EditorPackagePageContext } from "@/lib/ops/studio/editor/page-context";
import {
  applyStoryFieldUpdate,
  buildEditorStoryView,
  type EditorDocumentField,
  type EditorStoryView,
} from "@/lib/ops/studio/editor/presentation";
import type { EditorConfidenceLevel, EditorStoryPackage } from "@/lib/ops/studio/editor/types";
import type { EditorHandoffStatus } from "@/lib/ops/studio/collector/package-contract";

type Props = {
  initialContext: EditorPackagePageContext;
};

function handoffStatusClass(status: EditorHandoffStatus): string {
  if (status === "Ready") return "ops-collector__handoff-status--ready";
  if (status === "Partial") return "ops-collector__handoff-status--partial";
  return "ops-collector__handoff-status--missing";
}

function handoffSymbol(status: EditorHandoffStatus): string {
  if (status === "Ready") return "✓";
  if (status === "Partial") return "◐";
  return "○";
}

function directorStatusLabel(view: EditorStoryView): string {
  if (view.directorHandoff.status === "submitted") return "Submitted to Director";
  if (view.directorHandoff.status === "ready") return "Ready for Director Review";
  return "Still in Editorial";
}

function DocumentField({
  field,
  onChange,
  onSave,
  saving,
}: {
  field: EditorDocumentField;
  onChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const rows = field.kind === "text" ? 1 : field.kind === "list" ? 6 : 8;

  return (
    <article className="ops-editor__document">
      <header className="ops-editor__document-header">
        <h3 className="ops-editor__document-title">{field.label}</h3>
        {field.hint ? <p className="ops-editor__document-hint">{field.hint}</p> : null}
      </header>
      {field.kind === "text" ? (
        <input
          className="ops-editor__input"
          type="text"
          value={field.value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onSave}
        />
      ) : (
        <textarea
          className="ops-editor__textarea"
          rows={rows}
          value={field.value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onSave}
        />
      )}
      {saving ? <p className="ops-editor__save-hint">Saving…</p> : null}
    </article>
  );
}

export function EditorStoryView({ initialContext }: Props) {
  const [story, setStory] = useState<EditorStoryPackage | null>(initialContext.story);
  const [view, setView] = useState<EditorStoryView | null>(initialContext.view);
  const [selectedPerformanceId, setSelectedPerformanceId] = useState<string | null>(
    initialContext.view?.selectedPerformanceId ?? null,
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pendingField, setPendingField] = useState<string | null>(null);
  const rvtr = initialContext.rvtr;

  const refreshView = useCallback(
    (nextStory: EditorStoryPackage, perfId: string | null) => {
      if (!initialContext.collector) return;
      setView(buildEditorStoryView(initialContext.collector, nextStory, perfId));
    },
    [initialContext.collector],
  );

  useEffect(() => {
    if (!story || !initialContext.collector) return;
    refreshView(story, selectedPerformanceId);
  }, [story, selectedPerformanceId, initialContext.collector, refreshView]);

  async function persistField(fieldId: string, value: string, performanceId?: string | null) {
    if (!story) return;
    setSaveState("saving");
    setPendingField(fieldId);
    try {
      const res = await fetch("/api/ops/studio/editor/save", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rvtr, fieldId, value, performanceId }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        story?: EditorStoryPackage;
        view?: EditorStoryView;
      };
      if (data.ok && data.story) {
        setStory(data.story);
        if (data.view) setView(data.view);
        setSaveState("saved");
      } else {
        setSaveState("error");
      }
    } catch {
      setSaveState("error");
    } finally {
      setPendingField(null);
      setTimeout(() => setSaveState("idle"), 1500);
    }
  }

  function handleFieldChange(fieldId: string, value: string, isPerformance: boolean) {
    if (!story) return;
    const next = applyStoryFieldUpdate(
      story,
      fieldId,
      value,
      isPerformance ? selectedPerformanceId : null,
    );
    setStory(next);
    refreshView(next, selectedPerformanceId);
  }

  function selectPerformance(performanceId: string) {
    setSelectedPerformanceId(performanceId);
    if (!story || !initialContext.collector) return;
    const next: EditorStoryPackage = {
      ...story,
      approved: { ...story.approved, performanceId },
    };
    setStory(next);
    setView(buildEditorStoryView(initialContext.collector, next, performanceId));
    saveEditorSelection(performanceId, next);
  }

  async function saveEditorSelection(performanceId: string, pkg: EditorStoryPackage) {
    try {
      await fetch("/api/ops/studio/editor/save", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rvtr,
          story: { ...pkg, approved: { ...pkg.approved, performanceId } },
        }),
      });
    } catch {
      /* ignore */
    }
  }

  async function setConfidence(level: EditorConfidenceLevel) {
    if (!story) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/ops/studio/editor/save", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rvtr, action: "mark_ready", confidence: level }),
      });
      const data = (await res.json()) as { ok: boolean; story?: EditorStoryPackage; view?: EditorStoryView };
      if (data.ok && data.story) {
        setStory(data.story);
        if (data.view) setView(data.view);
      }
    } finally {
      setSaveState("idle");
    }
  }

  async function submitToDirector() {
    if (!story || !view?.directorHandoff.canSubmit) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/ops/studio/editor/save", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rvtr,
          action: "submit_to_director",
          notes: story.meta.directorHandoff.notes,
        }),
      });
      const data = (await res.json()) as { ok: boolean; story?: EditorStoryPackage; view?: EditorStoryView };
      if (data.ok && data.story) {
        setStory(data.story);
        if (data.view) setView(data.view);
      }
    } finally {
      setSaveState("idle");
    }
  }

  if (!view || !story) {
    return (
      <div className="ops-editor">
        <p className="ops-editor__empty">No story package available for {rvtr}.</p>
        <Link className="ops-studio__back" href="/ops/studio/collector">
          ← Research Library
        </Link>
      </div>
    );
  }

  return (
    <div className="ops-editor">
      <SongWorkspaceTabs active="story" rvtr={rvtr} />

      <p className="ops-editor__library-back">
        <Link className="ops-studio__back" href="/ops/studio/editor">
          ← Story Desk
        </Link>
      </p>

      {view.researchUpdated ? (
        <p className="ops-editor__research-banner" role="status">
          Collector research has been updated since this draft was started. Song-level edits are
          preserved — review performance sections if needed.
        </p>
      ) : null}

      {initialContext.seeded ? (
        <p className="ops-editor__seed-banner" role="status">
          First draft generated from Collector research. Everything below is editable.
        </p>
      ) : null}

      <header className="ops-editor__hero">
        <div className="ops-editor__hero-art" aria-hidden>
          {view.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={view.coverUrl} alt="" className="ops-editor__cover" />
          ) : (
            <div className="ops-editor__cover ops-editor__cover--placeholder">✎</div>
          )}
        </div>
        <div className="ops-editor__hero-body">
          <p className="ops-editor__eyebrow">Editorial Office</p>
          <h1 className="ops-editor__artist">{view.artist}</h1>
          <p className="ops-editor__title">{view.title}</p>
          <p className="ops-editor__headline">{view.headline}</p>
          <p className="ops-editor__meta">
            {directorStatusLabel(view)} · Confidence: {view.confidence} · Last saved{" "}
            {new Date(view.lastSaved).toLocaleString()}
            {saveState === "saving" ? " · Saving…" : null}
            {saveState === "saved" ? " · Saved" : null}
          </p>
        </div>
      </header>

      {view.performances.length > 0 ? (
        <section className="ops-editor__panel ops-editor__panel--performance" aria-labelledby="editor-performance">
          <h2 id="editor-performance" className="ops-editor__panel-title">
            Performance Cut
          </h2>
          <p className="ops-editor__panel-lead">
            Song-level story stays fixed. Switch performances to edit venue, year, notes, and
            screenshots.
          </p>
          <fieldset className="ops-collector__performance-selector">
            <legend className="ops-collector__performance-legend">Select performance</legend>
            {view.performances.map((perf) => (
              <label key={perf.id} className="ops-collector__performance-option">
                <input
                  type="radio"
                  name="editor-performance"
                  value={perf.id}
                  checked={selectedPerformanceId === perf.id}
                  onChange={() => selectPerformance(perf.id)}
                />
                <span>
                  {perf.title}
                  {perf.venue ? ` · ${perf.venue}` : ""}
                  {perf.year != null ? ` · ${perf.year}` : ""}
                </span>
              </label>
            ))}
          </fieldset>
        </section>
      ) : null}

      <section className="ops-editor__desk" aria-labelledby="editor-song-docs">
        <h2 id="editor-song-docs" className="ops-editor__desk-title">
          Song Story — Working Documents
        </h2>
        <div className="ops-editor__documents">
          {view.songDocuments.map((field) => (
            <DocumentField
              key={field.id}
              field={field}
              onChange={(value) => handleFieldChange(field.id, value, false)}
              onSave={() => persistField(field.id, field.value)}
              saving={pendingField === field.id && saveState === "saving"}
            />
          ))}
        </div>
      </section>

      {view.performanceDocuments.length > 0 ? (
        <section className="ops-editor__desk ops-editor__desk--performance" aria-labelledby="editor-perf-docs">
          <h2 id="editor-perf-docs" className="ops-editor__desk-title">
            Performance Story —{" "}
            {view.performances.find((p) => p.id === selectedPerformanceId)?.title ?? "Selected Cut"}
          </h2>
          <div className="ops-editor__documents">
            {view.performanceDocuments.map((field) => (
              <DocumentField
                key={`${selectedPerformanceId}-${field.id}`}
                field={field}
                onChange={(value) => handleFieldChange(field.id, value, true)}
                onSave={() => persistField(field.id, field.value, selectedPerformanceId)}
                saving={pendingField === field.id && saveState === "saving"}
              />
            ))}
          </div>

          {view.screenshots.length > 0 ? (
            <div className="ops-editor__screenshots">
              <h3 className="ops-editor__screenshots-title">Performance Screenshots</h3>
              <div className="ops-collector__visual-grid">
                {view.screenshots.map((shot) => (
                  <article
                    key={shot.assetId}
                    className="ops-collector__visual-slot ops-collector__visual-slot--ready"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shot.imageUrl} alt="" className="ops-collector__visual-image" />
                    <h3>{shot.label}</h3>
                    <p>{shot.caption || "Curated frame"}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="ops-editor__panel" aria-labelledby="editor-confidence">
        <h2 id="editor-confidence" className="ops-editor__panel-title">
          Confidence
        </h2>
        <div className="ops-editor__confidence-row">
          {(["draft", "review", "ready"] as const).map((level) => (
            <button
              key={level}
              type="button"
              className={
                view.confidence === level
                  ? "ops-editor__confidence-btn ops-editor__confidence-btn--active"
                  : "ops-editor__confidence-btn"
              }
              onClick={() => setConfidence(level)}
            >
              {level === "draft" ? "Draft" : level === "review" ? "In Review" : "Ready"}
            </button>
          ))}
        </div>
      </section>

      <section className="ops-editor__panel ops-editor__panel--handoff" aria-labelledby="editor-handoff">
        <h2 id="editor-handoff" className="ops-editor__panel-title">
          Director Handoff
        </h2>
        <p className="ops-editor__panel-lead">
          When the story reads clean and performance cuts are chosen, hand off to Director for
          experience design.
        </p>

        <div className="ops-editor__handoff-grid">
          <div>
            <h3 className="ops-editor__handoff-subtitle">Collector Readiness</h3>
            <ul className="ops-collector__handoff-list">
              {view.collectorHandoff.items.map((item) => (
                <li key={item.id} className="ops-collector__handoff-item">
                  <span
                    className={`ops-collector__handoff-status ${handoffStatusClass(item.status)}`}
                  >
                    {handoffSymbol(item.status)} {item.label}
                  </span>
                  <span className="ops-collector__handoff-label">{item.status}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="ops-editor__handoff-action">
            <p className="ops-editor__handoff-status">{directorStatusLabel(view)}</p>
            {view.directorHandoff.status === "submitted" ? (
              <p className="ops-editor__handoff-note">
                Submitted {view.directorHandoff.submittedAt
                  ? new Date(view.directorHandoff.submittedAt).toLocaleString()
                  : ""}
                . Director department will pick this up next.
              </p>
            ) : (
              <button
                type="button"
                className="ops-editor__submit-btn"
                disabled={!view.directorHandoff.canSubmit || saveState === "saving"}
                onClick={submitToDirector}
              >
                Hand to Director →
              </button>
            )}
          </div>
        </div>
      </section>

      <nav className="ops-collector__song-nav" aria-label="Song navigation">
        {initialContext.prev ? (
          <Link className="ops-collector__song-nav-link" href={initialContext.prev.href}>
            <span className="ops-collector__song-nav-label">Previous Story</span>
            <span className="ops-collector__song-nav-name">
              {initialContext.prev.artist} — {initialContext.prev.title}
            </span>
          </Link>
        ) : (
          <span className="ops-collector__song-nav-link ops-collector__song-nav-link--empty" />
        )}
        {initialContext.next ? (
          <Link
            className="ops-collector__song-nav-link ops-collector__song-nav-link--next"
            href={initialContext.next.href}
          >
            <span className="ops-collector__song-nav-label">Next Story</span>
            <span className="ops-collector__song-nav-name">
              {initialContext.next.artist} — {initialContext.next.title}
            </span>
          </Link>
        ) : (
          <span className="ops-collector__song-nav-link ops-collector__song-nav-link--empty" />
        )}
      </nav>
    </div>
  );
}
