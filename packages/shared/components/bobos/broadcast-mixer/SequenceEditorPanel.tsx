"use client";

import { useEffect, useState } from "react";

import {
  getBroadcastCollectionManifestAction,
  updateCollectionSequencesAction,
} from "@/app/bobos/broadcast/actions";
import type { BroadcastSequence } from "@/lib/bobos/importer";

type Props = {
  collectionId: string;
  onClose: () => void;
};

/**
 * Correct auto-detected sequence grouping for an imported collection.
 * Detection runs once at import time (filename-driven, best-effort) — this
 * is where an operator fixes boundaries/titles ("Sequence 1" -> "Queen").
 */
export function SequenceEditorPanel({ collectionId, onClose }: Props) {
  const [slideCount, setSlideCount] = useState(0);
  const [rows, setRows] = useState<BroadcastSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBroadcastCollectionManifestAction(collectionId)
      .then((manifest) => {
        if (cancelled) return;
        setSlideCount(manifest?.slides.length ?? 0);
        setRows(manifest?.sequences ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load sequences.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [collectionId]);

  function updateRow(index: number, patch: Partial<BroadcastSequence>) {
    setSaved(false);
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        next.slideCount = Math.max(0, next.endSlide - next.startSlide + 1);
        return next;
      }),
    );
  }

  function removeRow(index: number) {
    setSaved(false);
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addRow() {
    setSaved(false);
    const lastEnd = rows.length > 0 ? rows[rows.length - 1]!.endSlide : 0;
    setRows((prev) => [
      ...prev,
      {
        id: `sequence-${Date.now()}`,
        title: `Sequence ${prev.length + 1}`,
        startSlide: Math.min(lastEnd + 1, slideCount || lastEnd + 1),
        endSlide: Math.min(lastEnd + 1, slideCount || lastEnd + 1),
        slideCount: 1,
        defaultDuration: 8,
        loop: false,
        autoReturn: true,
        tags: [],
        autoDetected: false,
      },
    ]);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateCollectionSequencesAction(collectionId, rows);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save sequences.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bmx-seq-editor" role="region" aria-label="Edit sequences">
      <header className="bmx-seq-editor__head">
        <div>
          <h3 className="bmx-seq-editor__title">Sequences</h3>
          <p className="bmx-seq-editor__hint">
            Auto-detected from filenames at import — correct titles and slide ranges below.
          </p>
        </div>
        <button type="button" className="bmx-icon-btn" onClick={onClose} aria-label="Close sequence editor">
          ✕
        </button>
      </header>

      {loading ? (
        <p className="bmx-seq-editor__status">Loading…</p>
      ) : (
        <>
          <table className="bmx-seq-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Start</th>
                <th>End</th>
                <th>Duration (s)</th>
                <th>Loop</th>
                <th>Auto Return</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td>
                    <input
                      className="bmx-seq-input"
                      type="text"
                      value={row.title}
                      onChange={(e) => updateRow(index, { title: e.target.value })}
                    />
                    {row.autoDetected ? <span className="bmx-seq-badge">auto</span> : null}
                  </td>
                  <td>
                    <input
                      className="bmx-seq-input bmx-seq-input--num"
                      type="number"
                      min={1}
                      max={slideCount || undefined}
                      value={row.startSlide}
                      onChange={(e) => updateRow(index, { startSlide: Number(e.target.value) || 1 })}
                    />
                  </td>
                  <td>
                    <input
                      className="bmx-seq-input bmx-seq-input--num"
                      type="number"
                      min={row.startSlide}
                      max={slideCount || undefined}
                      value={row.endSlide}
                      onChange={(e) => updateRow(index, { endSlide: Number(e.target.value) || row.startSlide })}
                    />
                  </td>
                  <td>
                    <input
                      className="bmx-seq-input bmx-seq-input--num"
                      type="number"
                      min={1}
                      value={row.defaultDuration}
                      onChange={(e) => updateRow(index, { defaultDuration: Number(e.target.value) || 1 })}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.loop}
                      onChange={(e) => updateRow(index, { loop: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.autoReturn}
                      onChange={(e) => updateRow(index, { autoReturn: e.target.checked })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="bmx-icon-btn bmx-icon-btn--danger"
                      onClick={() => removeRow(index)}
                      aria-label={`Remove ${row.title}`}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bmx-seq-editor__footer">
            <button type="button" className="bmx-btn bmx-btn--small" onClick={addRow}>
              + Add Sequence
            </button>
            <div className="bmx-seq-editor__footer-right">
              {error ? <span className="bmx-seq-editor__error">{error}</span> : null}
              {saved ? <span className="bmx-seq-editor__saved">Saved</span> : null}
              <button
                type="button"
                className="bmx-btn bmx-btn--primary bmx-btn--small"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Sequences"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
