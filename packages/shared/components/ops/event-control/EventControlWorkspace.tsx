"use client";

import { useCallback, useMemo, useState } from "react";

import { HomepageLivePreview } from "@/components/ops/event-control/HomepageLivePreview";
import {
  editorDraftFromConfig,
  savePayloadFromEditorDraft,
  type HomepageEditorDraft,
} from "@/lib/ops/event-control/editor-draft";
import { RVBR_ISSUE_COLOR_OPTIONS } from "@/lib/ops/event-control/rvbr-palette";
import type { EventControlConfig, RvbrIssueColor } from "@/lib/ops/event-control/types";

type Props = {
  initial: EventControlConfig;
};

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Never";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function EventControlWorkspace({ initial }: Props) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<HomepageEditorDraft>(() => editorDraftFromConfig(initial));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const savedDraft = useMemo(() => editorDraftFromConfig(saved), [saved]);

  const dirty = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(savedDraft);
  }, [draft, savedDraft]);

  const setYear = useCallback((index: 0 | 1 | 2, raw: string) => {
    const year = Math.round(Number(raw));
    if (!Number.isFinite(year)) return;
    setDraft((prev) => {
      const years = [...prev.years] as [number, number, number];
      years[index] = year;
      return { ...prev, years };
    });
  }, []);

  const save = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const payload = savePayloadFromEditorDraft(draft, saved);
      const res = await fetch("/api/ops/event-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { config?: EventControlConfig; error?: string };
      if (!res.ok || !data.config) {
        throw new Error(data.error ?? "Save failed");
      }
      setSaved(data.config);
      setDraft(editorDraftFromConfig(data.config));
      setMessage("Saved — live site updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }, [draft, saved]);

  return (
    <div className="event-ctrl">
      <div className="event-ctrl__toolbar">
        <p className="event-ctrl__updated">
          Last saved: <strong>{formatUpdatedAt(saved.updatedAt)}</strong>
          {dirty ? " · unsaved edits" : " · preview is live"}
        </p>
        <div className="event-ctrl__actions">
          <button
            type="button"
            className="ops-btn ops-btn--ok"
            disabled={busy || !dirty}
            onClick={() => void save()}
          >
            Save
          </button>
        </div>
      </div>

      {message ? <p className="event-ctrl__status event-ctrl__status--ok">{message}</p> : null}
      {error ? <p className="event-ctrl__status event-ctrl__status--bad">{error}</p> : null}

      <div className="event-ctrl__layout">
        <section className="event-ctrl__preview-pane" aria-label="Homepage preview">
          <p className="event-ctrl__preview-label">Live preview</p>
          <HomepageLivePreview draft={draft} preserved={saved} />
        </section>

        <div className="event-ctrl__editor-pane">
          <section className="ops-panel">
            <header className="ops-panel__header">
              <div className="ops-panel__titleblock">
                <h2 className="ops-panel__title">Cover story</h2>
                <p className="ops-panel__subtitle">
                  Magazine cover — headline, kicker, copy, and CTA.
                </p>
              </div>
            </header>
            <div className="ops-panel__body event-ctrl">
              <div className="event-ctrl__field event-ctrl__field--row">
                <div>
                  <p className="event-ctrl__label">Show cover story</p>
                  <p className="event-ctrl__hint">Magazine layout on /</p>
                </div>
                <button
                  type="button"
                  className={`event-ctrl__toggle${draft.showCover ? " event-ctrl__toggle--on" : ""}`}
                  role="switch"
                  aria-checked={draft.showCover}
                  onClick={() =>
                    setDraft((prev) => ({ ...prev, showCover: !prev.showCover }))
                  }
                >
                  <span className="event-ctrl__toggle-knob" aria-hidden />
                </button>
              </div>

              <label className="event-ctrl__field">
                <span className="event-ctrl__label">Headline</span>
                <input
                  className="event-ctrl__input"
                  value={draft.headline}
                  placeholder="e.g. Sunday Nights"
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, headline: e.target.value }))
                  }
                />
              </label>

              <label className="event-ctrl__field">
                <span className="event-ctrl__label">Eyebrow</span>
                <input
                  className="event-ctrl__input"
                  value={draft.eyebrow}
                  placeholder="e.g. SUMMER OF LOVE"
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, eyebrow: e.target.value }))
                  }
                />
              </label>

              <label className="event-ctrl__field">
                <span className="event-ctrl__label">Description</span>
                <textarea
                  className="event-ctrl__textarea"
                  rows={3}
                  value={draft.description}
                  placeholder="Cover-story copy for this issue"
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </label>

              <label className="event-ctrl__field">
                <span className="event-ctrl__label">Cover image URL (optional)</span>
                <input
                  className="event-ctrl__input"
                  value={draft.coverImageUrl}
                  placeholder="https://…"
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, coverImageUrl: e.target.value }))
                  }
                />
                <p className="event-ctrl__hint">Displays above the headline when set.</p>
              </label>

              <div className="event-ctrl__field-row">
                <label className="event-ctrl__field">
                  <span className="event-ctrl__label">CTA label</span>
                  <input
                    className="event-ctrl__input"
                    value={draft.ctaLabel}
                    placeholder="Explore the night"
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, ctaLabel: e.target.value }))
                    }
                  />
                </label>
                <label className="event-ctrl__field">
                  <span className="event-ctrl__label">CTA link</span>
                  <input
                    className="event-ctrl__input"
                    value={draft.ctaLink}
                    placeholder="/sunday-nights"
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, ctaLink: e.target.value }))
                    }
                  />
                </label>
              </div>

              <label className="event-ctrl__field">
                <span className="event-ctrl__label">Tagline</span>
                <input
                  className="event-ctrl__input"
                  value={draft.tagline}
                  placeholder="Three eras. One night. All on the dial."
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, tagline: e.target.value }))
                  }
                />
              </label>

              <div className="event-ctrl__field">
                <span className="event-ctrl__label">Issue color</span>
                <div className="event-ctrl__mode-group" role="group" aria-label="Issue color">
                  {RVBR_ISSUE_COLOR_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`event-ctrl__mode-btn${
                        draft.issueColor === option.id ? " event-ctrl__mode-btn--on" : ""
                      }`}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          issueColor: option.id as RvbrIssueColor,
                        }))
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="ops-panel">
            <header className="ops-panel__header">
              <div className="ops-panel__titleblock">
                <h2 className="ops-panel__title">Featured years</h2>
                <p className="ops-panel__subtitle">
                  Secondary section below the cover — three year cards.
                </p>
              </div>
            </header>
            <div className="ops-panel__body">
              <div className="event-ctrl__year-row">
                {([0, 1, 2] as const).map((index) => (
                  <label key={index} className="event-ctrl__field">
                    <span className="event-ctrl__label">Year {index + 1}</span>
                    <input
                      className="event-ctrl__input"
                      type="number"
                      min={1950}
                      max={2100}
                      value={draft.years[index]}
                      onChange={(e) => setYear(index, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
